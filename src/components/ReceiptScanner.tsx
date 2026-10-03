import React, { useRef, useState } from 'react';
import { Camera, ImageUp, ShieldCheck, Lock, ChevronRight } from 'lucide-react';
import { SAMPLE_RECEIPTS, SampleReceipt } from '../data/sampleReceipts';
import { LiveCameraModal } from './LiveCameraModal';
import { UserLocation } from '../types';
import { extractExifGps, ExifGpsCoords } from '../utils/exif';
import { LanguageCode, getTranslation } from '../data/translations';
import { Card, SectionCaption } from './ui';

interface ReceiptScannerProps {
  onScan: (
    base64Image: string,
    photoGps?: ExifGpsCoords | null,
    sampleInfo?: { countryCode: string; city: string; currencySymbol: string }
  ) => Promise<void>;
  isScanning: boolean;
  userLocation: UserLocation;
  scanStep: string;
  currentLang?: LanguageCode;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  onScan,
  isScanning,
  userLocation,
  scanStep,
  currentLang = 'en',
}) => {
  const t = (key: string) => getTranslation(currentLang, key);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.name.toLowerCase().match(/\.(jpe?g|png|webp|heic|heif)$/i)) {
      alert('Please upload an image file (JPG, PNG, WEBP, or HEIC).');
      return;
    }
    let photoGps: ExifGpsCoords | null = null;
    try {
      photoGps = await extractExifGps(file);
    } catch (e) {
      console.warn('Exif extract notice:', e);
    }

    const reader = new FileReader();
    reader.onerror = (err) => {
      console.warn('FileReader error:', err);
    };
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setPreviewImage(result);
        onScan(result, photoGps);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
    // Reset so picking the same photo again still fires onChange
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleSampleSelect = (sample: SampleReceipt) => {
    setPreviewImage(sample.svgDataUri);
    onScan(sample.svgDataUri, null, {
      countryCode: sample.countryCode,
      city: sample.city,
      currencySymbol: sample.currencySymbol,
    });
  };

  const openCamera = () => {
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      nativeCameraInputRef.current?.click();
    } else {
      setIsCameraModalOpen(true);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Hidden inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      <input
        type="file"
        ref={nativeCameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <LiveCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(dataUri) => {
          setIsCameraModalOpen(false);
          setPreviewImage(dataUri);
          onScan(dataUri, null);
        }}
      />

      <Card className="px-5 pt-8 pb-5 text-center">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`rounded-[18px] transition-all ${dragActive ? 'bg-accent/5 ring-2 ring-accent scale-[1.01]' : ''}`}
        >
          {isScanning ? (
            /* Scanning: the photo being read, with a sweeping scan line */
            <div className="flex flex-col items-center">
              <div className="relative w-40 h-52 rounded-[18px] overflow-hidden bg-zinc-100 dark:bg-elevated-2 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.35)]">
                {previewImage && <img src={previewImage} alt="" className="w-full h-full object-cover" />}
                <div
                  className="absolute inset-x-0 top-2 h-[3px] ig-gradient shadow-[0_0_16px_4px_rgba(225,48,108,0.55)] animate-scan"
                  style={{ ['--sweep' as any]: '190px' }}
                />
              </div>
              <p className="mt-5 text-[15px] text-zinc-500 dark:text-zinc-400 min-h-[1.5rem] animate-pulse">
                {scanStep || '…'}
              </p>
            </div>
          ) : (
            <>
              <ReceiptIllustration />
              <h2 className="mt-6 text-[28px] font-bold tracking-tight leading-tight text-zinc-900 dark:text-white">
                {t('snapReceipt')} <span className="ig-gradient-text">{t('snapReceiptSub')}</span>
              </h2>

              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-[16px] ig-gradient text-white active:scale-[0.97] transition-transform cursor-pointer shadow-[0_8px_20px_-8px_rgba(225,48,108,0.7)]"
                >
                  <Camera className="w-7 h-7" strokeWidth={1.8} />
                  <span className="text-[15px] font-semibold">{t('takePhoto')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-[16px] bg-[#767680]/12 dark:bg-[#767680]/24 text-zinc-900 dark:text-white active:scale-[0.97] transition-transform cursor-pointer"
                >
                  <ImageUp className="w-7 h-7 text-accent" strokeWidth={1.8} />
                  <span className="text-[15px] font-semibold">{t('uploadPhoto')}</span>
                </button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4 text-[12px] text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1" title={t('excludesTax')}>
                  <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                  {t('preTaxBasis')}
                </span>
                <span className="inline-flex items-center gap-1" title={t('privacyBadge')}>
                  <Lock className="w-3.5 h-3.5 text-ig-purple dark:text-[#b67be0]" />
                  {t('zeroHistory')}
                </span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Sample receipts as thumbnails */}
      <div>
        <SectionCaption>{t('demoReceiptsTitle')}</SectionCaption>
        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
          {SAMPLE_RECEIPTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSampleSelect(sample)}
              disabled={isScanning}
              title={sample.name}
              className="snap-start flex-shrink-0 w-[124px] text-left cursor-pointer disabled:opacity-50 active:scale-95 transition-transform group"
            >
              <div className="relative h-[164px] rounded-[16px] overflow-hidden bg-zinc-100 dark:bg-elevated">
                <img
                  src={sample.svgDataUri}
                  alt={sample.name}
                  loading="lazy"
                  className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform"
                />
                <span className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur flex items-center justify-center text-base leading-none">
                  {sample.flag}
                </span>
              </div>
              <div className="mt-1.5 px-0.5 flex items-center justify-between gap-1">
                <span className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">{sample.city}</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Receipt inside camera viewfinder corners: the app in one picture */
const ReceiptIllustration: React.FC = () => (
  <svg viewBox="0 0 200 170" className="w-48 h-auto mx-auto" aria-hidden="true">
    {/* viewfinder corners */}
    <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="text-zinc-300 dark:text-zinc-600">
      <path d="M30 34 V18 a8 8 0 0 1 8 -8 H54" />
      <path d="M146 10 H162 a8 8 0 0 1 8 8 V34" />
      <path d="M170 136 V152 a8 8 0 0 1 -8 8 H146" />
      <path d="M54 160 H38 a8 8 0 0 1 -8 -8 V136" />
    </g>
    {/* receipt */}
    <g>
      <path
        d="M62 24 H138 V142 l-7.6 -6 -7.6 6 -7.6 -6 -7.6 6 -7.6 -6 -7.6 6 -7.6 -6 -7.6 6 -7.6 -6 -7.6 6 Z"
        className="fill-white dark:fill-zinc-100"
        stroke="#d4d4d8"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="76" y="38" width="48" height="7" rx="3.5" fill="#a1a1aa" />
      <g fill="#d4d4d8">
        <rect x="74" y="56" width="34" height="5" rx="2.5" />
        <rect x="114" y="56" width="12" height="5" rx="2.5" />
        <rect x="74" y="68" width="28" height="5" rx="2.5" />
        <rect x="114" y="68" width="12" height="5" rx="2.5" />
        <rect x="74" y="80" width="38" height="5" rx="2.5" />
        <rect x="114" y="80" width="12" height="5" rx="2.5" />
      </g>
      <line x1="74" y1="94" x2="126" y2="94" stroke="#d4d4d8" strokeWidth="1.5" strokeDasharray="3 3" />
      <rect x="74" y="102" width="24" height="6" rx="3" fill="#71717a" />
      <rect x="108" y="102" width="18" height="6" rx="3" fill="#71717a" />
    </g>
    {/* tip coin */}
    <g transform="translate(140 108)">
      <circle r="20" className="fill-accent" />
      <circle r="20" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="2" />
      <text y="7" textAnchor="middle" fontSize="20" fontWeight="700" fill="white" fontFamily="-apple-system, system-ui, sans-serif">
        %
      </text>
    </g>
    {/* scan line */}
    <g className="animate-scan" style={{ ['--sweep' as any]: '96px' }}>
      <rect x="40" y="28" width="120" height="3" rx="1.5" className="fill-accent" opacity="0.9" />
      <rect x="40" y="22" width="120" height="14" rx="7" className="fill-accent" opacity="0.12" />
    </g>
  </svg>
);
