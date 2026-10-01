import React, { useRef, useState } from 'react';
import { Camera, Upload, Sparkles, FileText, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import { SAMPLE_RECEIPTS, SampleReceipt } from '../data/sampleReceipts';
import { LiveCameraModal } from './LiveCameraModal';
import { UserLocation } from '../types';
import { extractExifGps, ExifGpsCoords } from '../utils/exif';

interface ReceiptScannerProps {
  onScan: (base64Image: string, photoGps?: ExifGpsCoords | null) => Promise<void>;
  isScanning: boolean;
  userLocation: UserLocation;
  scanStep: string;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  onScan,
  isScanning,
  userLocation,
  scanStep,
}) => {
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, WEBP, or HEIC).');
      return;
    }
    const photoGps = await extractExifGps(file);
    const reader = new FileReader();
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
    onScan(sample.svgDataUri, null);
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-20 sm:pb-8">
      {/* Hidden inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
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

      {/* Main Snap Card */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden p-4 sm:p-7 relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 ig-gradient" />

        <div className="text-center max-w-sm mx-auto mb-4 sm:mb-5 pt-0.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-200/70 text-[11px] font-bold mb-2">
            <Sparkles className="w-3 h-3 text-[#E1306C]" />
            <span className="ig-gradient-text">Pre-Tax Tip Protection</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 leading-tight">
            Snap Receipt. <span className="ig-gradient-text">Just the Tip.</span>
          </h2>

          <p className="text-xs text-zinc-500 mt-1">
            Uses receipt restaurant &amp; location first, photo GPS second. Calculates strictly on pre-tax subtotal.
          </p>
        </div>

        {isScanning ? (
          /* Scanning progress */
          <div className="py-6 sm:py-10 px-4 flex flex-col items-center justify-center text-center">
            <div className="ig-story-ring p-1 shadow-xl shadow-pink-500/20 animate-pulse mb-4">
              <div className="relative w-36 h-48 sm:w-40 sm:h-52 rounded-2xl bg-zinc-950 overflow-hidden flex items-center justify-center">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Receipt Preview"
                    className="w-full h-full object-cover opacity-70"
                  />
                ) : (
                  <FileText className="w-10 h-10 text-zinc-500" />
                )}
                <div className="absolute inset-x-0 h-1 ig-gradient shadow-[0_0_12px_#E1306C] animate-bounce" />
              </div>
            </div>

            <div className="space-y-1 max-w-xs">
              <h3 className="font-black text-zinc-900 text-sm">Reading Receipt &amp; Location...</h3>
              <p className="text-xs text-zinc-500 font-mono min-h-[1.25rem] animate-pulse">
                {scanStep || 'Detecting restaurant, city & pre-tax subtotal...'}
              </p>
            </div>

            <div className="w-40 bg-zinc-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div className="ig-gradient h-1.5 rounded-full animate-pulse w-4/5" />
            </div>
          </div>
        ) : (
          /* Upload / Capture Buttons */
          <div className="space-y-3">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-2xl p-4 sm:p-6 text-center transition-all ${
                dragActive
                  ? 'border-[#E1306C] bg-pink-50/40 scale-[1.01]'
                  : 'border-zinc-200 hover:border-pink-300 bg-zinc-50/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
                      nativeCameraInputRef.current?.click();
                    } else {
                      setIsCameraModalOpen(true);
                    }
                  }}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl ig-gradient hover:opacity-95 active:scale-95 text-white font-bold text-sm shadow-md shadow-pink-500/25 transition-all cursor-pointer min-h-[46px]"
                >
                  <Camera className="w-4 h-4" />
                  Take Receipt Photo
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-zinc-50 active:scale-95 border border-zinc-200 text-zinc-900 font-bold text-sm shadow-xs transition-all cursor-pointer min-h-[46px]"
                >
                  <Upload className="w-4 h-4 text-zinc-600" />
                  Upload Photo
                </button>
              </div>

              <div className="flex items-center justify-center gap-2.5 text-[11px] text-zinc-500 mt-3 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Strict Pre-Tax Basis
                </span>
                <span>•</span>
                <span>Receipt Location &amp; Photo GPS First</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Test Demo Receipts */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-zinc-900">
              1-Tap Test Receipts
            </span>
            <span className="text-[9px] font-extrabold ig-gradient-text bg-pink-50 border border-pink-200/70 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Quick Demo
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 hidden sm:block">Click any sample to test</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {SAMPLE_RECEIPTS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSampleSelect(sample)}
              disabled={isScanning}
              className="text-left p-3 rounded-2xl border border-zinc-200/80 hover:border-pink-300 hover:shadow-sm transition-all group flex flex-col justify-between bg-zinc-50/50 hover:bg-white cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{sample.flag}</span>
                    <span className="text-xs font-bold text-zinc-800">{sample.city}</span>
                  </div>
                  <span className="text-xs font-mono font-black text-zinc-900">
                    {sample.currencySymbol}{sample.total.toFixed(2)}
                  </span>
                </div>

                <div className="font-bold text-xs text-zinc-900 group-hover:text-[#E1306C] transition-colors line-clamp-1">
                  {sample.name}
                </div>

                <div className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                  {sample.notes}
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[10px] font-bold ig-gradient-text">
                <span>Test Scan</span>
                <ArrowRight className="w-3 h-3 text-[#E1306C] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
