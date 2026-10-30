/**
 * migrate.ts — One-time import of the JSON stores into SQLite.
 *
 * Copies library_index.json (items, tags, OCR), trash_index.json (trash state)
 * and library_roots.json (scanned folders) into the database inside one
 * transaction, then renames the files to *.bak so there is a way back.
 * Runs automatically at startup and via `npm run db:migrate`; it is a no-op
 * once the JSON files are gone.
 */

import fs from 'fs';
import path from 'path';
import type { AiStatus, MediaItem } from '../types';
import { addLibraryRoot, getDb, getMediaByFilename, insertMedia, MediaSource } from './db';
import { isInside } from './safePath';

/** Tags the pipeline adds by itself; an item with only these was never really analysed. */
const PLACEHOLDER_TAGS = new Set(['image', 'photo', 'uploaded', 'upload', 'local', 'indexed', 'video', 'unprocessed']);

export function hasAiResults(item: Partial<MediaItem>): boolean {
  if (item.detectedObjects?.length) return true;
  if (item.ocrText || item.ocrData?.extractedText?.length) return true;
  return (item.tags || []).some(t => !PLACEHOLDER_TAGS.has(String(t).toLowerCase()));
}

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
}

function backup(file: string) {
  if (!fs.existsSync(file)) return;
  let target = `${file}.bak`;
  if (fs.existsSync(target)) target = `${file}.${Date.now()}.bak`;
  fs.renameSync(file, target);
}

export interface MigrationReport {
  imported: number;
  skipped: number;
  trashed: number;
  roots: number;
}

export function migrateLegacyJson(dataDir: string, mediaDir: string): MigrationReport | null {
  const indexFile = path.join(dataDir, 'library_index.json');
  const trashFile = path.join(dataDir, 'trash_index.json');
  const rootsFile = path.join(dataDir, 'library_roots.json');
  if (![indexFile, trashFile, rootsFile].some(f => fs.existsSync(f))) return null;

  const items = readJson<any[]>(indexFile, []);
  const trash = new Set(readJson<string[]>(trashFile, []));
  const roots = readJson<string[]>(rootsFile, []);
  const report: MigrationReport = { imported: 0, skipped: 0, trashed: 0, roots: 0 };

  getDb().transaction(() => {
    for (const raw of Array.isArray(items) ? items : []) {
      if (!raw || typeof raw.filename !== 'string' || typeof raw.id !== 'string' || getMediaByFilename(raw.filename)) {
        report.skipped++;
        continue;
      }
      const filePath = typeof raw.path === 'string' && raw.path ? raw.path : path.join(mediaDir, raw.filename);
      const source: MediaSource = isInside(filePath, mediaDir) ? 'upload' : 'scan';
      const aiStatus: AiStatus = hasAiResults(raw) ? 'done' : 'pending';
      const item: MediaItem = {
        ...raw,
        path: filePath,
        url: raw.url?.startsWith('/api/serve-media') ? `/api/media/${raw.id}/file` : raw.url,
        thumbnailUrl: raw.thumbnailUrl?.startsWith('/api/serve-media') ? `/api/media/${raw.id}/file` : raw.thumbnailUrl,
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        detectedObjects: Array.isArray(raw.detectedObjects) ? raw.detectedObjects : [],
        isDeleted: trash.has(raw.filename),
      };
      insertMedia(item, { source, aiStatus });
      report.imported++;
      if (item.isDeleted) report.trashed++;
    }
    for (const root of Array.isArray(roots) ? roots : []) {
      if (typeof root === 'string') {
        addLibraryRoot(root);
        report.roots++;
      }
    }
  })();

  // Only after the transaction committed: keep the originals as .bak.
  [indexFile, trashFile, rootsFile].forEach(backup);
  console.log(
    `[DB] Imported ${report.imported} items (${report.trashed} in trash), ${report.roots} library folders from JSON; ` +
      `${report.skipped} skipped. Old files renamed to *.bak.`
  );
  return report;
}
