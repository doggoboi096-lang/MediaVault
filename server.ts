import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { startAiRuntime, aiStatus } from './src/services/ai_runtime.ts';
import { authRouter, checkAuthConfig, requireAuth } from './src/server/auth.ts';
import { PathError, isInside, safeFilename, sanitizeUploadName, validateLibraryRoot } from './src/server/safePath.ts';
import { audit, configureAudit } from './src/server/audit.ts';
import {
  addLibraryRoot,
  getLibraryRoots,
  getMedia,
  getMediaByFilename,
  getMediaByPath,
  insertMedia,
  listMedia,
  openDatabase,
  removeMedia,
  setDeleted,
  trashedFilenames,
  updateMedia,
} from './src/server/db.ts';
import { migrateLegacyJson } from './src/server/migrate.ts';
import {
  SUPPORTED_EXTS,
  VIDEO_EXTS,
  extractRealDate,
  formatExifData,
  ingestUpload,
  probeVideo,
  readImageExif,
  syncUploadsFolder,
} from './src/server/ingest.ts';
import { processMedia } from './src/server/analyze.ts';
import { PRIORITY, enqueue, getAiSettings, resetInterruptedJobs, startWorker, wakeWorker } from './src/server/queue.ts';

/**
 * Keeps data out of the dev server: Vite serves any file under the project root
 * (and /@fs/ paths), which would expose uploads, indexes, logs and keys without a session.
 */
function blockPrivateFiles(dataDir: string): express.RequestHandler {
  const projectRoot = process.cwd();
  const names = ['media_uploads', 'library_index.json', 'trash_index.json', 'library_roots.json', '.ai_runtime', 'models', 'logs', 'data'];
  const privatePaths = [...new Set([projectRoot, dataDir])].flatMap(base => names.map(n => path.join(base, n)));
  const same = (a: string, b: string) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

  return (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/media/')) return next();
    let p: string;
    try {
      p = decodeURIComponent(req.path).replace(/\\/g, '/');
    } catch {
      return res.status(400).end();
    }
    const abs = p.startsWith('/@fs/')
      ? path.resolve(p.slice(4).replace(/^\/([A-Za-z]:)/, '$1'))
      : path.resolve(projectRoot, '.' + path.posix.normalize(p));
    const base = path.basename(abs).toLowerCase();
    const blocked =
      base.startsWith('.env') ||
      // Legacy JSON stores and their .bak copies left by the SQLite migration
      ['library_index.json', 'trash_index.json', 'library_roots.json'].some(n => base.startsWith(n)) ||
      privatePaths.some(priv => same(abs, priv) || isInside(abs, priv));
    if (blocked) return res.status(404).end();
    next();
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  // Localhost only by default; remote devices reach the app through `tailscale serve`.
  const HOST = process.env.HOST || '127.0.0.1';
  checkAuthConfig(HOST);
  // Trust X-Forwarded-For only from the local proxy (tailscale serve), so rate limits see the real client.
  app.set('trust proxy', 'loopback');

  // Directories & database
  const DATA_DIR = path.resolve(process.env.DATA_DIR || process.cwd());
  const mediaDir = path.join(DATA_DIR, 'media_uploads');
  configureAudit(DATA_DIR);

  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  openDatabase(DATA_DIR);
  migrateLegacyJson(DATA_DIR, mediaDir);
  const registered = await syncUploadsFolder(mediaDir);
  if (getAiSettings().autoTag) registered.forEach(id => enqueue(id, PRIORITY.backfill));
  const resumed = resetInterruptedJobs();
  if (resumed) console.log(`[QUEUE] Resuming ${resumed} job(s) interrupted by the last shutdown`);

  // ── Access control ────────────────────────────────────────────────────────
  // Public: the auth endpoints, a bare health check and the SPA shell (login screen).
  // Everything else under /api and /media needs the owner's session.
  app.use(cookieParser());
  app.use(blockPrivateFiles(DATA_DIR));
  app.use('/api/auth', authRouter);
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api', requireAuth);
  // Parse JSON only after auth so anonymous requests can't make the server buffer large bodies.
  app.use(express.json({ limit: '50mb' }));
  app.use('/media', requireAuth, express.static(mediaDir, { dotfiles: 'deny', index: false }));

  // Sync / ensure existing converted JPEGs have embedded EXIF transferred from originals
  // (async () => {
  //   const vaultDir = path.join(mediaDir, 'heic_originals');
  //   if (!fs.existsSync(vaultDir)) return;
  //   try {
  //     const heicFiles = fs.readdirSync(vaultDir);
  //     for (const hf of heicFiles) {
  //       const heicPath = path.join(vaultDir, hf);
  //       const baseName = hf.replace(/^\d+-/, '').replace(/\.(heic|heif)$/i, '');
  //       const jpgFiles = fs.readdirSync(mediaDir).filter(f => f.includes(baseName) && f.endsWith('.jpg'));
  //       for (const jf of jpgFiles) {
  //         const jpgPath = path.join(mediaDir, jf);
  //         try {
  //           const parsed = await exifr.parse(jpgPath, { tiff: true }).catch(() => null);
  //           if (!parsed || !parsed.Make) {
  //             console.log(`[HEIC-SYNC] Injecting EXIF into ${jf} from ${hf}...`);
  //             const upgradedJpg = await convertHeicToJpegWithExif(heicPath, 0.88);
  //             fs.writeFileSync(jpgPath, upgradedJpg);
  //             console.log(`[HEIC-SYNC] Successfully injected EXIF into ${jf}`);
  //           }
  //         } catch (e) {
  //           // ignore
  //         }
  //       }
  //     }
  //   } catch (e) {
  //     console.warn('[HEIC-SYNC] Error syncing existing HEIC EXIF:', e);
  //   }
  // })();

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, mediaDir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + sanitizeUploadName(file.originalname));
    }
  });
  const upload = multer({ storage });

  /** A file may be streamed only from media_uploads or a registered library folder. */
  const isServable = (filePath: string) =>
    isInside(filePath, mediaDir) || getLibraryRoots().some(root => isInside(filePath, root));

  /**
   * Deletes the stored copy of an item when it lives in media_uploads.
   * Originals in scanned library folders are never touched: they only leave the index.
   */
  const deleteStoredFiles = (filename: string, item: any): 'deleted' | 'index-only' | 'missing' => {
    const candidate = item?.path ? path.resolve(item.path) : path.join(mediaDir, filename);
    let result: 'deleted' | 'index-only' | 'missing' = 'missing';
    if (isInside(candidate, mediaDir)) {
      if (fs.existsSync(candidate)) {
        fs.unlinkSync(candidate);
        result = 'deleted';
      }
    } else {
      result = 'index-only';
    }
    if (item?.originalHeicUrl) {
      const heicPath = path.join(mediaDir, 'heic_originals', path.basename(item.originalHeicUrl));
      if (isInside(heicPath, mediaDir) && fs.existsSync(heicPath)) fs.unlinkSync(heicPath);
    }
    // Video posters written by the AI worker
    if (typeof item?.previewUrl === 'string' && item.previewUrl.startsWith('/media/previews/')) {
      const posterPath = path.join(mediaDir, 'previews', path.basename(item.previewUrl));
      if (isInside(posterPath, mediaDir) && fs.existsSync(posterPath)) fs.unlinkSync(posterPath);
    }
    return result;
  };

  /** Validates every filename in a request body; responds 400 and returns null on the first bad one. */
  const readFilenames = (req: express.Request, res: express.Response): string[] | null => {
    const filenames = req.body?.filenames;
    if (!Array.isArray(filenames)) {
      res.status(400).json({ success: false, error: 'Expected array' });
      return null;
    }
    try {
      return filenames.map(safeFilename);
    } catch {
      res.status(400).json({ success: false, error: 'invalid filename' });
      return null;
    }
  };

  // In-memory runtime state for self-hosted backend simulation
  let currentLibraryPath = getLibraryRoots().at(-1) || 'D:\\GiaDinh\\HinhAnh';
  let isScanning = false;
  let scanProgress = {
    isScanning: false,
    stage: 'idle',
    currentFile: '',
    scannedCount: 0,
    totalFiles: 0,
    percentage: 0,
    logMessages: [] as string[]
  };

  // API Routes (all behind requireAuth)
  app.get('/api/system', async (req, res) => {
    let gpuName = 'NVENC / QuickSync';
    try { gpuName = execSync('wmic.exe path win32_VideoController get name', { stdio: 'ignore' }).toString().split('\n')[1].trim(); } catch (e) { }

    const drives = [];

    // Primary Drive: the configured library, or the drive holding media_uploads when that path doesn't exist here
    try {
      const primaryPath = fs.existsSync(currentLibraryPath) ? currentLibraryPath : mediaDir;
      const statFsResult = fs.statfsSync(primaryPath);
      const bsize = statFsResult.bsize || 4096;
      const totalBytes = Number(statFsResult.blocks) * bsize;
      const freeBytes = Number(statFsResult.bfree) * bsize;
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      const percentage = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

      drives.push({
        name: 'Primary Drive',
        usedBytes,
        totalBytes,
        percentage
      });
    } catch (e) {
      // console.error('Error fetching primary drive stats:', e);
    }

    // Secondary Drive
    try {
      let secondaryPath = '';
      if (currentLibraryPath.includes('/mnt/c')) {
        secondaryPath = '/mnt/d';
      } else if (currentLibraryPath.toUpperCase().startsWith('C:\\')) {
        secondaryPath = 'D:\\';
      }

      if (secondaryPath) {
        if (!fs.existsSync(secondaryPath)) throw new Error('Path not found');
        const statFsResult = fs.statfsSync(secondaryPath);
        if (Number(statFsResult.blocks) > 0) {
          const bsize = statFsResult.bsize || 4096;
          const totalBytes = Number(statFsResult.blocks) * bsize;
          const freeBytes = Number(statFsResult.bfree) * bsize;
          const usedBytes = Math.max(0, totalBytes - freeBytes);
          const percentage = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

          drives.push({
            name: 'Secondary Drive',
            usedBytes,
            totalBytes,
            percentage
          });
        }
      }
    } catch (e) {
      // console.error('Error fetching secondary drive stats:', e);
    }

    res.json({
      success: true,
      data: {
        cpuModel: os.cpus()[0]?.model || 'Unknown CPU',
        cpuCores: os.cpus().length,
        gpuName,
        uptime: os.uptime(),
        hwAccelEngine: 'Intel QuickSync / NVENC Active',
        drives,
        processUptime: process.uptime(),
        ai: aiStatus
      }
    });
  });

  // Streams an indexed file (e.g. from a scanned library folder) after checking it is inside an allowed folder.
  app.get('/api/media/:id/file', (req, res) => {
    const item = getMedia(req.params.id);
    if (!item || typeof item.path !== 'string') return res.status(404).json({ success: false, error: 'Not found' });
    const filePath = path.resolve(item.path);
    if (!isServable(filePath) || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.sendFile(filePath, { dotfiles: 'deny' });
  });

  app.get('/api/media', (req, res) => {
    res.json({ success: true, data: listMedia() });
  });

  app.get('/api/config', (req, res) => {
    res.json({
      libraryPath: currentLibraryPath,
      hwAccel: 'NVENC',
      yoloModel: 'yolov8n.onnx',
      proxyType: 'Nginx',
      vpnProvider: 'Tailscale',
      virtualIp: '100.84.192.42',
      port: PORT
    });
  });

  app.post('/api/config', (req, res) => {
    const { libraryPath } = req.body || {};
    if (libraryPath !== undefined) {
      try {
        currentLibraryPath = validateLibraryRoot(libraryPath);
        addLibraryRoot(currentLibraryPath);
      } catch (err) {
        if (err instanceof PathError) return res.status(400).json({ success: false, error: err.message });
        throw err;
      }
    }
    res.json({ success: true, libraryPath: currentLibraryPath });
  });

  // Fast upload: store, read metadata, convert HEIC, save as AI-pending and return.
  // Tagging happens in the background queue.
  app.post('/api/media/upload', upload.array('files'), async (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) return res.status(400).json({ success: false, error: 'No files uploaded' });

    // One lastModified per file, in upload order (a single field arrives as a string).
    const clientDates = ([] as unknown[]).concat(req.body?.clientDates ?? []).map(v => Number(v));
    const { autoTag } = getAiSettings();
    const items = [];
    const failed: string[] = [];

    for (const [index, file] of files.entries()) {
      try {
        const { item, duplicate } = await ingestUpload(file, { mediaDir, clientDateMs: clientDates[index] });
        if (duplicate) {
          items.push(item);
          continue;
        }
        const saved = insertMedia(item, { source: 'upload', aiStatus: 'pending' });
        if (autoTag) enqueue(saved.id, PRIORITY.upload);
        items.push(getMedia(saved.id));
      } catch (err: any) {
        console.error(`[UPLOAD] Failed to ingest ${file.originalname}:`, err?.message || err);
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        failed.push(file.originalname);
      }
    }

    wakeWorker();
    res.json({ success: true, items, failed });
  });

  app.post('/api/media/trash', (req, res) => {
    const filenames = readFilenames(req, res);
    if (!filenames) return;
    setDeleted(filenames, true);
    audit(req.user!.email, 'trash', filenames);
    res.json({ success: true, message: 'Trashed' });
  });

  app.post('/api/media/restore', (req, res) => {
    const filenames = readFilenames(req, res);
    if (!filenames) return;
    setDeleted(filenames, false);
    audit(req.user!.email, 'restore', filenames);
    res.json({ success: true, message: 'Restored' });
  });

  // Fields only the server may set: where a file lives and how it is served.
  const SERVER_OWNED_FIELDS = ['id', 'filename', 'path', 'url', 'thumbnailUrl', 'previewUrl', 'originalHeicUrl', 'isDeleted'];

  app.patch('/api/media', (req, res) => {
    const updatedItem = req.body?.item;
    if (!updatedItem || typeof updatedItem !== 'object') {
      return res.status(400).json({ success: false, error: 'Expected item with filename' });
    }
    let filename: string;
    try {
      filename = safeFilename(updatedItem.filename);
    } catch {
      return res.status(400).json({ success: false, error: 'invalid filename' });
    }
    const changes = Object.fromEntries(Object.entries(updatedItem).filter(([key]) => !SERVER_OWNED_FIELDS.includes(key)));

    // AI state belongs to the worker, not to clients.
    delete changes.aiStatus;
    delete changes.aiError;

    const existing = getMediaByFilename(filename);
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });
    const saved = updateMedia(existing.id, changes);
    res.json({ success: true, message: 'Updated successfully', item: saved });
  });

  /** Removes items from disk (media_uploads only), the index and the trash list, then audits it. */
  const deleteItems = (email: string, action: string, filenames: string[]) => {
    const deleted: string[] = [];
    const indexOnly: string[] = [];
    for (const f of filenames) {
      const item = getMediaByFilename(f);
      try {
        const result = deleteStoredFiles(f, item);
        if (result === 'deleted') deleted.push(f);
        if (result === 'index-only') indexOnly.push(f);
      } catch (e) {
        console.error(`Failed to delete ${f}:`, e);
      }
    }
    removeMedia(filenames);
    audit(email, action, filenames, indexOnly.length ? `kept originals: ${JSON.stringify(indexOnly)}` : '');
    return { deleted, indexOnly };
  };

  app.delete('/api/media/trash/empty', (req, res) => {
    try {
      const trash = trashedFilenames().filter(f => {
        try {
          safeFilename(f);
          return true;
        } catch {
          return false;
        }
      });
      const { deleted, indexOnly } = deleteItems(req.user!.email, 'empty-trash', trash);
      res.json({ success: true, deletedCount: deleted.length + indexOnly.length });
    } catch (err: any) {
      console.error('Failed to empty trash:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/media', (req, res) => {
    const filenames = readFilenames(req, res);
    if (!filenames) return;
    const { deleted } = deleteItems(req.user!.email, 'delete', filenames);
    res.json({ success: true, deleted: deleted.length });
  });

  app.delete('/api/media/:filename', (req, res) => {
    let filename: string;
    try {
      filename = safeFilename(req.params.filename);
    } catch {
      return res.status(400).json({ success: false, error: 'invalid filename' });
    }
    const { deleted } = deleteItems(req.user!.email, 'delete', [filename]);
    res.json({ success: true, message: deleted.length ? 'File deleted' : 'File removed from index' });
  });

  app.get('/api/scan/status', (req, res) => {
    res.json(scanProgress);
  });

  app.post('/api/scan/start', async (req, res) => {
    const { path: targetPath } = req.body || {};
    try {
      currentLibraryPath = validateLibraryRoot(targetPath ?? currentLibraryPath);
      addLibraryRoot(currentLibraryPath);
    } catch (err) {
      if (err instanceof PathError) return res.status(400).json({ success: false, error: err.message });
      throw err;
    }

    if (isScanning) {
      return res.json({ status: 'already_scanning', progress: scanProgress });
    }

    isScanning = true;
    scanProgress = {
      isScanning: true,
      stage: 'discovering',
      currentFile: 'Scanning directory tree...',
      scannedCount: 0,
      totalFiles: 0,
      percentage: 5,
      logMessages: [`[Discovery] Traversed root: ${currentLibraryPath}`]
    };

    try {
      if (fs.existsSync(currentLibraryPath)) {
        const files = fs.readdirSync(currentLibraryPath);
        scanProgress.totalFiles = files.length;

        let indexedCount = 0;
        const { autoTag } = getAiSettings();

        for (const file of files) {
          const srcPath = path.join(currentLibraryPath, file);
          try {
            const stat = fs.statSync(srcPath);
            if (stat.isFile()) {
              const ext = path.extname(file).toLowerCase();
              if (SUPPORTED_EXTS.includes(ext)) {
                const isVideo = VIDEO_EXTS.includes(ext);
                const { realExif, videoMeta } = isVideo ? probeVideo(srcPath) : { realExif: await readImageExif(srcPath), videoMeta: undefined };

                const dateInfo = extractRealDate(realExif, stat);
                const formattedExif = formatExifData(realExif, stat, ext, dateInfo.dateTaken);

                let lat = undefined;
                let lng = undefined;

                if (realExif.latitude && realExif.longitude) {
                  lat = realExif.latitude;
                  lng = realExif.longitude;
                }

                const location = lat && lng ? { name: 'GPS Location', city: '', country: '', latitude: lat, longitude: lng } : undefined;
                const known = getMediaByPath(srcPath);
                if (known) {
                  // Rescan: refresh file metadata, keep tags, AI results and edits.
                  updateMedia(known.id, { exif: formattedExif as any, location: known.location?.name && known.location.name !== 'GPS Location' ? known.location : location });
                  indexedCount++;
                  scanProgress.logMessages.push(`[INDEX] Refreshed ${file}`);
                  continue;
                }

                // `filename` is the item's key for trash/delete; scanned names get a prefix if they clash.
                const baseName = sanitizeUploadName(file);
                const filename = getMediaByFilename(baseName) ? `scan-${Math.random().toString(36).substring(2, 8)}-${baseName}` : baseName;
                const id = `media-idx-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                const newItem = {
                  id,
                  title: file,
                  filename,
                  path: srcPath,
                  url: `/api/media/${id}/file`,
                  thumbnailUrl: `/api/media/${id}/file`,
                  type: isVideo ? 'video' : 'image',
                  date: dateInfo.date,
                  dateFormatted: dateInfo.dateFormatted,
                  exif: formattedExif,
                  location,
                  tags: [],
                  detectedObjects: [],
                  originalSize: stat.size,
                  videoMeta,
                  isFavorite: false
                };

                insertMedia(newItem as any, { source: 'scan', aiStatus: 'pending' });
                // Scanned libraries can be large: they go after uploads in the queue.
                if (autoTag) enqueue(id, PRIORITY.scan);
                indexedCount++;
                scanProgress.logMessages.push(`[INDEX] Indexed ${file}`);
              }
            }
          } catch (e) {
            scanProgress.logMessages.push(`[ERROR] Failed to read ${file}`);
          }
        }

        scanProgress.scannedCount = indexedCount;
        scanProgress.logMessages.push(`[COMPLETE] Indexed ${indexedCount} files`);
      } else {
        scanProgress.logMessages.push(`[WARNING] Path not found: ${currentLibraryPath}`);
      }
    } catch (e: any) {
      scanProgress.logMessages.push(`[ERROR] Scan failed: ${e.message}`);
    }

    scanProgress.percentage = 100;
    scanProgress.stage = 'completed';
    scanProgress.isScanning = false;
    isScanning = false;

    res.json({ success: true, message: 'Scan complete', progress: scanProgress });
  });

  // Unknown API routes stop here instead of falling through to the SPA shell.
  app.use('/api', (req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      // HMR_PORT lets a second instance (e.g. the security check) run beside the normal dev server.
      server: { middlewareMode: true, ...(process.env.HMR_PORT ? { hmr: { port: Number(process.env.HMR_PORT) } } : {}) },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    // Print localhost for loopback binds: Firebase sign-in is authorized for localhost, not 127.0.0.1.
    const shownHost = ['127.0.0.1', '::1'].includes(HOST) ? 'localhost' : HOST;
    console.log(`MediaVault server listening at http://${shownHost}:${PORT}`);
    // Boot the local AI runtime in the background; queued jobs wait for it.
    // AI_AUTOSTART=false defers it to the first job.
    if (process.env.AI_AUTOSTART !== 'false') {
      startAiRuntime().catch(() => { /* status already logged; the queue retries later */ });
    }
    startWorker({ process: item => processMedia(item, { mediaDir }) });
  });
}

startServer().catch(err => {
  // Configuration errors (e.g. AUTH_DISABLED with a public HOST) stop the process before it listens.
  console.error('[STARTUP] ' + (err?.message || err));
  process.exit(1);
});
