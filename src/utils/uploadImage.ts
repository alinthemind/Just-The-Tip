/**
 * Shrink a photo before uploading it. Phone camera photos are 3-15 MB, and hosted APIs cap request
 * bodies (Vercel: 4.5 MB); 1800px is still plenty for reading a receipt. Demo SVGs, small images and
 * anything that fails to decode are sent unchanged. Run this after reading EXIF GPS, which it drops.
 */
const MAX_DIMENSION = 1800;
const SMALL_ENOUGH = 1_500_000; // characters of data URL, ~1.1 MB of image

export function shrinkForUpload(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:image/') || dataUrl.startsWith('data:image/svg')) return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
        if (scale === 1 && dataUrl.length <= SMALL_ENOUGH) return resolve(dataUrl);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const jpeg = canvas.toDataURL('image/jpeg', 0.85);
        resolve(jpeg.length < dataUrl.length ? jpeg : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
