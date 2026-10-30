/**
 * ingest.ts — The fast part of adding media: store the file, read EXIF / ffprobe
 * metadata, convert HEIC, build the MediaItem. No AI and no network here, so an
 * upload returns in seconds; tagging happens later in the background queue.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import heicConvert from 'heic-convert';
import exifr from 'exifr';
import ffprobeStatic from 'ffprobe-static';
import type { MediaItem, VideoMetadata } from '../types';
import { findDuplicate, getMediaByFilename, insertMedia, listMedia, removeMedia } from './db';
import { isInside, sanitizeUploadName } from './safePath';

export const SUPPORTED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.webm', '.heic', '.webp'];
export const VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.avi'];
export const HEIC_EXTS = ['.heic', '.heif'];

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
        ['heic', 'heix', 'mif1', 'msf1', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'miaf', 'MiHB', 'MiHA', 'MiHE', 'MiPr', 'tmap'].some(b =>
          compatibleBrands.includes(b)
        )
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
      return compatibleBrands.includes(this.type) || ['avif', 'avis', 'mif1'].some(b => compatibleBrands.includes(b));
    };
  }
} catch (patchErr) {
  console.warn('Could not patch exifr parsers:', patchErr);
}

// ── Metadata helpers ────────────────────────────────────────────────────────
export function extractRealDate(realExif: any, stat: Pick<fs.Stats, 'birthtimeMs' | 'mtimeMs' | 'ctimeMs'>, clientDateMs?: number) {
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
    dateTaken: realDateIso.replace('T', ' ').substring(0, 19),
  };
}

export function formatExifData(realExif: any, stat: { size: number }, ext: string, dateTaken: string, metadataExif: any = {}) {
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
    camera: realExif?.Make ? `${realExif.Make} ${realExif.Model || ''}`.trim() : metadataExif?.camera || '',
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
    format: ext.toUpperCase().replace('.', ''),
  };
}

export async function convertHeicToJpegWithExif(heicBufferOrPath: Buffer | string, quality = 0.88): Promise<Buffer> {
  const heicBuf = typeof heicBufferOrPath === 'string' ? fs.readFileSync(heicBufferOrPath) : heicBufferOrPath;
  const rawJpg = await heicConvert({ buffer: heicBuf, format: 'JPEG', quality });
  return Buffer.from(rawJpg);
}

export async function readImageExif(filePath: string): Promise<any> {
  return (await exifr.parse(filePath, { tiff: true, xmp: true, icc: true, gps: true }).catch(() => null)) || {};
}

/** Reads container tags (date, camera, GPS) and stream details with ffprobe. */
export function probeVideo(filePath: string): { realExif: any; videoMeta?: VideoMetadata } {
  try {
    const raw = execFileSync(ffprobeStatic.path, ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath]).toString();
    const probe = JSON.parse(raw);
    const tags = { ...(probe?.streams?.[0]?.tags || {}), ...(probe?.format?.tags || {}) };

    let latitude: number | undefined;
    let longitude: number | undefined;
    const locationStr = tags['com.apple.quicktime.location.ISO6709'] || tags.location;
    const match = typeof locationStr === 'string' ? locationStr.match(/([+-]\d+\.\d+)([+-]\d+\.\d+)/) : null;
    if (match) {
      latitude = parseFloat(match[1]);
      longitude = parseFloat(match[2]);
    }
    const realExif =
      tags.creation_time || tags.make || tags.model || latitude !== undefined
        ? { DateTimeOriginal: tags.creation_time, Make: tags.make, Model: tags.model, latitude, longitude }
        : {};

    const durationSeconds = probe?.format?.duration ? parseFloat(probe.format.duration) : 0;
    const videoStream = probe?.streams?.find((s: any) => s.codec_type === 'video');
    const audioStream = probe?.streams?.find((s: any) => s.codec_type === 'audio');

    let codec = videoStream?.codec_name;
    if (codec === 'hevc') codec = 'HEVC (H.265)';
    else if (codec === 'h264') codec = 'H.264';
    else codec = codec ? codec.toUpperCase() : 'Unknown Video Codec';

    let audioCodec = audioStream?.codec_name ? audioStream.codec_name.toUpperCase() : 'No Audio';
    if (audioStream?.bit_rate) audioCodec += ` ${Math.round(parseInt(audioStream.bit_rate) / 1000)}kbps`;

    let frameRate = 30;
    if (videoStream?.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split('/');
      if (den && num && parseInt(den) > 0) frameRate = Math.round(parseInt(num) / parseInt(den));
    }

    return {
      realExif,
      videoMeta: {
        duration: `${Math.floor(durationSeconds / 60)}:${Math.floor(durationSeconds % 60).toString().padStart(2, '0')}`,
        durationSeconds,
        codec,
        bitrate: probe?.format?.bit_rate ? `${(parseInt(probe.format.bit_rate) / 1000000).toFixed(1)} Mbps` : 'Unknown Mbps',
        frameRate,
        audioCodec,
        hwTranscode: 'NVENC Active',
      },
    };
  } catch (err: any) {
    console.warn('ffprobe metadata extraction failed:', err?.message);
    return { realExif: {} };
  }
}

const newUploadId = () => `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`;

const gpsLocation = (realExif: any) =>
  realExif?.latitude !== undefined && realExif?.longitude !== undefined && realExif.latitude !== null
    ? { name: 'GPS Location', city: '', country: '', latitude: realExif.latitude, longitude: realExif.longitude }
    : undefined;

// ── Uploads ─────────────────────────────────────────────────────────────────
/**
 * Turns a file multer just stored in media_uploads into a MediaItem (not yet saved).
 * Duplicates (same original name and size) are deleted and the existing item returned.
 */
export async function ingestUpload(
  file: Express.Multer.File,
  opts: { mediaDir: string; clientDateMs?: number }
): Promise<{ item: MediaItem; duplicate: boolean }> {
  const duplicate = findDuplicate(file.originalname, file.size);
  if (duplicate) {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    return { item: duplicate, duplicate: true };
  }

  let filePath = file.path;
  let filename = file.filename;
  const originalExt = path.extname(file.originalname).toLowerCase();
  const isVideo = file.mimetype?.startsWith('video') || VIDEO_EXTS.includes(originalExt);
  const isHeic = HEIC_EXTS.includes(originalExt);

  let realExif: any = {};
  let videoMeta: VideoMetadata | undefined;
  if (isVideo) {
    ({ realExif, videoMeta } = probeVideo(filePath));
  } else {
    realExif = await readImageExif(filePath);
  }

  const stat = fs.statSync(filePath);
  const dateInfo = extractRealDate(realExif, stat, opts.clientDateMs && opts.clientDateMs > 0 ? opts.clientDateMs : undefined);

  // Browsers can't show HEIC: keep the original in the vault, serve a JPEG.
  let originalHeicUrl: string | undefined;
  if (isHeic) {
    const vaultDir = path.join(opts.mediaDir, 'heic_originals');
    fs.mkdirSync(vaultDir, { recursive: true });
    const safeHeicPath = path.join(vaultDir, `${Date.now()}-${sanitizeUploadName(file.originalname)}`);
    fs.copyFileSync(filePath, safeHeicPath);

    const jpg = await convertHeicToJpegWithExif(filePath, 0.88);
    const jpgPath = filePath.replace(/\.(heic|heif)$/i, '.jpg');
    fs.writeFileSync(jpgPath, jpg);
    fs.unlinkSync(filePath);
    filePath = jpgPath;
    filename = filename.replace(/\.(heic|heif)$/i, '.jpg');
    realExif = { ...realExif, ...(await readImageExif(filePath)) };
    originalHeicUrl = `/media/heic_originals/${path.basename(safeHeicPath)}`;
  }

  const item: MediaItem = {
    id: newUploadId(),
    filename,
    title: file.originalname,
    path: filePath,
    url: `/media/${filename}`,
    thumbnailUrl: `/media/${filename}`,
    type: isVideo ? 'video' : 'image',
    tags: [],
    detectedObjects: [],
    exif: formatExifData(realExif, { size: file.size }, isHeic ? 'HEIC' : originalExt || '.jpg', dateInfo.dateTaken) as any,
    location: gpsLocation(realExif),
    originalHeicUrl,
    originalSize: file.size,
    date: dateInfo.date,
    dateFormatted: dateInfo.dateFormatted,
    videoMeta,
    ...({ exifData: realExif, orientation: realExif?.Orientation || 1 } as object),
  };
  return { item, duplicate: false };
}

// ── Startup sync ────────────────────────────────────────────────────────────
/**
 * Brings media_uploads and the database in line at startup: files dropped into the folder
 * by hand are registered (AI pending), and uploads whose file is gone are removed.
 * Scanned items are left alone even if their drive is offline.
 */
export async function syncUploadsFolder(mediaDir: string): Promise<string[]> {
  const missing = listMedia()
    .filter(i => isInside(i.path, mediaDir) && !fs.existsSync(i.path))
    .map(i => i.filename);
  if (missing.length) {
    removeMedia(missing);
    console.log(`[DB] Removed ${missing.length} uploads whose file no longer exists`);
  }

  const added: string[] = [];
  for (const file of fs.readdirSync(mediaDir)) {
    const ext = path.extname(file).toLowerCase();
    const filePath = path.join(mediaDir, file);
    if (!SUPPORTED_EXTS.includes(ext) || getMediaByFilename(file) || !fs.statSync(filePath).isFile()) continue;
    const isVideo = VIDEO_EXTS.includes(ext);
    const stat = fs.statSync(filePath);
    const { realExif, videoMeta } = isVideo ? probeVideo(filePath) : { realExif: await readImageExif(filePath), videoMeta: undefined };
    const dateInfo = extractRealDate(realExif, stat);
    const saved = insertMedia(
      {
        id: newUploadId(),
        title: file,
        filename: file,
        path: filePath,
        url: `/media/${file}`,
        thumbnailUrl: `/media/${file}`,
        type: isVideo ? 'video' : 'image',
        date: dateInfo.date,
        dateFormatted: dateInfo.dateFormatted,
        exif: formatExifData(realExif, stat, ext, dateInfo.dateTaken) as any,
        location: gpsLocation(realExif),
        tags: [],
        detectedObjects: [],
        originalSize: stat.size,
        videoMeta,
      },
      { source: 'upload', aiStatus: 'pending' }
    );
    added.push(saved.id);
  }
  if (added.length) console.log(`[DB] Registered ${added.length} files found in media_uploads`);
  return added;
}
