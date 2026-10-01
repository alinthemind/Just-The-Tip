import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCamera = async (mode: 'environment' | 'user') => {
    stopCamera();
    setIsStarting(true);
    setCameraError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings, or use the file upload option.'
          : 'Unable to access camera device. Please use photo upload instead.'
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    onCapture(dataUri);
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-between p-4 sm:p-6 backdrop-blur-sm animate-in fade-in">
      {/* Top Header */}
      <div className="w-full max-w-lg flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm">Align Receipt Within Frame</span>
        </div>
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Close camera"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewfinder Area */}
      <div className="relative w-full max-w-lg aspect-[3/4] max-h-[70vh] rounded-2xl overflow-hidden bg-zinc-950 border-2 border-white/20 shadow-2xl flex items-center justify-center my-auto">
        {cameraError ? (
          <div className="p-6 text-center text-white max-w-xs">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
            <p className="text-sm font-medium mb-4">{cameraError}</p>
            <button
              onClick={() => startCamera(facingMode)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />

            {/* Document Guide Frame Overlay */}
            <div className="absolute inset-6 border border-pink-400/50 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between">
                <div className="w-6 h-6 border-t-2 border-l-2 border-pink-400 -mt-1 -ml-1"></div>
                <div className="w-6 h-6 border-t-2 border-r-2 border-pink-400 -mt-1 -mr-1"></div>
              </div>
              <div className="text-center">
                <span className="text-xs bg-black/60 text-pink-200 px-3 py-1 rounded-full backdrop-blur-sm font-mono border border-pink-500/30">
                  Align receipt flat and clear
                </span>
              </div>
              <div className="flex justify-between">
                <div className="w-6 h-6 border-b-2 border-l-2 border-pink-400 -mb-1 -ml-1"></div>
                <div className="w-6 h-6 border-b-2 border-r-2 border-pink-400 -mb-1 -mr-1"></div>
              </div>
            </div>

            {/* Subtle scanning laser line effect with Instagram gradient */}
            <div className="absolute left-6 right-6 h-0.5 ig-gradient shadow-[0_0_8px_#E1306C] animate-pulse opacity-90 top-1/2 pointer-events-none" />
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-lg flex items-center justify-around py-4 z-10">
        <button
          onClick={toggleFacingMode}
          disabled={!!cameraError || isStarting}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30 cursor-pointer"
          title="Flip Camera"
        >
          <RefreshCw className="w-6 h-6" />
        </button>

        {/* Big Shutter Button (Instagram camera story style) */}
        <button
          onClick={handleCapture}
          disabled={!!cameraError || isStarting}
          className="w-20 h-20 rounded-full p-1 ig-gradient hover:opacity-95 active:scale-95 transition-all shadow-xl shadow-pink-500/40 flex items-center justify-center disabled:opacity-40 cursor-pointer"
          title="Snap Photo"
        >
          <div className="w-full h-full rounded-full border-2 border-white bg-white/20 flex items-center justify-center">
            <Camera className="w-8 h-8 text-white drop-shadow-sm" />
          </div>
        </button>

        <div className="w-12"></div>
      </div>
    </div>
  );
};
