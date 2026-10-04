import { createWorker } from 'tesseract.js';
import { parseReceiptText, ParsedReceiptTextResult, receiptTextScore } from './receiptParser';
import { prefetchPaddleOcr, recognizeWithPaddle, warmPaddleIfCached } from './paddleOcr';

let workerPromise: Promise<any> | null = null;
// Languages the cached worker is currently loaded with
let workerLangs = 'eng';

/** Hints for which non-Latin script a receipt is likely in */
export interface OcrHints {
  appLang?: string;
  countryCode?: string;
}

// Tesseract models for the scripts English OCR can't read
const LANG_FOR_APP: Record<string, string> = { 'zh-CN': 'chi_sim', 'zh-TW': 'chi_tra', ja: 'jpn', ko: 'kor', th: 'tha' };
const LANG_FOR_COUNTRY: Record<string, string> = {
  CN: 'chi_sim', SG: 'chi_sim', HK: 'chi_tra', MO: 'chi_tra', TW: 'chi_tra', JP: 'jpn', KR: 'kor', TH: 'tha',
};
const SCRIPT_LANGS = ['chi_sim', 'chi_tra', 'jpn', 'kor', 'tha'];
// Scripts sharing Han characters, which can stand in for each other on a first read
const CJK_FAMILY = ['chi_sim', 'chi_tra', 'jpn'];

/** Script languages to try, most likely first (app language, then where the phone is, then the rest) */
function candidateLangs(hints: OcrHints): string[] {
  const ordered = [LANG_FOR_APP[hints.appLang || ''], LANG_FOR_COUNTRY[hints.countryCode || ''], ...SCRIPT_LANGS];
  return [...new Set(ordered.filter(Boolean))];
}

// A score this high means the text clearly reads as a receipt (several labelled amounts)
const GOOD_ENOUGH_SCORE = 4;
// Stop trying other scripts after this long. Generous because a script's model (a few MB) is downloaded
// the first time it is used; after that each extra pass takes only a few seconds.
const OCR_TIME_BUDGET_MS = 45000;
const PASS_TIMEOUT_MS = 15000;

/**
 * Warm the OCR engine with the model for where the phone is (e.g. Chinese in China), so the first scan
 * there doesn't wait for a download. Runs in the background; failures are ignored.
 */
let prefetching: Promise<void> | null = null;

export function prefetchOcrModels(hints: OcrHints): void {
  const lang = LANG_FOR_COUNTRY[hints.countryCode || ''] || LANG_FOR_APP[hints.appLang || ''];
  // Chinese and Japanese are read by PaddleOCR
  if (lang && CJK_FAMILY.includes(lang)) return prefetchPaddleOcr();
  if (!lang || prefetching) return;
  prefetching = getOcrWorker()
    .then(async (worker) => {
      if (!worker || workerLangs !== 'eng') return;
      // Loading the model caches it; switch back so the next scan starts with the fast English pass
      workerLangs = `${lang}+eng`;
      await worker.reinitialize([lang, 'eng']);
      await worker.reinitialize(['eng']);
      workerLangs = 'eng';
    })
    .catch(() => {})
    .finally(() => {
      prefetching = null;
    });
}

/** Start the OCR engine and its English data in the background, so the first scan doesn't wait for it */
export function prewarmOcr(): void {
  getOcrWorker().catch(() => {});
}

async function recognizeWith(worker: any, langs: string, canvas: HTMLCanvasElement): Promise<{ text: string; confidence: number }> {
  if (workerLangs !== langs) {
    await worker.reinitialize(langs.split('+'));
    workerLangs = langs;
  }
  const ret: any = await Promise.race([
    worker.recognize(canvas),
    new Promise<null>((_, reject) => setTimeout(() => reject(new Error('OCR recognition timeout')), PASS_TIMEOUT_MS)),
  ]);
  return { text: ret?.data?.text || '', confidence: ret?.data?.confidence || 0 };
}

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const worker = await createWorker('eng');
        workerLangs = 'eng';
        return worker;
      } catch (err) {
        console.warn('Failed to initialize Tesseract OCR worker:', err);
        workerPromise = null;
        return null;
      }
    })();
  }
  return workerPromise;
}

/**
 * Extract clean plain text from SVG data URIs or SVG XML strings.
 * This completely avoids sending SVGs to raster-only OCR engines like Tesseract,
 * which throws "Error attempting to read image."
 */
function extractTextFromSvg(svgStr: string): string {
  try {
    let raw = svgStr;
    if (raw.startsWith('data:image/svg+xml;utf8,')) {
      raw = decodeURIComponent(raw.replace('data:image/svg+xml;utf8,', ''));
    } else if (raw.startsWith('data:image/svg+xml;base64,')) {
      raw = atob(raw.replace('data:image/svg+xml;base64,', ''));
    } else if (raw.startsWith('data:image/svg+xml,')) {
      raw = decodeURIComponent(raw.replace('data:image/svg+xml,', ''));
    }

    const stripped = raw
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    return stripped
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n');
  } catch (err) {
    console.warn('SVG text extraction notice:', err);
    return '';
  }
}

/**
 * Safely verify and normalize an image into an HTMLCanvasElement before passing to Tesseract.
 * This catches any corrupt or unreadable image formats client-side and prevents
 * uncaught "Error attempting to read image." worker errors.
 */
function normalizeImageToCanvas(
  source: string | File | Blob
): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve(null);
    }

    try {
      const img = new Image();
      let objectUrl: string | null = null;

      const cleanup = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Only shrink very large camera photos (for speed). Tesseract does its own cleanup: in testing,
          // enlarging, grayscaling or contrast-stretching real receipt photos made recognition worse.
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          const maxDim = 2200;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            return resolve(null);
          }

          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          cleanup();
          resolve(canvas);
        } catch (e) {
          cleanup();
          resolve(null);
        }
      };

      img.onerror = () => {
        cleanup();
        resolve(null);
      };

      if (typeof source === 'string') {
        img.src = source;
      } else {
        objectUrl = URL.createObjectURL(source);
        img.src = objectUrl;
      }
    } catch {
      resolve(null);
    }
  });
}

export async function runClientOcr(
  imageSource: string | File | Blob,
  /** `status` is a translation key (stepPreparing, stepRecognizing, ...) */
  onProgress?: (progress: number, status: string) => void,
  hints: OcrHints = {}
): Promise<ParsedReceiptTextResult> {
  try {
    // 1. If image is an SVG (e.g., demo test receipts), parse text directly without worker
    if (
      typeof imageSource === 'string' &&
      (imageSource.includes('image/svg+xml') || imageSource.includes('<svg'))
    ) {
      if (onProgress) onProgress(100, 'stepReading');
      const svgText = extractTextFromSvg(imageSource);
      return parseReceiptText(svgText);
    }

    // 2. Normalize and verify image is readable by browser before calling Tesseract worker
    if (onProgress) onProgress(20, 'stepPreparing');
    const canvas = await normalizeImageToCanvas(imageSource);
    if (!canvas) {
      console.warn('Image could not be rendered to canvas, falling back to server parsing.');
      return parseReceiptText('');
    }

    if (onProgress) onProgress(40, 'stepOcrInit');
    // Don't switch models underneath a background prefetch
    if (prefetching) await Promise.race([prefetching, new Promise((r) => setTimeout(r, 20000))]);
    // Tesseract starts loading now but is only waited for when a pass needs it
    const workerPromise = getOcrWorker();
    let worker: any = null;
    const tesseract = async () => (worker ??= await workerPromise);

    if (onProgress) onProgress(60, 'stepRecognizing');
    const started = Date.now();
    const hintedLang = LANG_FOR_APP[hints.appLang || ''] || LANG_FOR_COUNTRY[hints.countryCode || ''];
    const cjkHint = Boolean(hintedLang && CJK_FAMILY.includes(hintedLang));
    // Korean and Thai, which this PaddleOCR model doesn't cover, go to Tesseract's script models
    const otherScriptHint = Boolean(hintedLang && !CJK_FAMILY.includes(hintedLang));

    let best = { text: '', confidence: 0 };
    let bestScore = -1;
    let englishIsRight = false;
    let paddleRead = false;
    // PaddleOCR reads thermal-printed Chinese and Japanese far better than Tesseract, and English too
    const tryPaddle = async () => {
      if (onProgress) onProgress(70, 'stepOtherLanguage');
      try {
        const budgetLeft = Math.max(5000, OCR_TIME_BUDGET_MS - (Date.now() - started));
        const attempt = await recognizeWithPaddle(canvas, budgetLeft);
        const score = receiptTextScore(attempt.text);
        paddleRead = true;
        if (score >= bestScore) {
          best = attempt;
          bestScore = score;
        }
      } catch (err) {
        console.warn('PaddleOCR unavailable, using Tesseract:', err);
      }
    };

    // The phone or the app language points to Chinese/Japanese: read with PaddleOCR straight away
    if (cjkHint) await tryPaddle();

    // English pass (Latin-script receipts: Europe, the Americas...), unless PaddleOCR already nailed it.
    // Meanwhile PaddleOCR starts up if its models are already on the device (costs no download).
    if (bestScore < GOOD_ENOUGH_SCORE) {
      if (!paddleRead && !otherScriptHint) warmPaddleIfCached();
      const engine = await tesseract();
      if (engine) {
        const english = await recognizeWith(engine, 'eng', canvas);
        const score = receiptTextScore(english.text);
        if (score > bestScore) {
          best = english;
          bestScore = score;
        }
        // A confident English read with a labelled amount is a Latin-script receipt: no other script needed.
        // (English OCR of Asian scripts scores ~25-45% confidence; real Latin receipts ~80%+.)
        englishIsRight = score >= 2 && english.confidence >= 70;
      }
    }

    // Not a Latin-script receipt and no hint: try PaddleOCR (Chinese/Japanese) before Tesseract's scripts
    if (!paddleRead && bestScore < GOOD_ENOUGH_SCORE && !englishIsRight && !otherScriptHint) await tryPaddle();

    // Other scripts only if that didn't produce a convincing receipt. Confidence alone can't tell
    // scripts apart, so each attempt is judged by how many labelled amounts it finds.
    if (bestScore < GOOD_ENOUGH_SCORE && !englishIsRight) {
      const hinted = Boolean(hintedLang);
      let winner = 'eng';
      // After a PaddleOCR read, Tesseract's Chinese/Japanese models won't do better: only try Korean and Thai
      const langs = candidateLangs(hints).filter((l) => !(paddleRead && CJK_FAMILY.includes(l)));
      for (const lang of langs) {
        if (Date.now() - started > OCR_TIME_BUDGET_MS) break;
        // Without a hint, a Chinese model also reads Japanese kanji and the other Chinese variant well
        // enough to win, while mangling kana and the variant's characters. So once one CJK model is
        // good enough, still compare its siblings before stopping.
        const sibling = !hinted && CJK_FAMILY.includes(winner) && CJK_FAMILY.includes(lang);
        if (bestScore >= GOOD_ENOUGH_SCORE && !sibling) break;
        if (onProgress) onProgress(75, 'stepOtherLanguage');
        const engine = await tesseract();
        if (!engine) break;
        try {
          const attempt = await recognizeWith(engine, `${lang}+eng`, canvas);
          const score = receiptTextScore(attempt.text);
          // On a tie, Japanese wins if it found real kana (which the Chinese models turn into noise)
          const kanaTieBreak = lang === 'jpn' && score === bestScore && (attempt.text.match(/[\u3040-\u30ff]/g) || []).length >= 6;
          if (score > bestScore || kanaTieBreak) {
            best = attempt;
            bestScore = score;
            winner = lang;
          }
        } catch (err) {
          console.warn(`OCR with ${lang} failed:`, err);
        }
      }
    }
    const text = best.text;

    if (onProgress) onProgress(90, 'stepExtracting');
    return parseReceiptText(text);
  } catch (error) {
    console.warn('Client OCR warning (falling back gracefully):', error);
    // If worker encountered a fatal error, reset the cached worker promise
    if (workerPromise) {
      workerPromise.then((w) => {
        try {
          w?.terminate?.();
        } catch (_) {}
      }).catch(() => {});
      workerPromise = null;
      workerLangs = 'eng';
    }
    return parseReceiptText('');
  }
}
