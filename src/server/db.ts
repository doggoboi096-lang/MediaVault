/**
 * db.ts — The only place that writes MediaVault's state.
 *
 * SQLite (better-sqlite3, WAL) in <DATA_DIR>/data/mediavault.db replaces
 * library_index.json / trash_index.json / library_roots.json. All writes are
 * synchronous statements or transactions on one connection, so concurrent
 * requests and the AI worker can no longer overwrite each other's changes.
 *
 * Each media row keeps the fields we query on as columns and the rest of the
 * MediaItem (tags, EXIF, OCR, location…) as a JSON document in `data`.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { AiStatus, MediaItem } from '../types';

export type MediaSource = 'upload' | 'scan';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) throw new Error('database not opened');
  return db;
}

// ── Schema ──────────────────────────────────────────────────────────────────
// Each entry upgrades the schema by one version (PRAGMA user_version).
const MIGRATIONS: string[] = [
  // v1: media, jobs, settings
  `
  CREATE TABLE media (
    id            TEXT PRIMARY KEY,
    filename      TEXT NOT NULL UNIQUE,
    path          TEXT NOT NULL,
    source        TEXT NOT NULL DEFAULT 'upload',
    title         TEXT NOT NULL DEFAULT '',
    type          TEXT NOT NULL DEFAULT 'image',
    date          TEXT,
    original_size INTEGER,
    is_deleted    INTEGER NOT NULL DEFAULT 0,
    is_favorite   INTEGER NOT NULL DEFAULT 0,
    ai_status     TEXT NOT NULL DEFAULT 'pending',
    ai_error      TEXT,
    data          TEXT NOT NULL DEFAULT '{}',
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
  );
  CREATE INDEX media_date ON media(date DESC, created_at DESC);
  CREATE INDEX media_ai_status ON media(ai_status);
  CREATE INDEX media_dedupe ON media(title, original_size);
  CREATE INDEX media_path ON media(path);

  CREATE TABLE jobs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    media_id   TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    status     TEXT NOT NULL DEFAULT 'pending',
    priority   INTEGER NOT NULL DEFAULT 0,
    attempts   INTEGER NOT NULL DEFAULT 0,
    error      TEXT,
    run_after  INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  -- At most one waiting or running job per media item.
  CREATE UNIQUE INDEX jobs_one_active ON jobs(media_id) WHERE status IN ('pending', 'processing');
  CREATE INDEX jobs_pick ON jobs(status, priority DESC, id);

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

export function openDatabase(dataDir: string): Database.Database {
  const file = path.join(dataDir, 'data', 'mediavault.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  const version = db.pragma('user_version', { simple: true }) as number;
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      getDb().exec(MIGRATIONS[v]);
      getDb().pragma(`user_version = ${v + 1}`);
    })();
  }
  return db;
}

export function closeDatabase() {
  db?.close();
  db = null;
}

// ── Row ↔ MediaItem ─────────────────────────────────────────────────────────
interface MediaRow {
  id: string;
  filename: string;
  path: string;
  source: MediaSource;
  title: string;
  type: string;
  date: string | null;
  original_size: number | null;
  is_deleted: number;
  is_favorite: number;
  ai_status: AiStatus;
  ai_error: string | null;
  data: string;
  created_at: number;
  updated_at: number;
}

/** Fields stored in their own columns rather than in the JSON document. */
const COLUMN_FIELDS = ['id', 'filename', 'path', 'title', 'type', 'date', 'originalSize', 'isDeleted', 'isFavorite', 'aiStatus', 'aiError'];

function toItem(row: MediaRow): MediaItem {
  const doc = JSON.parse(row.data || '{}');
  return {
    ...doc,
    id: row.id,
    filename: row.filename,
    path: row.path,
    title: row.title,
    type: row.type,
    date: row.date ?? '',
    originalSize: row.original_size ?? undefined,
    isDeleted: !!row.is_deleted,
    isFavorite: !!row.is_favorite,
    aiStatus: row.ai_status,
    aiError: row.ai_error ?? undefined,
  };
}

function toDoc(item: Partial<MediaItem>): string {
  const doc: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (!COLUMN_FIELDS.includes(key) && value !== undefined) doc[key] = value;
  }
  return JSON.stringify(doc);
}

// ── Media ───────────────────────────────────────────────────────────────────
export function listMedia(): MediaItem[] {
  return (getDb().prepare('SELECT * FROM media ORDER BY date DESC, created_at DESC').all() as MediaRow[]).map(toItem);
}

export function getMedia(id: string): MediaItem | null {
  const row = getDb().prepare('SELECT * FROM media WHERE id = ?').get(id) as MediaRow | undefined;
  return row ? toItem(row) : null;
}

export function getMediaByFilename(filename: string): MediaItem | null {
  const row = getDb().prepare('SELECT * FROM media WHERE filename = ?').get(filename) as MediaRow | undefined;
  return row ? toItem(row) : null;
}

export function getMediaByPath(filePath: string): MediaItem | null {
  const row = getDb().prepare('SELECT * FROM media WHERE path = ?').get(filePath) as MediaRow | undefined;
  return row ? toItem(row) : null;
}

/** An earlier upload of the same file (same original name and size). */
export function findDuplicate(title: string, size: number): MediaItem | null {
  const row = getDb().prepare('SELECT * FROM media WHERE title = ? AND original_size = ? LIMIT 1').get(title, size) as MediaRow | undefined;
  return row ? toItem(row) : null;
}

export function insertMedia(item: MediaItem, opts: { source: MediaSource; aiStatus: AiStatus }): MediaItem {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO media (id, filename, path, source, title, type, date, original_size, is_deleted, is_favorite, ai_status, ai_error, data, created_at, updated_at)
       VALUES (@id, @filename, @path, @source, @title, @type, @date, @original_size, @is_deleted, @is_favorite, @ai_status, NULL, @data, @now, @now)`
    )
    .run({
      id: item.id,
      filename: item.filename,
      path: item.path,
      source: opts.source,
      title: item.title || item.filename,
      type: item.type || 'image',
      date: item.date || null,
      original_size: item.originalSize ?? item.exif?.sizeBytes ?? null,
      is_deleted: item.isDeleted ? 1 : 0,
      is_favorite: item.isFavorite ? 1 : 0,
      ai_status: opts.aiStatus,
      data: toDoc(item),
      now,
    });
  onMediaChanged(item.id);
  return getMedia(item.id)!;
}

/** Merges `patch` into a stored item. Column fields in the patch update their columns. */
export function updateMedia(id: string, patch: Partial<MediaItem>): MediaItem | null {
  const current = getMedia(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  getDb()
    .prepare(
      `UPDATE media SET title = @title, type = @type, date = @date, is_favorite = @is_favorite,
         ai_status = @ai_status, ai_error = @ai_error, data = @data, updated_at = @now WHERE id = @id`
    )
    .run({
      id,
      title: next.title || next.filename,
      type: next.type || 'image',
      date: next.date || null,
      is_favorite: next.isFavorite ? 1 : 0,
      ai_status: next.aiStatus || 'pending',
      ai_error: next.aiError ?? null,
      data: toDoc(next),
      now: Date.now(),
    });
  onMediaChanged(id);
  return getMedia(id);
}

export function setDeleted(filenames: string[], deleted: boolean) {
  const stmt = getDb().prepare('UPDATE media SET is_deleted = ?, updated_at = ? WHERE filename = ?');
  getDb().transaction(() => {
    for (const f of filenames) stmt.run(deleted ? 1 : 0, Date.now(), f);
  })();
}

export function trashedFilenames(): string[] {
  return (getDb().prepare('SELECT filename FROM media WHERE is_deleted = 1').all() as { filename: string }[]).map(r => r.filename);
}

/** Removes rows (jobs cascade). Returns the removed items so callers can clean up files. */
export function removeMedia(filenames: string[]): MediaItem[] {
  const removed: MediaItem[] = [];
  const del = getDb().prepare('DELETE FROM media WHERE filename = ?');
  getDb().transaction(() => {
    for (const f of filenames) {
      const item = getMediaByFilename(f);
      if (!item) continue;
      del.run(f);
      onMediaRemoved(item.id);
      removed.push(item);
    }
  })();
  return removed;
}

export function countMedia(): number {
  return (getDb().prepare('SELECT COUNT(*) AS n FROM media').get() as { n: number }).n;
}

// Hooks for derived indexes (full-text search) kept in sync with media rows.
let onMediaChanged: (id: string) => void = () => {};
let onMediaRemoved: (id: string) => void = () => {};
export function setMediaHooks(hooks: { changed: (id: string) => void; removed: (id: string) => void }) {
  onMediaChanged = hooks.changed;
  onMediaRemoved = hooks.removed;
}

// ── Settings ────────────────────────────────────────────────────────────────
export function getSetting<T>(key: string, fallback: T): T {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setSetting(key: string, value: unknown) {
  getDb()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value));
}

export function getLibraryRoots(): string[] {
  const roots = getSetting<unknown>('library_roots', []);
  return Array.isArray(roots) ? roots.filter((r): r is string => typeof r === 'string') : [];
}

export function addLibraryRoot(root: string) {
  const roots = getLibraryRoots();
  if (!roots.some(r => path.resolve(r).toLowerCase() === path.resolve(root).toLowerCase())) {
    setSetting('library_roots', [...roots, root]);
  }
}
