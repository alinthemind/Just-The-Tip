import { createWorker } from 'tesseract.js';
import { parseReceiptText, ParsedReceiptTextResult } from './receiptParser';

let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      return worker;
    })();
  }
  return workerPromise;
}

export async function runClientOcr(
  imageSource: string | File | Blob,
  onProgress?: (progress: number, status: string) => void
): Promise<ParsedReceiptTextResult> {
  try {
    if (onProgress) onProgress(20, 'Initializing OCR engine...');

    const worker = await getOcrWorker();

    if (onProgress) onProgress(50, 'Recognizing receipt text & surcharges...');

    const ret = await worker.recognize(imageSource);
    const text = ret.data.text || '';

    if (onProgress) onProgress(85, 'Extracting pre-tax subtotal, city & fees...');

    const result = parseReceiptText(text);
    return result;
  } catch (error) {
    console.warn('Client OCR error, falling back:', error);
    return parseReceiptText('');
  }
}
