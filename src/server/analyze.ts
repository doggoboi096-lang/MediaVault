/**
 * analyze.ts — The slow part, run by the background worker one item at a time:
 * reverse-geocode the GPS position, then tag + OCR with Qwen3-VL (several frames
 * for videos). Returns the fields to merge into the media row.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import util from 'util';
import { execFile } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import type { DetectedObject, MediaItem } from '../types';
import { analyzeMediaHybrid, type VisionAnalysisResult } from '../services/local_ai';
import { startAiRuntime } from '../services/ai_runtime';
import { HEIC_EXTS, convertHeicToJpegWithExif } from './ingest';

/** The AI runtime isn't up (still downloading, crashed…). The job waits instead of burning an attempt. */
export class AiUnavailableError extends Error {}

const execFileAsync = util.promisify(execFile);

// Tags the model emits for screenshots of binary data or broken images; never useful for search.
const FORBIDDEN_TAGS = ['binary', 'data', 'hexadecimal', 'text', 'code', 'smartphone', 'digital', 'format', 'noise', 'artifact', 'corruption', 'error', 'glitch'];

// ── Reverse geocoding (OpenStreetMap Nominatim: max 1 request/second) ──────
const placeCache = new Map<string, string | null>();
let lastGeocodeAt = 0;

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (placeCache.has(key)) return placeCache.get(key)!;

  const wait = lastGeocodeAt + 1100 - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastGeocodeAt = Date.now();
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
      headers: { 'User-Agent': 'MediaVault-App/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const geo: any = await res.json();
    const a = geo.address || {};
    const name = a.city || a.town || a.suburb || a.county || a.state || a.country || null;
    placeCache.set(key, name);
    return name;
  } catch (e: any) {
    console.warn('[GEO] Reverse geocoding failed:', e?.message || e);
    return null; // not cached: retried on the next analysis
  }
}

// ── Video frames ────────────────────────────────────────────────────────────
async function extractFrames(videoPath: string, durationSeconds: number, outDir: string): Promise<string[]> {
  const times = durationSeconds > 2 ? [0.15, 0.5, 0.85].map(f => f * durationSeconds) : [0];
  const frames: string[] = [];
  for (const [i, t] of times.entries()) {
    const out = path.join(outDir, `frame-${i}.jpg`);
    try {
      await execFileAsync(ffmpegPath as unknown as string, ['-y', '-ss', t.toFixed(2), '-i', videoPath, '-frames:v', '1', '-q:v', '3', out]);
      if (fs.existsSync(out) && fs.statSync(out).size > 0) frames.push(out);
    } catch (e: any) {
      console.warn(`[FFmpeg] Frame at ${t.toFixed(1)}s failed:`, e?.message);
    }
  }
  return frames;
}

// ── Merging per-frame results ───────────────────────────────────────────────
function mergeResults(results: VisionAnalysisResult[]) {
  const tags: string[] = [];
  const seenTags = new Set<string>();
  for (const tag of results.flatMap(r => r.tags)) {
    const key = String(tag).toLowerCase().trim();
    if (!key || seenTags.has(key) || FORBIDDEN_TAGS.some(f => key.includes(f))) continue;
    seenTags.add(key);
    tags.push(tag);
  }

  const objects = new Map<string, DetectedObject>();
  for (const obj of results.flatMap(r => r.detectedObjects)) {
    const prev = objects.get(obj.label);
    if (!prev || obj.confidence > prev.confidence) objects.set(obj.label, obj as DetectedObject);
  }

  const ocrLines: string[] = [];
  for (const line of results.flatMap(r => (r.ocrText || '').split('\n'))) {
    const trimmed = line.trim();
    if (trimmed && !ocrLines.includes(trimmed)) ocrLines.push(trimmed);
  }

  return {
    tags: tags.length ? tags : ['image', 'photo'],
    detectedObjects: [...objects.values()],
    ocrText: ocrLines.join('\n'),
    isDocument: results.some(r => r.type === 'document'),
  };
}

// ── Job ─────────────────────────────────────────────────────────────────────
export async function processMedia(item: MediaItem, opts: { mediaDir: string }): Promise<Partial<MediaItem>> {
  const patch: Partial<MediaItem> = {};

  // 1. Place name for photos with GPS but no name yet
  const loc = item.location;
  if (loc?.latitude && loc?.longitude && (!loc.name || loc.name === 'GPS Location' || loc.name === 'Unknown Location')) {
    const name = await reverseGeocode(loc.latitude, loc.longitude);
    if (name) patch.location = { ...loc, name };
  }

  // 2. Vision + OCR
  try {
    await startAiRuntime();
  } catch (err: any) {
    throw new AiUnavailableError(err?.message || 'AI runtime unavailable');
  }

  if (!fs.existsSync(item.path)) throw new Error('file not found on disk');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mv-ai-'));
  try {
    let sources: string[];
    if (item.type === 'video') {
      sources = await extractFrames(item.path, item.videoMeta?.durationSeconds || 0, tmpDir);
      if (!sources.length) throw new Error('no frames could be extracted from the video');
    } else if (HEIC_EXTS.includes(path.extname(item.path).toLowerCase())) {
      // Scanned HEIC originals: the vision pipeline needs a JPEG.
      const jpgPath = path.join(tmpDir, 'converted.jpg');
      fs.writeFileSync(jpgPath, await convertHeicToJpegWithExif(item.path));
      sources = [jpgPath];
    } else {
      sources = [item.path];
    }

    const results: VisionAnalysisResult[] = [];
    for (const src of sources) {
      results.push(await analyzeMediaHybrid(src, fs.readFileSync(src).toString('base64')));
    }
    // analyzeVisionQwen reports failures as an 'unprocessed' tag instead of throwing; retry those.
    if (results.every(r => r.tags.includes('unprocessed'))) throw new Error('vision analysis returned no result');

    const merged = mergeResults(results);
    patch.tags = merged.tags;
    patch.detectedObjects = merged.detectedObjects;
    patch.type = item.type === 'video' ? 'video' : merged.isDocument ? 'document' : 'image';
    if (merged.ocrText) {
      patch.ocrText = merged.ocrText;
      patch.ocr = merged.ocrText;
      patch.ocrData = { documentType: 'Note', extractedText: merged.ocrText.split('\n') };
    } else {
      patch.ocrText = '';
      patch.ocr = '';
      patch.ocrData = undefined;
    }

    // Keep the middle frame as the video poster.
    if (item.type === 'video') {
      const posterDir = path.join(opts.mediaDir, 'previews');
      fs.mkdirSync(posterDir, { recursive: true });
      const poster = path.join(posterDir, `${item.id}.jpg`);
      fs.copyFileSync(sources[Math.floor(sources.length / 2)], poster);
      patch.previewUrl = `/media/previews/${item.id}.jpg`;
    }
    return patch;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
