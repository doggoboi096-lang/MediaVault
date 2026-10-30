/**
 * queue.ts — Background AI queue stored in the jobs table.
 *
 * One worker loop processes one job at a time (there is one GPU). Jobs survive
 * restarts: anything left 'processing' by a crash goes back to 'pending' on
 * startup. A failing job is retried with a growing delay, up to MAX_ATTEMPTS.
 * When the AI runtime itself is down, jobs wait without using up attempts.
 */

import type { MediaItem, QueueProgress } from '../types';
import { getDb, getMedia, getSetting, setSetting, updateMedia } from './db';
import { AiUnavailableError } from './analyze';

export const PRIORITY = { reanalyze: 30, upload: 20, backfill: 5, scan: 0 } as const;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 15_000;
const AI_UNAVAILABLE_DELAY_MS = 30_000;

interface JobRow {
  id: number;
  media_id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  priority: number;
  attempts: number;
  error: string | null;
  run_after: number;
}

// ── Settings ────────────────────────────────────────────────────────────────
export interface AiSettings {
  /** Queue new uploads and scans for tagging automatically. */
  autoTag: boolean;
  /** Only run the worker while the machine is on AC power. */
  onlyOnAc: boolean;
  /** Stop picking up new jobs. */
  paused: boolean;
}

export function getAiSettings(): AiSettings {
  return {
    autoTag: getSetting('ai_auto_tag', true),
    onlyOnAc: getSetting('ai_only_on_ac', false),
    paused: getSetting('queue_paused', false),
  };
}

export function updateAiSettings(patch: Partial<AiSettings>): AiSettings {
  if (typeof patch.autoTag === 'boolean') setSetting('ai_auto_tag', patch.autoTag);
  if (typeof patch.onlyOnAc === 'boolean') setSetting('ai_only_on_ac', patch.onlyOnAc);
  if (typeof patch.paused === 'boolean') setSetting('queue_paused', patch.paused);
  wakeWorker();
  return getAiSettings();
}

// ── Job table operations ────────────────────────────────────────────────────
/** Queues a media item for analysis. Returns false if it is being processed right now. */
export function enqueue(mediaId: string, priority: number): boolean {
  const db = getDb();
  const queued = db.transaction(() => {
    const active = db.prepare("SELECT id, status, priority FROM jobs WHERE media_id = ? AND status IN ('pending', 'processing')").get(mediaId) as
      | Pick<JobRow, 'id' | 'status' | 'priority'>
      | undefined;
    if (active?.status === 'processing') return false;
    const now = Date.now();
    if (active) {
      db.prepare('UPDATE jobs SET priority = MAX(priority, ?), run_after = 0, updated_at = ? WHERE id = ?').run(priority, now, active.id);
    } else {
      db.prepare("INSERT INTO jobs (media_id, status, priority, created_at, updated_at) VALUES (?, 'pending', ?, ?, ?)").run(mediaId, priority, now, now);
    }
    db.prepare("UPDATE media SET ai_status = 'pending', ai_error = NULL WHERE id = ?").run(mediaId);
    return true;
  })();
  if (queued) wakeWorker();
  return queued;
}

/** Queues every item that still needs tagging (pending or failed, not in the trash, not queued). */
export function enqueueBackfill(): number {
  const db = getDb();
  const ids = (
    db
      .prepare(
        `SELECT m.id FROM media m
         WHERE m.ai_status IN ('pending', 'failed') AND m.is_deleted = 0
           AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.media_id = m.id AND j.status IN ('pending', 'processing'))`
      )
      .all() as { id: string }[]
  ).map(r => r.id);
  db.transaction(() => ids.forEach(id => enqueue(id, PRIORITY.backfill)))();
  return ids.length;
}

/** Puts jobs interrupted by a crash or restart back in line. */
export function resetInterruptedJobs(): number {
  const db = getDb();
  return db.transaction(() => {
    const n = db.prepare("UPDATE jobs SET status = 'pending', updated_at = ? WHERE status = 'processing'").run(Date.now()).changes;
    db.prepare("UPDATE media SET ai_status = 'pending' WHERE ai_status = 'processing'").run();
    // Finished jobs are only kept for a week, for troubleshooting.
    db.prepare("DELETE FROM jobs WHERE status IN ('done', 'failed') AND updated_at < ?").run(Date.now() - 7 * 86400_000);
    return n;
  })();
}

function claimNextJob(): (JobRow & { item: MediaItem }) | null {
  const db = getDb();
  return db.transaction(() => {
    const job = db
      .prepare(
        `SELECT j.* FROM jobs j JOIN media m ON m.id = j.media_id
         WHERE j.status = 'pending' AND j.run_after <= ? AND m.is_deleted = 0
         ORDER BY j.priority DESC, j.id ASC LIMIT 1`
      )
      .get(Date.now()) as JobRow | undefined;
    if (!job) return null;
    db.prepare("UPDATE jobs SET status = 'processing', attempts = attempts + 1, updated_at = ? WHERE id = ?").run(Date.now(), job.id);
    db.prepare("UPDATE media SET ai_status = 'processing' WHERE id = ?").run(job.media_id);
    return { ...job, attempts: job.attempts + 1, item: getMedia(job.media_id)! };
  })();
}

function completeJob(job: JobRow, patch: Partial<MediaItem>) {
  const db = getDb();
  db.transaction(() => {
    // Merged onto the current row, so edits made while the AI was running are kept.
    updateMedia(job.media_id, { ...patch, aiStatus: 'done', aiError: undefined });
    db.prepare("UPDATE jobs SET status = 'done', error = NULL, updated_at = ? WHERE id = ?").run(Date.now(), job.id);
  })();
}

function failJob(job: JobRow, message: string) {
  const db = getDb();
  const final = job.attempts >= MAX_ATTEMPTS;
  db.transaction(() => {
    db.prepare('UPDATE jobs SET status = ?, error = ?, run_after = ?, updated_at = ? WHERE id = ?').run(
      final ? 'failed' : 'pending',
      message,
      final ? 0 : Date.now() + RETRY_DELAY_MS * job.attempts,
      Date.now(),
      job.id
    );
    db.prepare('UPDATE media SET ai_status = ?, ai_error = ? WHERE id = ?').run(final ? 'failed' : 'pending', final ? message : null, job.media_id);
  })();
}

/** Returns a job to the queue without counting the attempt (the AI wasn't reachable). */
function deferJob(job: JobRow, delayMs: number) {
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE jobs SET status = 'pending', attempts = attempts - 1, run_after = ?, updated_at = ? WHERE id = ?").run(Date.now() + delayMs, Date.now(), job.id);
    db.prepare("UPDATE media SET ai_status = 'pending' WHERE id = ?").run(job.media_id);
  })();
}

function nextRunAfter(): number | null {
  const row = getDb()
    .prepare(
      `SELECT MIN(j.run_after) AS t FROM jobs j JOIN media m ON m.id = j.media_id
       WHERE j.status = 'pending' AND m.is_deleted = 0`
    )
    .get() as { t: number | null };
  return row.t;
}

// ── Progress ────────────────────────────────────────────────────────────────
let blockedBy: QueueProgress['blockedBy'] = null;

export function queueProgress(): QueueProgress & { unqueued: number } {
  const db = getDb();
  const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    pending: count(`SELECT COUNT(*) AS n FROM jobs j JOIN media m ON m.id = j.media_id WHERE j.status = 'pending' AND m.is_deleted = 0`),
    processing: count(`SELECT COUNT(*) AS n FROM jobs WHERE status = 'processing'`),
    failed: count(`SELECT COUNT(*) AS n FROM media WHERE ai_status = 'failed' AND is_deleted = 0`),
    unqueued: count(
      `SELECT COUNT(*) AS n FROM media m WHERE m.ai_status IN ('pending', 'failed') AND m.is_deleted = 0
       AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.media_id = m.id AND j.status IN ('pending', 'processing'))`
    ),
    blockedBy,
  };
}

// ── Worker ──────────────────────────────────────────────────────────────────
interface WorkerOptions {
  process: (item: MediaItem) => Promise<Partial<MediaItem>>;
  isOnAcPower?: () => Promise<boolean>;
  onItemChanged?: (item: MediaItem) => void;
  onProgress?: (progress: ReturnType<typeof queueProgress>) => void;
}

let running = false;
let wake: (() => void) | null = null;

/** Lets the worker re-check the queue now instead of at its next timeout. */
export function wakeWorker() {
  wake?.();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      wake = null;
      resolve();
    }
    wake = done;
  });
}

export function stopWorker() {
  running = false;
  wakeWorker();
}

export function startWorker(opts: WorkerOptions) {
  if (running) return;
  running = true;
  const emitProgress = () => opts.onProgress?.(queueProgress());
  const emitItem = (id: string) => {
    const item = getMedia(id);
    if (item) opts.onItemChanged?.(item);
  };

  (async () => {
    while (running) {
      const settings = getAiSettings();
      const settingsBlock = settings.paused ? 'paused' : settings.onlyOnAc && opts.isOnAcPower && !(await opts.isOnAcPower()) ? 'on-battery' : null;
      // 'ai-unavailable' sticks until a job gets through.
      blockedBy = settingsBlock ?? (blockedBy === 'ai-unavailable' ? 'ai-unavailable' : null);
      if (settingsBlock) {
        emitProgress();
        // Settings changes wake the worker; power is re-checked every 30 s.
        await sleep(blockedBy === 'on-battery' ? 30_000 : 60_000);
        continue;
      }

      const job = claimNextJob();
      if (!job) {
        emitProgress();
        const next = nextRunAfter();
        await sleep(next ? Math.max(500, Math.min(next - Date.now(), 60_000)) : 60_000);
        continue;
      }

      emitProgress();
      emitItem(job.media_id);
      const started = Date.now();
      try {
        const patch = await opts.process(job.item);
        completeJob(job, patch);
        blockedBy = null;
        console.log(`[QUEUE] Done ${job.media_id} (attempt ${job.attempts}, ${((Date.now() - started) / 1000).toFixed(1)}s)`);
      } catch (err: any) {
        if (err instanceof AiUnavailableError) {
          deferJob(job, AI_UNAVAILABLE_DELAY_MS);
          blockedBy = 'ai-unavailable';
          console.warn(`[QUEUE] AI unavailable, retrying in ${AI_UNAVAILABLE_DELAY_MS / 1000}s: ${err.message}`);
        } else {
          failJob(job, String(err?.message || err).slice(0, 500));
          console.warn(`[QUEUE] Job for ${job.media_id} failed (attempt ${job.attempts}/${MAX_ATTEMPTS}): ${err?.message || err}`);
        }
      }
      emitItem(job.media_id);
      emitProgress();
    }
  })().catch(err => {
    running = false;
    console.error('[QUEUE] Worker stopped unexpectedly:', err);
  });
}
