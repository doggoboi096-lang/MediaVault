/**
 * local_ai.ts — Unified Local AI Pipeline (Qwen3-VL 4B)
 *
 * All vision understanding, tagging, object detection, and high-fidelity
 * Vietnamese/multilingual OCR text extraction are unified into Qwen3-VL 4B via Ollama.
 *
 * Single entry-point: analyzeMediaHybrid(imagePath, base64Image)
 */

import sharp from 'sharp';

// ── Ollama config ───────────────────────────────────────────────────────────
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3-vl:4b-instruct';

// ── Interfaces ──────────────────────────────────────────────────────────────
export interface DetectedObjectLocal {
  id: string;
  label: string;
  confidence: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
  category: 'object' | 'person' | 'vehicle' | 'nature' | 'document' | 'text';
}

export interface VisionAnalysisResult {
  tags: string[];
  detectedObjects: DetectedObjectLocal[];
  ocrText: string;
  ocr?: string; // Mapped for direct frontend access
  type: 'image' | 'document';
}

// ── Qwen-VL: Visual tagging + object detection ──────────────────────────────
export async function analyzeVisionQwen(imageBuffer: Buffer): Promise<{
  tags: string[];
  detectedObjects: DetectedObjectLocal[];
}> {
  if (!imageBuffer || imageBuffer.length === 0) {
    console.warn('[QWEN-VL] Skipping analysis — empty input buffer.');
    return { tags: ['unprocessed'], detectedObjects: [] };
  }
  try {
    const resizedBuffer = await sharp(imageBuffer)
      .resize({ width: 1024, height: 1024, fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64Image = resizedBuffer.toString('base64');

    const payload = {
      model: OLLAMA_MODEL,
      format: 'json',
      messages: [
        {
          role: 'user',
          content:
            'Analyze this image visually. Output a valid JSON object with exactly 2 keys: "tags" (array of descriptive string tags about the scene, subjects, and context) and "detectedObjects" (array of {label, confidence} objects for things you can see). Do NOT extract or include any text/OCR content.',
          images: [base64Image],
        },
      ],
      stream: false,
      options: {
        num_ctx: 8192,
        num_predict: 1024,
        temperature: 0.1,
        repeat_penalty: 1.05,
      },
    };

    const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    let textOutput = data.message?.content || '{}';

    // Extract JSON core, ignore markdown wrapping
    const firstBrace = textOutput.indexOf('{');
    const lastBrace = textOutput.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      textOutput = textOutput.substring(firstBrace, lastBrace + 1);
    }

    let parsed: any;
    try {
      parsed = JSON.parse(textOutput);
    } catch (parseErr) {
      // Truncated JSON recovery
      console.warn('[QWEN-VL] JSON parse failed, attempting truncated recovery...');
      const suffixes = ['"}', '"]}', '"]}', '"]}}', '}'];
      let recovered = false;
      for (const suffix of suffixes) {
        try {
          parsed = JSON.parse(textOutput + suffix);
          console.info('[QWEN-VL] Recovered truncated JSON with suffix:', suffix);
          recovered = true;
          break;
        } catch (_) {
          /* try next suffix */
        }
      }
      if (!recovered) {
        console.error('[QWEN-VL] All JSON recovery attempts failed. Raw:', textOutput.substring(0, 200));
        return { tags: ['image', 'unprocessed'], detectedObjects: [] };
      }
    }

    // Normalize detectedObjects array to prevent UI crashes
    const detectedObjects = (Array.isArray(parsed.detectedObjects) ? parsed.detectedObjects : []).map(
      (o: any, idx: number) => ({
        id: `qwen-${Date.now()}-${idx}`,
        label: (o.label || 'object').toLowerCase().trim(),
        confidence: typeof o.confidence === 'number' ? o.confidence : 0.9,
        box: { xmin: 0, ymin: 0, xmax: 100, ymax: 100 },
        category: mapCategory((o.label || '').toLowerCase().trim()),
      })
    );

    return {
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['image'],
      detectedObjects: detectedObjects,
    };
  } catch (error) {
    console.error('[QWEN-VL] Vision analysis failed:', error);
    return { tags: ['image', 'unprocessed'], detectedObjects: [] };
  }
}

// ── Qwen3-VL: Native High-Fidelity Text Extraction (OCR) ────────────────────
export async function extractTextQwen(imageBuffer: Buffer): Promise<string> {
  if (!imageBuffer || imageBuffer.length === 0) return '';
  try {
    // Preserve higher resolution so small diacritics and compact text are crystal clear
    const resizedBuffer = await sharp(imageBuffer)
      .resize({ width: 1536, height: 1536, fit: 'inside' })
      .jpeg({ quality: 90 })
      .toBuffer();

    const base64Image = resizedBuffer.toString('base64');

    const payload = {
      model: OLLAMA_MODEL,
      messages: [
        {
          role: 'user',
          content:
            'Trích xuất toàn bộ văn bản xuất hiện trong hình ảnh này. Giữ nguyên 100% dấu câu tiếng Việt, khoảng cách từ, và cấu trúc ngắt dòng. Không thêm bất kỳ lời dẫn hay bình luận nào.',
          images: [base64Image],
        },
      ],
      stream: false,
      options: {
        num_ctx: 8192,
        num_predict: 2048,
        temperature: 0.1,
        repeat_penalty: 1.05,
      },
    };

    const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const content = (data.message?.content || '').trim();

    // Ignore conversational negative statements if no text is present
    const negativePhrases = [
      /^không có văn bản.*$/i,
      /^không tìm thấy văn bản.*$/i,
      /^hình ảnh không có văn bản.*$/i,
      /^bức ảnh không có văn bản.*$/i,
      /^no text found.*$/i,
      /^there is no text.*$/i,
    ];
    for (const phrase of negativePhrases) {
      if (phrase.test(content)) return '';
    }

    return content;
  } catch (err: any) {
    console.error('[QWEN-VL] OCR text extraction failed:', err?.message);
    return '';
  }
}

// ── Deprecated: PaddleOCR legacy wrapper ─────────────────────────────────────
/**
 * @deprecated PaddleOCR has been retired. Text extraction is now unified into Qwen3-VL 4B.
 */
export async function extractTextPaddle(_imagePath: string): Promise<string> {
  console.warn('[PaddleOCR] extractTextPaddle is deprecated; Qwen3-VL is now the unified engine.');
  return '';
}

// ── Category mapping ────────────────────────────────────────────────────────
const VEHICLE_LABELS = new Set([
  'car', 'truck', 'bus', 'motorcycle', 'bicycle', 'train', 'airplane',
  'boat', 'vehicle', 'scooter', 'van',
]);
const NATURE_LABELS = new Set([
  'bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear',
  'zebra', 'giraffe', 'tree', 'flower', 'plant', 'animal', 'fish',
  'mountain', 'river', 'forest', 'ocean', 'sky',
]);
const PERSON_LABELS = new Set(['person', 'people', 'man', 'woman', 'child', 'baby']);

function mapCategory(label: string): 'person' | 'vehicle' | 'nature' | 'object' | 'document' | 'text' {
  if (PERSON_LABELS.has(label)) return 'person';
  if (VEHICLE_LABELS.has(label)) return 'vehicle';
  if (NATURE_LABELS.has(label)) return 'nature';
  return 'object';
}

// ── Unified Entry Point: analyzeMediaHybrid ─────────────────────────────────
export async function analyzeMediaHybrid(
  _imagePath: string,
  base64Image: string
): Promise<VisionAnalysisResult> {
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(cleanBase64, 'base64');

  // Step 1: Visual understanding (tags + detected objects) via Qwen3-VL
  const visionResult = await analyzeVisionQwen(imageBuffer).catch(err => {
    console.warn('[QWEN-VL] Vision analysis failed:', err?.message);
    return { tags: ['image', 'photo'] as string[], detectedObjects: [] as DetectedObjectLocal[] };
  });

  // Step 2: Native text extraction via Qwen3-VL (100% Vietnamese diacritics & spacing preserved)
  const ocrText = await extractTextQwen(imageBuffer).catch(err => {
    console.warn('[QWEN-VL] OCR text extraction failed:', err?.message);
    return '';
  });

  const tags = [...visionResult.tags];
  const detectedObjects = visionResult.detectedObjects;

  // Infer media type
  const isDocument =
    tags.some(t =>
      ['document', 'id card', 'invoice', 'receipt', 'paper', 'text', 'certificate'].includes(
        t.toLowerCase()
      )
    ) || ocrText.length > 50;
  const type: 'image' | 'document' = isDocument ? 'document' : 'image';

  console.log(
    `[Qwen3-VL Unified] Tags: [${tags.join(', ')}] | Objects: ${detectedObjects.length} | OCR: ${ocrText.length} chars`
  );

  return {
    tags,
    detectedObjects,
    ocrText,
    ocr: ocrText,
    type,
  };
}
