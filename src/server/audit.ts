/**
 * audit.ts — Append-only log of destructive actions (one tab-separated line per action).
 */

import fs from 'fs';
import path from 'path';

let logFile = path.join(process.cwd(), 'logs', 'audit.log');

export function configureAudit(dataDir: string) {
  logFile = path.join(dataDir, 'logs', 'audit.log');
}

export function audit(email: string, action: string, filenames: string[], note = '') {
  const line = [new Date().toISOString(), email || 'unknown', action, JSON.stringify(filenames), note].join('\t') + '\n';
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, line);
  } catch (e) {
    console.error('[AUDIT] Failed to write audit log:', e);
  }
}
