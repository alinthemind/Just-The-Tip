/**
 * PaddleOCR (PP-OCRv6 tiny, via ppu-paddle-ocr + ONNX Runtime Web), run on the phone for Chinese and
 * Japanese receipts. On thermal-printer receipts it reads far better than Tesseract (which turns most
 * Chinese headers into noise). Loaded only when needed: the library is a lazy chunk, and the models
 * (~6.4 MB) are downloaded once and kept in the Cache API, since their host sends `no-store`.
 */
import type { PaddleOcrService } from 'ppu-paddle-ocr/web';
import { largestAmount, parseReceiptText, receiptTextScore } from './receiptParser';

const MODEL_BASE = 'https://huggingface.co/snowfluke/ppu-paddle-ocr-models/resolve/main';
const MODEL_FILES = {
  detection: `${MODEL_BASE}/detection/ort/PP-OCRv6_tiny_det.ort`,
  recognition: `${MODEL_BASE}/recognition/ort/PP-OCRv6_tiny_rec.ort`,
  charactersDictionary: `${MODEL_BASE}/recognition/ppocrv6_tiny_dict.txt`,
};
const CACHE_NAME = 'globaltip-ocr-models-v1';

async function cachedBytes(url: string): Promise<ArrayBuffer> {
  let cache: Cache | null = null;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return await hit.arrayBuffer();
  } catch {
    cache = null; // Cache API unavailable (private mode, insecure origin): just download
  }
  const res = await fetch(url, { referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error(`Model download failed (${res.status})`);
  const bytes = await res.arrayBuffer();
  try {
    await cache?.put(url, new Response(bytes.slice(0)));
  } catch {
    // Storage full: still usable this session
  }
  return bytes;
}

let servicePromise: Promise<PaddleOcrService> | null = null;

function getService(): Promise<PaddleOcrService> {
  if (!servicePromise) {
    servicePromise = (async () => {
      const [{ PaddleOcrService }, detection, recognition, charactersDictionary] = await Promise.all([
        import('ppu-paddle-ocr/web'),
        cachedBytes(MODEL_FILES.detection),
        cachedBytes(MODEL_FILES.recognition),
        cachedBytes(MODEL_FILES.charactersDictionary),
      ]);
      const service = new PaddleOcrService({ model: { detection, recognition, charactersDictionary } });
      await service.initialize();
      return service;
    })().catch((err) => {
      servicePromise = null; // try again next time (e.g. after coming back online)
      throw err;
    });
  }
  return servicePromise;
}

/** Start loading PaddleOCR in the background (e.g. when the phone is in China or Japan) */
export function prefetchPaddleOcr(): void {
  getService().catch(() => {});
}

interface TextBox {
  text: string;
  box: { x: number; y: number; width: number; height: number };
}

/**
 * Rebuild the receipt's printed rows from PaddleOCR's text boxes. Labels sit on the left and amounts on
 * the right, so on a slightly tilted photo the amount drifts up or down by up to a row. The tilt is found
 * by trying small angles and keeping the one that lines the boxes up into the fewest, tightest rows.
 */
export function boxesToLines(boxes: TextBox[]): string {
  const items = boxes
    .filter((b) => b.text.trim())
    .map((b) => ({ text: b.text.trim(), cx: b.box.x + b.box.width / 2, cy: b.box.y + b.box.height / 2, h: b.box.height }));
  if (!items.length) return '';
  const heights = items.map((i) => i.h).sort((a, b) => a - b);
  const tolerance = heights[Math.floor(heights.length / 2)] * 0.5;

  const rowsAt = (slope: number) => {
    const sorted = items.map((i) => ({ ...i, y: i.cy - i.cx * slope })).sort((a, b) => a.y - b.y);
    const rows: Array<typeof sorted> = [];
    for (const item of sorted) {
      const row = rows[rows.length - 1];
      const rowY = row && row.reduce((acc, r) => acc + r.y, 0) / row.length;
      if (row && Math.abs(item.y - rowY) <= tolerance) row.push(item);
      else rows.push([item]);
    }
    const spread = rows.reduce((acc, row) => {
      const mean = row.reduce((a, r) => a + r.y, 0) / row.length;
      return acc + row.reduce((a, r) => a + Math.abs(r.y - mean), 0);
    }, 0);
    return { rows, spread };
  };

  let best = rowsAt(0);
  for (let deg = -4; deg <= 4; deg += 0.25) {
    const candidate = rowsAt(Math.tan((deg * Math.PI) / 180));
    if (candidate.rows.length < best.rows.length || (candidate.rows.length === best.rows.length && candidate.spread < best.spread)) {
      best = candidate;
    }
  }
  return best.rows.map((row) => row.sort((a, b) => a.cx - b.cx).map((r) => r.text).join(' ')).join('\n');
}

/** How consistent a reading is: amounts that check out, a total no smaller than any amount, labels found */
function consistency(text: string): number {
  const parsed = parseReceiptText(text);
  const totalCoversAll = parsed.total > 0 && largestAmount(text) <= parsed.total + 0.01;
  return (parsed.amountsConfirmed ? 100 : 0) + (totalCoversAll ? 10 : 0) + receiptTextScore(text);
}

/** Whether text `a` reads as a more consistent receipt than `b` (ties go to `b`) */
function readsBetter(a: string, b: string): boolean {
  return consistency(a) > consistency(b);
}

/** Read a receipt image with PaddleOCR; rejects if it can't load or takes longer than `timeoutMs` */
export async function recognizeWithPaddle(canvas: HTMLCanvasElement, timeoutMs: number): Promise<{ text: string; confidence: number }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('PaddleOCR timeout')), timeoutMs);
  });
  try {
    const service = await Promise.race([getService(), timeout]);
    const result: any = await Promise.race([service.recognize(canvas), timeout]);
    // Two ways to put the boxes into rows: the library's (follows curved paper better) and the tilt-corrected
    // one above (better on a flat but rotated receipt). Keep whichever reads as the more consistent receipt.
    const libraryText: string = result?.text || '';
    const tiltText = boxesToLines((result?.lines || []).flat());
    const text = readsBetter(tiltText, libraryText) ? tiltText : libraryText;
    return { text, confidence: Number(result?.confidence) || 0 };
  } finally {
    clearTimeout(timer);
  }
}
