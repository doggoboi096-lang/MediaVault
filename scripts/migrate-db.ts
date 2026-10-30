/**
 * migrate-db.ts — Imports library_index.json / trash_index.json / library_roots.json
 * into data/mediavault.db and renames them to *.bak (`npm run db:migrate`).
 * The server also does this on startup; this script is for running it on its own.
 */

import 'dotenv/config';
import path from 'path';
import { closeDatabase, countMedia, openDatabase } from '../src/server/db';
import { migrateLegacyJson } from '../src/server/migrate';

const dataDir = path.resolve(process.env.DATA_DIR || process.cwd());
openDatabase(dataDir);
const report = migrateLegacyJson(dataDir, path.join(dataDir, 'media_uploads'));
if (!report) console.log('Nothing to migrate: no library_index.json, trash_index.json or library_roots.json found.');
console.log(`Database now holds ${countMedia()} items: ${path.join(dataDir, 'data', 'mediavault.db')}`);
closeDatabase();
