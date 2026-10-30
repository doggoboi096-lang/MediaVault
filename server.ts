import 'dotenv/config';
import heicConvert from 'heic-convert';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile, execFileSync, execSync } from 'child_process';
import util from 'util';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import multer from 'multer';
import exifr from 'exifr';
import { createServer as createViteServer } from 'vite';
import { INITIAL_MEDIA } from './src/data/mockMedia';
import { analyzeMediaHybrid } from './src/services/local_ai.ts';
import { startAiRuntime, aiStatus } from './src/services/ai_runtime.ts';
import { authRouter, checkAuthConfig, requireAuth } from './src/server/auth.ts';
import { PathError, isInside, safeFilename, sanitizeUploadName, validateLibraryRoot } from './src/server/safePath.ts';
import { audit, configureAudit } from './src/server/audit.ts';

// Patch exifr parser limitation for modern HEIF/HEIC/AVIF files with header > 50 bytes
try {
  const heicParser: any = exifr.fileParsers?.get('heic');
  if (heicParser) {
    heicParser.canHandle = function (file: any, firstTwoBytes: number) {
      if (firstTwoBytes !== 0) return false;
      const ftypLength = file.getUint16(2);
      if (ftypLength > 1024) return false;
      let offset = 16;
      const compatibleBrands: string[] = [];
      while (offset < ftypLength) {
        compatibleBrands.push(file.getString(offset, 4));
        offset += 4;
      }
      return (
        compatibleBrands.includes(this.type) ||
        compatibleBrands.includes('heic') ||
        compatibleBrands.includes('heix') ||
        compatibleBrands.includes('mif1') ||
        compatibleBrands.includes('msf1') ||
        compatibleBrands.includes('hevc') ||
        compatibleBrands.includes('hevx') ||
        compatibleBrands.includes('heim') ||
        compatibleBrands.includes('heis') ||
        compatibleBrands.includes('hevm') ||
        compatibleBrands.includes('hevs') ||
        compatibleBrands.includes('miaf') ||
        compatibleBrands.includes('MiHB') ||
        compatibleBrands.includes('MiHA') ||
        compatibleBrands.includes('MiHE') ||
        compatibleBrands.includes('MiPr') ||
        compatibleBrands.includes('tmap')
      );
    };
  }

  const avifParser: any = exifr.fileParsers?.get('avif');
  if (avifParser) {
    avifParser.canHandle = function (file: any, firstTwoBytes: number) {
      if (firstTwoBytes !== 0) return false;
      const ftypLength = file.getUint16(2);
      if (ftypLength > 1024) return false;
      let offset = 16;
      const compatibleBrands: string[] = [];
      while (offset < ftypLength) {
        compatibleBrands.push(file.getString(offset, 4));
        offset += 4;
      }
      return (
        compatibleBrands.includes(this.type) ||
        compatibleBrands.includes('avif') ||
        compatibleBrands.includes('avis') ||
        compatibleBrands.includes('mif1')
      );
    };
  }
} catch (patchErr) {
  console.warn('Could not patch exifr parsers:', patchErr);
}

function extractRealDate(realExif: any, stat: fs.Stats, clientDateMs?: number) {
  const timestamps: number[] = [];

  if (realExif?.DateTimeOriginal) timestamps.push(new Date(realExif.DateTimeOriginal).getTime());
  if (realExif?.CreateDate) timestamps.push(new Date(realExif.CreateDate).getTime());
  if (realExif?.ModifyDate) timestamps.push(new Date(realExif.ModifyDate).getTime());

  if (clientDateMs) {
    timestamps.push(clientDateMs);
  } else {
    if (stat?.birthtimeMs) timestamps.push(stat.birthtimeMs);
    if (stat?.mtimeMs) timestamps.push(stat.mtimeMs);
    if (stat?.ctimeMs) timestamps.push(stat.ctimeMs);
  }

  const validTimestamps = timestamps.filter(t => t && !isNaN(t) && t > 1000000000);
  const realDateTimestamp = validTimestamps.length > 0 ? Math.min(...validTimestamps) : Date.now();

  const realDateIso = new Date(realDateTimestamp).toISOString();
  return {
    timestamp: realDateTimestamp,
    iso: realDateIso,
    date: realDateIso.split('T')[0],
    dateFormatted: new Date(realDateTimestamp).toLocaleDateString(),
    dateTaken: realDateIso.replace('T', ' ').substring(0, 19)
  };
}

function formatExifData(realExif: any, stat: fs.Stats, ext: string, dateTaken: string, metadataExif: any = {}) {
  const imgWidth = realExif?.ExifImageWidth || realExif?.ImageWidth || null;
  const imgHeight = realExif?.ExifImageHeight || realExif?.ImageHeight || null;

  let shutterFormatted = '';
  if (realExif?.ExposureTime) {
    shutterFormatted = realExif.ExposureTime < 1 ? `1/${Math.round(1 / realExif.ExposureTime)}s` : `${parseFloat(Number(realExif.ExposureTime).toFixed(2))}s`;
  } else if (metadataExif?.shutter) {
    shutterFormatted = metadataExif.shutter;
  }

  let apertureFormatted = '';
  if (realExif?.FNumber) {
    apertureFormatted = `f/${parseFloat(Number(realExif.FNumber).toFixed(2))}`;
  } else if (metadataExif?.aperture) {
    apertureFormatted = metadataExif.aperture;
  }

  let focalFormatted = '';
  if (realExif?.FocalLength) {
    focalFormatted = `${parseFloat(Number(realExif.FocalLength).toFixed(1))}mm`;
  }

  let colorSpaceFormatted = 'Uncalibrated';
  if (realExif?.ColorSpace === 1 || realExif?.ColorSpace === 'sRGB') {
    colorSpaceFormatted = 'sRGB';
  } else if (realExif?.ProfileDescription) {
    colorSpaceFormatted = realExif.ProfileDescription;
  }

  return {
    camera: realExif?.Make ? `${realExif.Make} ${realExif.Model || ''}`.trim() : (metadataExif?.camera || ''),
    lens: realExif?.LensModel || metadataExif?.lens || '',
    aperture: apertureFormatted,
    shutter: shutterFormatted,
    iso: realExif?.ISO || metadataExif?.iso || 0,
    focalLength: focalFormatted,
    dimensions: imgWidth && imgHeight ? `${imgWidth} x ${imgHeight}` : '',
    width: imgWidth,
    height: imgHeight,
    size: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
    sizeBytes: stat.size,
    colorSpace: colorSpaceFormatted,
    dateTaken,
    format: ext.toUpperCase().replace('.', '')
  };
}

export async function convertHeicToJpegWithExif(heicBufferOrPath: Buffer | string, quality = 0.88): Promise<Buffer> {
  const heicBuf = typeof heicBufferOrPath === 'string' ? fs.readFileSync(heicBufferOrPath) : heicBufferOrPath;
  const rawJpg = await heicConvert({ buffer: heicBuf, format: 'JPEG', quality });
  return Buffer.from(rawJpg);
}






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
    const blocked =
      path.basename(abs).toLowerCase().startsWith('.env') ||
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

  // Directories & index paths
  const DATA_DIR = path.resolve(process.env.DATA_DIR || process.cwd());
  const mediaDir = path.join(DATA_DIR, 'media_uploads');
  const INDEX_FILE = path.join(DATA_DIR, 'library_index.json');
  const TRASH_FILE = path.join(DATA_DIR, 'trash_index.json');
  const ROOTS_FILE = path.join(DATA_DIR, 'library_roots.json');
  configureAudit(DATA_DIR);

  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

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

  // Folders registered through the library scanner; files inside them may be served but never deleted.
  const getLibraryRoots = (): string[] => {
    try {
      const roots = JSON.parse(fs.readFileSync(ROOTS_FILE, 'utf-8'));
      return Array.isArray(roots) ? roots.filter((r: unknown) => typeof r === 'string') : [];
    } catch {
      return [];
    }
  };

  const addLibraryRoot = (root: string) => {
    const roots = getLibraryRoots();
    if (!roots.some(r => path.resolve(r).toLowerCase() === path.resolve(root).toLowerCase())) {
      fs.writeFileSync(ROOTS_FILE, JSON.stringify([...roots, root], null, 2));
    }
  };

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

  const getLibraryIndex = (): any[] => {
    if (fs.existsSync(INDEX_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
      } catch (e) {
        console.error('Failed to parse library_index.json', e);
      }
    }
    return [];
  };

  const saveLibraryIndex = (items: any[]) => {
    try {
      fs.writeFileSync(INDEX_FILE, JSON.stringify(items, null, 2));
    } catch (e) {
      console.error('Failed to write library_index.json', e);
    }
  };

  const getTrashIndex = (): string[] => {
    if (fs.existsSync(TRASH_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(TRASH_FILE, 'utf-8'));
      } catch (e) {
        console.error('Failed to parse trash_index.json', e);
      }
    }
    return [];
  };

  const saveTrashIndex = (arr: string[]) => {
    try {
      fs.writeFileSync(TRASH_FILE, JSON.stringify(arr, null, 2));
    } catch (e) {
      console.error('Failed to write trash_index.json', e);
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
    const item = getLibraryIndex().find(i => i.id === req.params.id);
    if (!item || typeof item.path !== 'string') return res.status(404).json({ success: false, error: 'Not found' });
    const filePath = path.resolve(item.path);
    if (!isServable(filePath) || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.sendFile(filePath, { dotfiles: 'deny' });
  });

  app.get('/api/media', async (req, res) => {
    try {
      let indexedItems = getLibraryIndex();
      const trashedItems = getTrashIndex();

      // Drop index entries whose file is gone. Scanned items live outside media_uploads, so check their own path.
      let indexModified = false;
      indexedItems = indexedItems.filter(item => {
        const stored = typeof item.path === 'string' && isServable(path.resolve(item.path)) && fs.existsSync(item.path);
        if (stored || fs.existsSync(path.join(mediaDir, item.filename))) return true;
        indexModified = true;
        return false;
      });
      // Older scans pointed at the removed /api/serve-media route.
      indexedItems.forEach(item => {
        if (typeof item.url === 'string' && item.url.startsWith('/api/serve-media')) {
          item.url = item.thumbnailUrl = `/api/media/${item.id}/file`;
          indexModified = true;
        }
      });
      if (indexModified) saveLibraryIndex(indexedItems);

      let mediaFiles: string[] = [];
      if (fs.existsSync(mediaDir)) {
        mediaFiles = fs.readdirSync(mediaDir);
      }

      if (mediaFiles.length === 0 && indexedItems.length === 0) {
        return res.json({ success: true, data: INITIAL_MEDIA });
      }

      const supportedExts = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.webm', '.heic', '.webp'];
      const filteredFiles = mediaFiles.filter(file => supportedExts.includes(path.extname(file).toLowerCase()));

      const mediaItemsPromises = filteredFiles.map(async (file, index) => {
        const ext = path.extname(file).toLowerCase();
        const isVideo = ['.mp4', '.mov', '.webm'].includes(ext);
        const filePath = path.join(mediaDir, file);
        const stat = fs.statSync(filePath);

        let realExif: any = {};
        if (!isVideo) {
          try {
            realExif = await exifr.parse(filePath, { tiff: true, xmp: true, icc: true, gps: true }) || {};
          } catch (e) {
            // ignore
          }
        }

        const dateInfo = extractRealDate(realExif, stat);
        const formattedExif = formatExifData(realExif, stat, ext, dateInfo.dateTaken);

        let lat = undefined;
        let lng = undefined;
        if (realExif.latitude && realExif.longitude) {
          lat = realExif.latitude;
          lng = realExif.longitude;
        }

        return {
          id: `media-real-${index}-${stat.mtimeMs}`,
          title: file,
          filename: file,
          path: filePath,
          url: `/media/${file}`,
          thumbnailUrl: `/media/${file}`,
          type: isVideo ? 'video' : 'image',
          date: dateInfo.date,
          dateFormatted: dateInfo.dateFormatted,
          exif: formattedExif,
          location: lat && lng ? {
            name: 'GPS Location',
            city: '',
            country: '',
            latitude: lat,
            longitude: lng
          } : undefined,
          tags: ['local', 'upload', isVideo ? 'video' : 'image'],
          detectedObjects: [],
          videoMeta: isVideo ? {
            duration: '0:15',
            durationSeconds: 15,
            codec: 'HEVC (H.265)',
            bitrate: '15 Mbps',
            frameRate: 60,
            audioCodec: 'AAC 320kbps',
            hwTranscode: 'NVENC Active' as const
          } : undefined,
          isFavorite: false
        };
      });

      const mediaItems = await Promise.all(mediaItemsPromises);
      const allItemsMap = new Map<string, any>();

      // Default items from directory scan
      mediaItems.forEach(item => {
        allItemsMap.set(item.filename, item);
      });

      // Merge indexed items giving priority to library_index.json data (AI tags, detections, edits)
      indexedItems.forEach(item => {
        if (allItemsMap.has(item.filename)) {
          const existing = allItemsMap.get(item.filename);
          allItemsMap.set(item.filename, {
            ...existing,
            ...item,
            id: existing.id || item.id,
            tags: item.tags && item.tags.length > 0 ? item.tags : existing.tags,
            detectedObjects: item.detectedObjects && item.detectedObjects.length > 0 ? item.detectedObjects : existing.detectedObjects,
            ocrData: item.ocrData || existing.ocrData,
            exif: {
              ...existing.exif,
              ...(item.exif || {})
            }
          });
        } else {
          allItemsMap.set(item.filename, item);
        }
      });

      const allItems = Array.from(allItemsMap.values()).map(item => {
        if (trashedItems.includes(item.filename)) {
          return { ...item, isDeleted: true };
        }
        return item;
      });

      res.json({ success: true, data: allItems });
    } catch (err) {
      console.error('Failed to read media directory:', err);
      res.status(500).json({ success: false, error: 'Failed to read media directory' });
    }
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

  app.post('/api/upload', upload.array('files'), (req, res) => {
    if (!req.files || !Array.isArray(req.files)) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }
    const filenames = req.files.map(f => f.filename);
    res.json({ success: true, filenames });
  });


  app.post('/api/analyze-media', upload.array('files'), async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const processedItems = [];
    const freshDb = fs.existsSync(INDEX_FILE) ? JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8')) : [];

    for (const file of req.files) {
      let filePath = file.path;
      const tempFramePath = `${filePath}.jpg`;
      let tempFrameCreated = false;

      const originalExt = path.extname(file.originalname).toLowerCase();
      const isVideo = file.mimetype?.startsWith('video') || ['.mp4', '.mov', '.webm', '.avi'].includes(originalExt);
      let mimeType = file.mimetype || 'image/jpeg';

      let realExif: any = {};
      let videoMeta: any = undefined;
      if (!isVideo) {
        try {
          realExif = await exifr.parse(filePath, { tiff: true, xmp: true, icc: true, gps: true }) || {};
        } catch (e) {
          console.warn(`EXIF parse error (${originalExt} may not support EXIF):`, (e as any)?.message);
          realExif = {};
        }
      } else {
        try {
          const ffprobeRaw = execFileSync(ffprobeStatic.path, ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath]).toString();
          const ffprobeData = JSON.parse(ffprobeRaw);

          const tags = { ...(ffprobeData?.streams?.[0]?.tags || {}), ...(ffprobeData?.format?.tags || {}) };
          const creationTime = tags.creation_time;

          let parsedLat = undefined;
          let parsedLon = undefined;
          const locationStr = tags['com.apple.quicktime.location.ISO6709'] || tags.location;

          if (locationStr) {
            const match = locationStr.match(/([+-]\d+\.\d+)([+-]\d+\.\d+)/);
            if (match) {
              parsedLat = parseFloat(match[1]);
              parsedLon = parseFloat(match[2]);
            }
          }

          if (creationTime || tags.make || tags.model || parsedLat !== undefined) {
            realExif = {
              DateTimeOriginal: creationTime,
              Make: tags.make,
              Model: tags.model,
              latitude: parsedLat,
              longitude: parsedLon
            };
          }

          const durationSeconds = ffprobeData?.format?.duration ? parseFloat(ffprobeData.format.duration) : 0;
          const mins = Math.floor(durationSeconds / 60);
          const secs = Math.floor(durationSeconds % 60);
          const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;

          let codecName = ffprobeData?.streams?.find((s: any) => s.codec_type === 'video')?.codec_name;
          if (codecName === 'hevc') codecName = 'HEVC (H.265)';
          else if (codecName === 'h264') codecName = 'H.264';
          else if (codecName) codecName = codecName.toUpperCase();
          else codecName = 'Unknown Video Codec';

          const audioStream = ffprobeData?.streams?.find((s: any) => s.codec_type === 'audio');
          let audioCodec = audioStream?.codec_name ? audioStream.codec_name.toUpperCase() : 'No Audio';
          if (audioStream?.bit_rate) {
            audioCodec += ` ${Math.round(parseInt(audioStream.bit_rate) / 1000)}kbps`;
          }

          const bitrate = ffprobeData?.format?.bit_rate ? `${(parseInt(ffprobeData.format.bit_rate) / 1000000).toFixed(1)} Mbps` : 'Unknown Mbps';
          const videoStream = ffprobeData?.streams?.find((s: any) => s.codec_type === 'video');
          let fpsStr: number | string = 30;
          if (videoStream?.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split('/');
            if (den && num && parseInt(den) > 0) {
              fpsStr = Math.round(parseInt(num) / parseInt(den));
            }
          }

          videoMeta = {
            duration: durationStr,
            durationSeconds,
            codec: codecName,
            bitrate: bitrate,
            frameRate: fpsStr,
            audioCodec,
            hwTranscode: 'NVENC Active'
          };
        } catch (err: any) {
          console.warn('ffprobe metadata extraction failed:', err?.message);
        }
      }

      // Deduplication check
      const isDup = freshDb.find((item: any) => item.title === file.originalname && (item.originalSize === file.size || item.size === file.size || item.exif?.sizeBytes === file.size));
      if (isDup) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        processedItems.push(isDup);
        continue;
      }

      let realLocationName = "Unknown Location";
      let locationObj: any = undefined;
      let previewUrl: string | undefined = undefined;
      let originalHeicUrl: string | undefined = undefined;
      const aiProcessLogs: string[] = [];

      if (!isVideo && realExif && realExif.latitude !== undefined && realExif.longitude !== undefined) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${realExif.latitude}&lon=${realExif.longitude}`, {
            headers: { 'User-Agent': 'MediaVault-App/1.0' }
          });
          if (geoRes.ok) {
            const geoData: any = await geoRes.json();
            realLocationName = geoData.address?.city || geoData.address?.town || geoData.address?.suburb || geoData.address?.county || geoData.address?.state || geoData.address?.country || "Known Location";
          }
        } catch (e) {
          console.error("Geocoding failed", e);
        }
        locationObj = {
          name: realLocationName,
          city: '',
          country: '',
          latitude: realExif.latitude,
          longitude: realExif.longitude
        };
      } else if (realLocationName && realLocationName !== "Unknown Location") {
        locationObj = { name: realLocationName };
      }

      const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : ({ size: file.size, birthtimeMs: Date.now(), mtimeMs: Date.now() } as any);
      const clientDateMs = req.body.clientDates ? parseInt(req.body.clientDates, 10) : undefined;
      const dateInfo = extractRealDate(realExif, stat, clientDateMs);
      const isHeic = ['.heic', '.heif'].includes(originalExt);

      if (isHeic) {
        try {
          const vaultDir = path.join(mediaDir, 'heic_originals');
          if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });

          const safeHeicPath = path.join(vaultDir, `${Date.now()}-${sanitizeUploadName(file.originalname)}`);
          fs.copyFileSync(filePath, safeHeicPath);

          const jpgBufferWithExif = await convertHeicToJpegWithExif(filePath, 0.88);
          const newJpgPath = filePath.replace(/\.(heic|heif)$/i, '.jpg');
          fs.writeFileSync(newJpgPath, jpgBufferWithExif);
          fs.unlinkSync(filePath);

          filePath = newJpgPath;
          file.filename = file.filename.replace(/\.(heic|heif)$/i, '.jpg');
          file.mimetype = 'image/jpeg';
          mimeType = 'image/jpeg';

          try {
            const freshExif = await exifr.parse(filePath, { tiff: true, xmp: true, icc: true, gps: true });
            if (freshExif) realExif = { ...realExif, ...freshExif };
          } catch (e) { }

          originalHeicUrl = `/media/heic_originals/${path.basename(safeHeicPath)}`;
        } catch (heicErr: any) {
          console.error('Fatal error converting HEIC:', heicErr);
          continue;
        }
      }

      try {
        let base64Data = '';
        if (!isVideo) {
          base64Data = fs.readFileSync(filePath).toString('base64');
        } else {
          try {
            // execFile passes arguments without a shell, so filenames can't inject commands.
            const execFileAsync = util.promisify(execFile);
            try {
              // Try extracting at 1 second
              await execFileAsync(ffmpegPath as unknown as string, ['-y', '-ss', '00:00:01', '-i', filePath, '-vframes', '1', tempFramePath]);
            } catch (err) {
              // Fallback to 0 seconds if video is too short
              await execFileAsync(ffmpegPath as unknown as string, ['-y', '-ss', '00:00:00', '-i', filePath, '-vframes', '1', tempFramePath]);
            }
            if (fs.existsSync(tempFramePath)) {
              const stat = fs.statSync(tempFramePath);
              console.log(`[FFmpeg] Frame extracted: ${tempFramePath} (${stat.size} bytes)`);
              if (stat.size > 0) {
                tempFrameCreated = true;
                const buffer = await fs.promises.readFile(tempFramePath);
                base64Data = buffer.toString('base64');
                console.log(`[FFmpeg→AI] Buffer ready: ${buffer.length} bytes, base64 length: ${base64Data.length}`);
                mimeType = 'image/jpeg';
              } else {
                console.warn('[FFmpeg] Frame file exists but is 0 bytes — FFmpeg may have failed silently.');
              }
            } else {
              console.warn('[FFmpeg] Frame file does not exist after extraction:', tempFramePath);
            }
          } catch (ffmpegErr: any) {
            console.error('[FFmpeg] Frame extraction failed:', ffmpegErr?.message);
          }
        }

        let metadata: any = {
          tags: ['uploaded'],
          type: isVideo ? 'video' : 'image',
          detectedObjects: [],
          ocrText: '',
          exif: { camera: '', lens: '', aperture: '', shutter: '', iso: 0 }
        };

        // Hybrid AI: Qwen3-VL on the self-managed llama.cpp runtime (vision + OCR)
        const analysisImagePath = tempFrameCreated ? tempFramePath : filePath;
        try {
          if (isVideo && !base64Data) {
            console.warn('[AI] Skipping vision analysis for video — no frame data available.');
          } else {
            console.log(`[AI] Sending to analyzeMediaHybrid: isVideo=${isVideo}, base64 length=${base64Data.length}, path=${analysisImagePath}`);
            const hybridResult = await analyzeMediaHybrid(analysisImagePath, base64Data);
            metadata.detectedObjects = hybridResult.detectedObjects;
            metadata.tags = hybridResult.tags;
            metadata.type = isVideo ? 'video' : hybridResult.type;
            if (hybridResult.ocrText && hybridResult.ocrText.length > 0) {
              metadata.ocrText = hybridResult.ocrText;
              metadata.ocr = hybridResult.ocrText;
              metadata.ocrData = {
                documentType: 'Note',
                extractedText: hybridResult.ocrText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
              };
            }
            aiProcessLogs.push(`[QWEN-VL] Vision engine detected ${hybridResult.detectedObjects.length} objects and extracted OCR text.`);
          }
        } catch (aiErr: any) {
          console.warn('Hybrid AI analysis failed, using fallback metadata:', aiErr?.message);
        }

        if (tempFrameCreated && fs.existsSync(tempFramePath)) {
          fs.promises.unlink(tempFramePath).catch(e => console.warn('Failed to cleanup temp frame:', e));
        }

        const forbiddenTags = ['binary', 'data', 'hexadecimal', 'text', 'code', 'smartphone', 'digital', 'format', 'noise', 'artifact', 'corruption', 'error', 'glitch'];
        if (metadata.tags && Array.isArray(metadata.tags)) {
          metadata.tags = metadata.tags.filter((tag: string) => !forbiddenTags.some(forbidden => tag.toLowerCase().includes(forbidden)));
          if (metadata.tags.length === 0) metadata.tags = ['image', 'photo'];
        }

        const formattedExif = formatExifData(realExif, { size: file.size } as fs.Stats, isHeic ? 'HEIC' : (file.originalname.split('.').pop() || 'JPEG'), dateInfo.dateTaken, metadata.exif);
        const orientation = realExif?.Orientation || 1;

        const newItem = {
          id: `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          filename: file.filename,
          title: file.originalname,
          path: filePath,
          url: `/media/${file.filename}`,
          thumbnailUrl: `/media/${file.filename}`,
          previewUrl,
          type: isVideo ? 'video' : (metadata.type || 'image'),
          tags: metadata.tags || ['uploaded'],
          detectedObjects: metadata.detectedObjects || [],
          ocrText: metadata.ocrText,
          ocr: metadata.ocrText,
          ocrData: metadata.ocrData,
          exifData: realExif,
          exif: formattedExif,
          location: locationObj,
          originalHeicUrl,
          originalSize: file.size,
          date: dateInfo.date,
          dateFormatted: dateInfo.dateFormatted,
          orientation,
          videoMeta
        };

        freshDb.push(newItem);
        processedItems.push(newItem);

      } catch (err: any) {
        console.warn('AI analysis fallback triggered:', err?.message || err);
        const formattedExif = formatExifData(realExif, { size: file.size } as fs.Stats, isHeic ? 'HEIC' : (file.originalname.split('.').pop() || 'JPEG'), dateInfo.dateTaken);

        const newItem = {
          id: `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          filename: file.filename,
          title: file.originalname,
          path: filePath,
          url: `/media/${file.filename}`,
          thumbnailUrl: `/media/${file.filename}`,
          previewUrl,
          location: locationObj,
          originalHeicUrl,
          originalSize: file.size,
          date: dateInfo.date,
          dateFormatted: dateInfo.dateFormatted,
          type: isVideo ? 'video' : 'image',
          tags: ['image', 'photo'],
          detectedObjects: [],
          ocrText: '',
          exifData: realExif,
          exif: formattedExif,
          orientation: realExif?.Orientation || 1,
          videoMeta
        };

        freshDb.push(newItem);
        processedItems.push(newItem);
      }
    }

    fs.writeFileSync(INDEX_FILE, JSON.stringify(freshDb, null, 2));
    res.json({ success: true, items: processedItems });
  });

  app.post('/api/media/trash', (req, res) => {
    const filenames = readFilenames(req, res);
    if (!filenames) return;
    let trashed = getTrashIndex();
    for (const f of filenames) {
      if (!trashed.includes(f)) trashed.push(f);
    }
    saveTrashIndex(trashed);
    audit(req.user!.email, 'trash', filenames);
    res.json({ success: true, message: 'Trashed' });
  });

  app.post('/api/media/restore', (req, res) => {
    const filenames = readFilenames(req, res);
    if (!filenames) return;
    let trashed = getTrashIndex();
    trashed = trashed.filter(f => !filenames.includes(f));
    saveTrashIndex(trashed);
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

    const indexedItems = getLibraryIndex();
    const existingIdx = indexedItems.findIndex(i => i.filename === filename);
    if (existingIdx !== -1) {
      indexedItems[existingIdx] = { ...indexedItems[existingIdx], ...changes };
    } else {
      // Uploads listed from media_uploads but not indexed yet get a server-built entry.
      const storedPath = path.join(mediaDir, filename);
      if (!fs.existsSync(storedPath)) return res.status(404).json({ success: false, error: 'Not found' });
      indexedItems.push({
        ...changes,
        id: typeof updatedItem.id === 'string' ? updatedItem.id.slice(0, 120) : `upload-${Date.now()}`,
        filename,
        path: storedPath,
        url: `/media/${filename}`,
        thumbnailUrl: `/media/${filename}`,
      });
    }

    saveLibraryIndex(indexedItems);
    res.json({ success: true, message: 'Updated successfully' });
  });

  /** Removes items from disk (media_uploads only), the index and the trash list, then audits it. */
  const deleteItems = (email: string, action: string, filenames: string[]) => {
    const indexedItems = getLibraryIndex();
    const deleted: string[] = [];
    const indexOnly: string[] = [];
    for (const f of filenames) {
      const item = indexedItems.find(i => i.filename === f);
      try {
        const result = deleteStoredFiles(f, item);
        if (result === 'deleted') deleted.push(f);
        if (result === 'index-only') indexOnly.push(f);
      } catch (e) {
        console.error(`Failed to delete ${f}:`, e);
      }
    }
    saveLibraryIndex(indexedItems.filter(item => !filenames.includes(item.filename)));
    saveTrashIndex(getTrashIndex().filter(f => !filenames.includes(f)));
    audit(email, action, filenames, indexOnly.length ? `kept originals: ${JSON.stringify(indexOnly)}` : '');
    return { deleted, indexOnly };
  };

  app.delete('/api/media/trash/empty', (req, res) => {
    try {
      const trashedFilenames = getTrashIndex().filter(f => {
        try {
          safeFilename(f);
          return true;
        } catch {
          return false;
        }
      });
      const { deleted, indexOnly } = deleteItems(req.user!.email, 'empty-trash', trashedFilenames);
      saveTrashIndex([]);
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

        let indexedItems = getLibraryIndex();
        let indexedCount = 0;
        const supportedExts = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.webm', '.heic', '.webp'];

        for (const file of files) {
          const srcPath = path.join(currentLibraryPath, file);
          try {
            const stat = fs.statSync(srcPath);
            if (stat.isFile()) {
              const ext = path.extname(file).toLowerCase();
              if (supportedExts.includes(ext)) {
                const isVideo = ['.mp4', '.mov', '.webm'].includes(ext);
                let realExif: any = {};
                if (!isVideo) {
                  try {
                    realExif = await exifr.parse(srcPath, { tiff: true, xmp: true, icc: true, gps: true }) || {};
                  } catch (e) { }
                }

                const dateInfo = extractRealDate(realExif, stat);
                const formattedExif = formatExifData(realExif, stat, ext, dateInfo.dateTaken);

                indexedItems = indexedItems.filter(i => i.path !== srcPath && i.filename !== file);

                let lat = undefined;
                let lng = undefined;

                if (realExif.latitude && realExif.longitude) {
                  lat = realExif.latitude;
                  lng = realExif.longitude;
                }

                const id = `media-idx-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                const newItem = {
                  id,
                  title: file,
                  filename: file,
                  path: srcPath,
                  url: `/api/media/${id}/file`,
                  thumbnailUrl: `/api/media/${id}/file`,
                  type: isVideo ? 'video' : 'image',
                  date: dateInfo.date,
                  dateFormatted: dateInfo.dateFormatted,
                  exif: formattedExif,
                  location: lat && lng ? {
                    name: 'GPS Location',
                    city: '',
                    country: '',
                    latitude: lat,
                    longitude: lng
                  } : undefined,
                  tags: ['indexed', isVideo ? 'video' : 'image'],
                  detectedObjects: [],
                  isFavorite: false
                };

                indexedItems.push(newItem);
                indexedCount++;
                scanProgress.logMessages.push(`[INDEX] Indexed ${file}`);
              }
            }
          } catch (e) {
            scanProgress.logMessages.push(`[ERROR] Failed to read ${file}`);
          }
        }

        saveLibraryIndex(indexedItems);
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
    // Boot the local AI runtime in the background; uploads wait for it via analyzeMediaHybrid.
    // AI_AUTOSTART=false defers it to the first upload.
    if (process.env.AI_AUTOSTART !== 'false') {
      startAiRuntime().catch(() => { /* status already logged; retried on next upload */ });
    }
  });
}

startServer().catch(err => {
  // Configuration errors (e.g. AUTH_DISABLED with a public HOST) stop the process before it listens.
  console.error('[STARTUP] ' + (err?.message || err));
  process.exit(1);
});
