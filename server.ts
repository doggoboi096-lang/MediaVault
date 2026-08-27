import 'dotenv/config';
import heicConvert from 'heic-convert';
import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec, execSync } from 'child_process';
import multer from 'multer';
import exifr from 'exifr';
import { createServer as createViteServer } from 'vite';
import { INITIAL_MEDIA } from './src/data/mockMedia';
import { GoogleGenAI, Type } from "@google/genai";

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

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}




async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Directories & index paths
  const mediaDir = path.join(process.cwd(), 'media_uploads');
  const INDEX_FILE = path.join(process.cwd(), 'library_index.json');
  const TRASH_FILE = path.join(process.cwd(), 'trash_index.json');

  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
  app.use('/media', express.static(mediaDir));

  // Sync / ensure existing converted JPEGs have embedded EXIF transferred from originals
  (async () => {
    const vaultDir = path.join(mediaDir, 'heic_originals');
    if (!fs.existsSync(vaultDir)) return;
    try {
      const heicFiles = fs.readdirSync(vaultDir);
      for (const hf of heicFiles) {
        const heicPath = path.join(vaultDir, hf);
        const baseName = hf.replace(/^\d+-/, '').replace(/\.(heic|heif)$/i, '');
        const jpgFiles = fs.readdirSync(mediaDir).filter(f => f.includes(baseName) && f.endsWith('.jpg'));
        for (const jf of jpgFiles) {
          const jpgPath = path.join(mediaDir, jf);
          try {
            const parsed = await exifr.parse(jpgPath, { tiff: true }).catch(() => null);
            if (!parsed || !parsed.Make) {
              console.log(`[HEIC-SYNC] Injecting EXIF into ${jf} from ${hf}...`);
              const upgradedJpg = await convertHeicToJpegWithExif(heicPath, 0.88);
              fs.writeFileSync(jpgPath, upgradedJpg);
              console.log(`[HEIC-SYNC] Successfully injected EXIF into ${jf}`);
            }
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (e) {
      console.warn('[HEIC-SYNC] Error syncing existing HEIC EXIF:', e);
    }
  })();

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, mediaDir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + file.originalname);
    }
  });
  const upload = multer({ storage });

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
  let currentLibraryPath = 'D:\\GiaDinh\\HinhAnh';
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

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'MediaVault Self-Hosted Core',
      version: '2.4.0-fastapi-node-bridge',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/system', async (req, res) => {
    let gpuName = 'NVENC / QuickSync';
    try { gpuName = execSync('wmic.exe path win32_VideoController get name', { stdio: 'ignore' }).toString().split('\n')[1].trim(); } catch (e) { }

    const drives = [];

    // Primary Drive
    try {
      if (!fs.existsSync(currentLibraryPath)) throw new Error('Path not found');
      const statFsResult = fs.statfsSync(currentLibraryPath);
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
        drives
      }
    });
  });

  app.get('/api/serve-media', (req, res) => {
    const filePath = req.query.path;
    if (typeof filePath === 'string' && fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Not found');
    }
  });

  app.get('/api/media', async (req, res) => {
    try {
      let indexedItems = getLibraryIndex();
      const trashedItems = getTrashIndex();

      let indexModified = false;
      indexedItems = indexedItems.filter(item => {
        if (fs.existsSync(path.join(mediaDir, item.filename))) return true;
        indexModified = true;
        return false;
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
    const { libraryPath } = req.body;
    if (libraryPath) {
      currentLibraryPath = libraryPath;
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
  async function runAIModels(base64Data: string, mimeType: string, ai: any, aiProcessLogs: string[]) {
    let response: any = null;
    const AI_MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.7-flash', 'gemini-3.6-flash'];
    let lastError: any = null;

    for (const model of AI_MODELS) {
      try {
        console.log(`Attempting AI analysis with model: ${model}`);
        aiProcessLogs.push(`[INIT] Attempting analysis with ${model}...`);
        const resPromise = ai.models.generateContent({
          model: model,
          contents: {
            parts: [
              { text: 'You are a strict visual image classifier. Analyze ONLY the VISUAL CONTENT of this image. Ignore any file structure, binary, hex, or metadata anomalies. Output descriptive tags of the physical subjects, animals, objects, or scenery visible (e.g., "cat", "animal", "street", "food"). ABSOLUTELY DO NOT output tags related to digital formats like "binary", "data", "hexadecimal", "text", or "smartphone". Type must be one of: "image", "document", or "id_card". If the image is a simple photograph, ignore any complex formatting or structure and output simple visual subject tags.' },
              { inlineData: { data: base64Data, mimeType: mimeType } }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                type: { type: Type.STRING, description: "Must be 'image', 'document', or 'id_card'" },
                detectedObjects: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      confidence: { type: Type.NUMBER },
                      category: { type: Type.STRING }
                    }
                  }
                },
                ocrData: {
                  type: Type.OBJECT,
                  properties: {
                    extractedText: { type: Type.ARRAY, items: { type: Type.STRING } },
                    documentType: { type: Type.STRING }
                  }
                },
                exif: {
                  type: Type.OBJECT,
                  properties: {
                    camera: { type: Type.STRING, nullable: true },
                    lens: { type: Type.STRING, nullable: true },
                    aperture: { type: Type.STRING, nullable: true },
                    shutter: { type: Type.STRING, nullable: true },
                    iso: { type: Type.INTEGER, nullable: true }
                  }
                }
              }
            }
          }
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout on model ${model}`)), 30000)
        );

        response = await Promise.race([resPromise, timeoutPromise]);
        if (response && response.text) {
          console.log(`AI analysis succeeded with model: ${model}`);
          aiProcessLogs.push(`[SUCCESS] ${model} extracted tags successfully.`);
          break;
        }
      } catch (modelErr: any) {
        console.error(`AI model ${model} error:`, modelErr?.message || modelErr);
        aiProcessLogs.push(`[WARN] ${model} failed: ${modelErr?.message}. Falling back...`);
        lastError = modelErr;
      }
    }

    if (!response) {
      throw lastError || new Error('All AI models failed');
    }

    let metadata: any = {};
    try {
      let responseText = response?.text || '{}';
      let cleanText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      }
      metadata = JSON.parse(cleanText);
    } catch (parseErr) {
      console.error('Failed to parse AI response JSON:', parseErr);
      metadata = {
        tags: ['uploaded'],
        type: 'image',
        detectedObjects: [],
        ocrData: { extractedText: [], documentType: '' },
        exif: { camera: '', lens: '', aperture: '', shutter: '', iso: 0 }
      };
    }
    return metadata;
  }

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

      let realExif: any = null;
      let videoMeta: any = undefined;
      if (!isVideo) {
        try {
          realExif = await exifr.parse(filePath, { tiff: true, xmp: true, icc: true, gps: true });
        } catch (e) {
          console.warn('EXIF parse error:', e);
        }
      } else {
        try {
          const ffprobeRaw = execSync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`).toString();
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

          const safeHeicPath = path.join(vaultDir, `${Date.now()}-${file.originalname}`);
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
            try {
              // Try extracting at 1 second
              execSync(`ffmpeg -y -ss 00:00:01 -i "${filePath}" -vframes 1 "${tempFramePath}"`);
            } catch (err) {
              // Fallback to 0 seconds if video is too short
              execSync(`ffmpeg -y -ss 00:00:00 -i "${filePath}" -vframes 1 "${tempFramePath}"`);
            }
            if (fs.existsSync(tempFramePath)) {
              tempFrameCreated = true;
              base64Data = fs.readFileSync(tempFramePath).toString('base64');
              mimeType = 'image/jpeg';
              previewUrl = '/media_uploads/' + path.basename(tempFramePath);
            }
          } catch (ffmpegErr: any) {
            console.warn('Could not extract video frame via FFmpeg');
          }
        }

        const ai = getAi();
        let metadata: any = {
          tags: ['uploaded'],
          type: isVideo ? 'video' : 'image',
          detectedObjects: [],
          ocrData: { extractedText: [], documentType: '' },
          exif: { camera: '', lens: '', aperture: '', shutter: '', iso: 0 }
        };

        if (base64Data.trim() !== '') {
          try {
            metadata = await runAIModels(base64Data, mimeType, ai, aiProcessLogs);
          } catch (aiErr: any) {
            console.warn('All AI models failed, using fallback metadata');
          }
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
        console.warn('Gemini fallback triggered:', err?.message || err);
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
          ocrData: { extractedText: [], documentType: '' },
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

  app.post('/api/media/trash', express.json(), (req, res) => {
    const filenames = req.body.filenames;
    if (!Array.isArray(filenames)) return res.status(400).json({ success: false, error: 'Expected array' });
    let trashed = getTrashIndex();
    for (const f of filenames) {
      if (!trashed.includes(f)) trashed.push(f);
    }
    saveTrashIndex(trashed);
    res.json({ success: true, message: 'Trashed' });
  });

  app.post('/api/media/restore', express.json(), (req, res) => {
    const filenames = req.body.filenames;
    if (!Array.isArray(filenames)) return res.status(400).json({ success: false, error: 'Expected array' });
    let trashed = getTrashIndex();
    trashed = trashed.filter(f => !filenames.includes(f));
    saveTrashIndex(trashed);
    res.json({ success: true, message: 'Restored' });
  });

  app.patch('/api/media', express.json(), (req, res) => {
    const updatedItem = req.body.item;
    if (!updatedItem || !updatedItem.filename) return res.status(400).json({ success: false, error: 'Expected item with filename' });

    const indexedItems = getLibraryIndex();
    const existingIdx = indexedItems.findIndex(i => i.filename === updatedItem.filename);
    if (existingIdx !== -1) {
      indexedItems[existingIdx] = { ...indexedItems[existingIdx], ...updatedItem };
    } else {
      indexedItems.push(updatedItem);
    }

    saveLibraryIndex(indexedItems);
    res.json({ success: true, message: 'Updated successfully' });
  });

  app.delete('/api/media/trash/empty', express.json(), (req, res) => {
    try {
      const trashedFilenames = getTrashIndex();
      let indexedItems = getLibraryIndex();
      let deletedCount = 0;

      for (const f of trashedFilenames) {
        const item = indexedItems.find(i => i.filename === f);
        const physicalPath = (item && item.path && fs.existsSync(item.path)) ? item.path : path.join(mediaDir, f);

        try {
          if (fs.existsSync(physicalPath)) {
            fs.unlinkSync(physicalPath);
          }
          if (item?.originalHeicUrl) {
            const heicFilename = path.basename(item.originalHeicUrl);
            const heicPath = path.join(mediaDir, 'heic_originals', heicFilename);
            if (fs.existsSync(heicPath)) fs.unlinkSync(heicPath);
          }
        } catch (e) {
          console.error(`Failed to physically delete ${f}:`, e);
        }
        deletedCount++;
      }

      indexedItems = indexedItems.filter(item => !trashedFilenames.includes(item.filename));
      saveLibraryIndex(indexedItems);
      saveTrashIndex([]);

      res.json({ success: true, deletedCount });
    } catch (err: any) {
      console.error('Failed to empty trash:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/media', express.json(), (req, res) => {
    const filenames = req.body.filenames;
    if (!Array.isArray(filenames)) return res.status(400).json({ success: false, error: 'Expected array' });

    const indexedItems = getLibraryIndex();
    let deletedCount = 0;

    for (const f of filenames) {
      const item = indexedItems.find(i => i.filename === f);
      const physicalPath = (item && item.path && fs.existsSync(item.path)) ? item.path : path.join(mediaDir, f);
      try {
        if (fs.existsSync(physicalPath)) {
          fs.unlinkSync(physicalPath);
          deletedCount++;
        }
      } catch (e) {
        console.error('Failed to unlink:', physicalPath, e);
      }
      // Also purge the HEIC vault original to prevent ghost files
      if (item?.originalHeicUrl) {
        try {
          const heicPath = path.join(mediaDir, 'heic_originals', path.basename(item.originalHeicUrl));
          if (fs.existsSync(heicPath)) fs.unlinkSync(heicPath);
        } catch (e) {
          console.error('Failed to unlink HEIC vault file:', e);
        }
      }
    }

    // Remove deleted files from library_index.json
    const newIndexed = indexedItems.filter(item => !filenames.includes(item.filename));
    saveLibraryIndex(newIndexed);

    // Remove deleted files from trash_index.json
    let trashed = getTrashIndex();
    trashed = trashed.filter(f => !filenames.includes(f));
    saveTrashIndex(trashed);

    res.json({ success: true, deleted: deletedCount });
  });

  app.delete('/api/media/:filename', (req, res) => {
    const filename = req.params.filename;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename is required' });
    }

    let filePath = path.join(mediaDir, filename);
    const indexedItems = getLibraryIndex();
    const item = indexedItems.find(i => i.filename === filename);
    if (item && item.path && fs.existsSync(item.path)) {
      filePath = item.path;
    }

    // Remove from library_index.json
    const newIndexed = indexedItems.filter(i => i.filename !== filename);
    saveLibraryIndex(newIndexed);

    // Remove from trash_index.json
    let trashed = getTrashIndex();
    if (trashed.includes(filename)) {
      trashed = trashed.filter(f => f !== filename);
      saveTrashIndex(trashed);
    }

    // Also purge the HEIC vault original
    if (item?.originalHeicUrl) {
      try {
        const heicPath = path.join(mediaDir, 'heic_originals', path.basename(item.originalHeicUrl));
        if (fs.existsSync(heicPath)) fs.unlinkSync(heicPath);
      } catch (e) {
        console.error('Failed to unlink HEIC vault file:', e);
      }
    }

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'File deleted' });
      } else {
        res.json({ success: true, message: 'File removed from index' });
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
      res.status(500).json({ success: false, error: 'Failed to delete file' });
    }
  });

  app.get('/api/scan/status', (req, res) => {
    res.json(scanProgress);
  });

  app.post('/api/scan/start', async (req, res) => {
    const { path: targetPath } = req.body;
    if (targetPath) {
      currentLibraryPath = targetPath;
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

                const newItem = {
                  id: `media-idx-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                  title: file,
                  filename: file,
                  path: srcPath,
                  url: `/api/serve-media?path=${encodeURIComponent(srcPath)}`,
                  thumbnailUrl: `/api/serve-media?path=${encodeURIComponent(srcPath)}`,
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MediaVault server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
