import { createWorker } from 'tesseract.js';
import { parseReceiptText, ParsedReceiptTextResult } from './receiptParser';

let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const worker = await createWorker('eng');
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
          // Scale down very large camera images to a max dimension of 2000px for fast, reliable OCR
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          const maxDim = 2000;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            return resolve(null);
          }

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
  onProgress?: (progress: number, status: string) => void
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
    const worker = await getOcrWorker();
    if (!worker) {
      return parseReceiptText('');
    }

    if (onProgress) onProgress(65, 'stepRecognizing');

    // Run recognition with a 15-second safety timeout so it never hangs
    const ret: any = await Promise.race([
      worker.recognize(canvas),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('OCR recognition timeout')), 15000)
      ),
    ]);

    const text = ret?.data?.text || '';

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
    }
    return parseReceiptText('');
  }
}
