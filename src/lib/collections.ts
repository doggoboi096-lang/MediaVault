/**
 * collections.ts — Auto-generated collections built from AI metadata
 * (tags, detected objects, OCR text, reverse-geocoded locations).
 */

import { MediaItem } from '../types';
import { Lang } from './i18n';
import type { IllustrationName } from '../components/Illustrations';

export type ViewId =
  | 'photos'
  | 'activity'
  | 'albums'
  | 'documents'
  | 'screenshots'
  | 'favorites'
  | 'people'
  | 'places'
  | 'trash'
  | 'settings';

export interface Collection {
  id: string;
  title: string;
  kind: 'location' | 'subject' | 'filetype' | 'document' | 'people';
  illustration: IllustrationName;
  items: MediaItem[];
}

const L = (lang: Lang, vi: string, en: string) => (lang === 'vi' ? vi : en);

/**
 * Lower-cased haystack of everything the AI said about an item.
 * ocrData.documentType is left out: the server stamps every OCR result as 'Note'.
 */
function aiText(item: MediaItem): string {
  return [item.title, ...(item.tags || []), ...(item.detectedObjects || []).map(o => o.label), item.ocrText || '']
    .join(' \n ')
    .toLowerCase();
}

export function isScreenshot(item: MediaItem): boolean {
  return /screenshot|screen shot|screen capture|ảnh chụp màn hình|browser window|web browser/.test(aiText(item));
}

export function isDocument(item: MediaItem): boolean {
  return item.type === 'document' || item.type === 'id_card' || !!item.ocrData?.extractedText?.length;
}

// ── Documents ───────────────────────────────────────────────────────────────
const DOCUMENT_CATEGORIES: { id: string; vi: string; en: string; illustration: IllustrationName; pattern: RegExp }[] = [
  { id: 'doc-id', vi: 'Giấy tờ tuỳ thân', en: 'IDs', illustration: 'idCard', pattern: /identity card|id card|citizen|passport|driver'?s? licen|căn cước|cccd|cmnd|hộ chiếu|giấy phép lái|photo id/ },
  { id: 'doc-receipt', vi: 'Biên nhận & hoá đơn', en: 'Receipts & invoices', illustration: 'receipt', pattern: /receipt|invoice|\bbill\b|hoá đơn|hóa đơn|biên nhận|biên lai|tổng cộng/ },
  { id: 'doc-payment', vi: 'Thẻ thanh toán', en: 'Payment cards', illustration: 'payment', pattern: /credit card|debit card|bank card|payment card|thẻ ngân hàng|mastercard|\bvisa\b/ },
  { id: 'doc-note', vi: 'Ghi chú', en: 'Notes', illustration: 'note', pattern: /handwrit|notebook|sticky note|\bnotes?\b|ghi chú|whiteboard/ },
  { id: 'doc-study', vi: 'Sách & học tập', en: 'Books & study', illustration: 'book', pattern: /\bbook|textbook|slide|presentation|lecture|course|tutorial|grade|academic|sách|bài giảng/ },
];

export function documentCollections(media: MediaItem[], lang: Lang): Collection[] {
  const docs = media.filter(isDocument);
  const matched = new Set<string>();
  const categories: Collection[] = DOCUMENT_CATEGORIES.map(cat => {
    const items = docs.filter(d => cat.pattern.test(aiText(d)));
    items.forEach(i => matched.add(i.id));
    return { id: cat.id, title: L(lang, cat.vi, cat.en), kind: 'document', illustration: cat.illustration, items };
  });
  categories.push({
    id: 'doc-other',
    title: L(lang, 'Tài liệu khác', 'Other documents'),
    kind: 'document',
    illustration: 'folder',
    items: docs.filter(d => !matched.has(d.id)),
  });
  return categories;
}

// ── People & pets ───────────────────────────────────────────────────────────
const PEOPLE_GROUPS: { id: string; vi: string; en: string; pattern: RegExp }[] = [
  { id: 'people-person', vi: 'Người', en: 'People', pattern: /\b(person|people|man|woman|child|baby|boy|girl|portrait|selfie|face|young man|young woman)\b|người/ },
  { id: 'people-dog', vi: 'Chó', en: 'Dogs', pattern: /\b(dog|puppy)\b|chó/ },
  { id: 'people-cat', vi: 'Mèo', en: 'Cats', pattern: /\b(cat|kitten)\b|mèo/ },
  { id: 'people-bird', vi: 'Chim', en: 'Birds', pattern: /\bbirds?\b|chim/ },
  { id: 'people-fish', vi: 'Cá', en: 'Fish', pattern: /\b(fish|aquarium)\b/ },
];

export function peopleCollections(media: MediaItem[], lang: Lang): Collection[] {
  // Skip papers and screens: an ID card or a video call shows a face but isn't a photo of someone.
  const paperwork = DOCUMENT_CATEGORIES.map(c => c.pattern);
  const candidates = media.filter(m => {
    const text = aiText(m);
    return !isScreenshot(m) && !paperwork.some(p => p.test(text));
  });
  return PEOPLE_GROUPS.map(g => ({
    id: g.id,
    title: L(lang, g.vi, g.en),
    kind: 'people' as const,
    illustration: 'people' as const,
    items: candidates.filter(m => g.pattern.test(aiText(m))),
  })).filter(c => c.items.length > 0);
}

// ── Places ──────────────────────────────────────────────────────────────────
export function placeCollections(media: MediaItem[]): Collection[] {
  const byPlace = new Map<string, MediaItem[]>();
  for (const m of media) {
    const name = m.location?.city || m.location?.name;
    if (!name || name === 'Unknown Location' || name === 'GPS Location') continue;
    byPlace.set(name, [...(byPlace.get(name) || []), m]);
  }
  return [...byPlace.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([name, items]) => ({ id: `place-${name}`, title: name, kind: 'location' as const, illustration: 'places' as const, items }));
}

// ── Albums (auto) ───────────────────────────────────────────────────────────
export function albumCollections(media: MediaItem[], lang: Lang): Collection[] {
  const albums: Collection[] = [];

  const videos = media.filter(m => m.type === 'video');
  if (videos.length) albums.push({ id: 'album-videos', title: 'Video', kind: 'filetype', illustration: 'photos', items: videos });
  const docs = media.filter(isDocument);
  if (docs.length) albums.push({ id: 'album-docs', title: L(lang, 'Tài liệu', 'Documents'), kind: 'filetype', illustration: 'folder', items: docs });
  const shots = media.filter(isScreenshot);
  if (shots.length) albums.push({ id: 'album-screens', title: L(lang, 'Ảnh chụp màn hình', 'Screenshots'), kind: 'filetype', illustration: 'screenshot', items: shots });

  albums.push(...placeCollections(media));

  // Subjects the AI saw in at least two items become albums.
  const counts = new Map<string, MediaItem[]>();
  const ignore = new Set(['image', 'photo', 'uploaded', 'local', 'upload', 'indexed', 'video', 'unprocessed', 'document']);
  for (const m of media) {
    const subjects = new Set([...(m.detectedObjects || []).map(o => o.label.toLowerCase()), ...(m.tags || []).map(t => t.toLowerCase())]);
    for (const s of subjects) {
      if (ignore.has(s)) continue;
      counts.set(s, [...(counts.get(s) || []), m]);
    }
  }
  [...counts.entries()]
    .filter(([, items]) => items.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 12)
    .forEach(([subject, items]) =>
      albums.push({
        id: `subject-${subject}`,
        title: subject.charAt(0).toUpperCase() + subject.slice(1),
        kind: 'subject',
        illustration: 'photos',
        items,
      })
    );

  return albums;
}

/** Example search term for the search bar placeholder, taken from the user's own library. */
export function exampleSearchTerm(media: MediaItem[]): string | null {
  const place = placeCollections(media)[0];
  if (place) return place.title;
  const tag = media.flatMap(m => m.tags || []).find(t => t.length > 3 && t.length < 24 && !['uploaded', 'unprocessed'].includes(t));
  return tag || null;
}
