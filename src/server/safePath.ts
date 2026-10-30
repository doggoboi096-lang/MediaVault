/**
 * safePath.ts — Filename and directory checks for anything that reaches the filesystem
 * from a request (route params, JSON bodies, library paths).
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

export class PathError extends Error {}

/** Accepts a bare filename only: no separators, no traversal, no reserved characters. */
export function safeFilename(name: unknown): string {
  if (
    typeof name !== 'string' ||
    !name ||
    name !== path.basename(name) ||
    name.includes('..') ||
    /[\\/:*?"<>|\0]/.test(name)
  ) {
    throw new PathError('invalid filename');
  }
  return name;
}

/** Turns an uploaded file's original name into something safe to store on disk. */
export function sanitizeUploadName(original: string): string {
  const base = path.basename(original.replace(/\\/g, '/'));
  const cleaned = base.replace(/[\\/:*?"<>|\0]/g, '_').replace(/\.{2,}/g, '.').trim();
  return cleaned || 'upload';
}

/** True when `child` is strictly inside `parent` (resolved, case-insensitive on Windows). */
export function isInside(child: string, parent: string): boolean {
  const norm = (p: string) => (process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p));
  const rel = path.relative(norm(parent), norm(child));
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** System locations a library must never point at or contain. */
function forbiddenRoots(): string[] {
  if (process.platform === 'win32') {
    const sysRoot = process.env.SystemRoot || 'C:\\Windows';
    return [
      sysRoot,
      process.env.ProgramFiles || 'C:\\Program Files',
      process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
      process.env.ProgramData || 'C:\\ProgramData',
    ];
  }
  return ['/etc', '/bin', '/sbin', '/usr', '/lib', '/boot', '/dev', '/proc', '/sys', '/var', '/System', '/Library'];
}

/**
 * Validates a library folder chosen by the user: absolute, existing directory,
 * not a drive root, the home folder itself, or a system directory.
 */
export function validateLibraryRoot(input: unknown): string {
  if (typeof input !== 'string' || !input.trim()) throw new PathError('libraryPath is required');
  const raw = input.trim();
  if (!path.isAbsolute(raw)) throw new PathError('libraryPath must be an absolute path');

  const resolved = path.resolve(raw);
  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
  } catch {
    throw new PathError('libraryPath does not exist');
  }
  if (!stat.isDirectory()) throw new PathError('libraryPath must be a directory');

  const real = fs.realpathSync(resolved);
  const same = (a: string, b: string) =>
    process.platform === 'win32' ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b);

  if (same(real, path.parse(real).root)) throw new PathError('libraryPath cannot be a drive root');
  if (same(real, os.homedir())) throw new PathError('libraryPath cannot be the whole home folder');
  for (const sys of forbiddenRoots()) {
    if (same(real, sys) || isInside(real, sys)) throw new PathError('libraryPath cannot be a system directory');
  }
  return real;
}
