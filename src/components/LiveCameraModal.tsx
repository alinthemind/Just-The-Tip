import React, { useRef, useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, SwitchCamera } from 'lucide-react';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // A ref, not state: effect cleanups capture stale state and would never stop the stream
  const streamRef = useRef<MediaStream | null>(null);
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
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

      streamRef.current = mediaStream;
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

  const corner = 'absolute w-8 h-8 border-white/90';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in">
      {/* Top bar */}
      <div className="w-full max-w-lg flex items-center justify-end text-white z-10">
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close camera"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="relative w-full max-w-lg aspect-[3/4] max-h-[70vh] rounded-[20px] overflow-hidden bg-zinc-950 flex items-center justify-center my-auto">
        {cameraError ? (
          <div className="p-6 text-center text-white max-w-xs">
            <AlertCircle className="w-10 h-10 text-[#ff453a] mx-auto mb-3" />
            <p className="text-[15px] text-white/80 mb-5">{cameraError}</p>
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              aria-label="Try again"
              className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center mx-auto cursor-pointer"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" />

            {/* Document corners */}
            <div className="absolute inset-8 pointer-events-none">
              <span className={`${corner} top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-[14px]`} />
              <span className={`${corner} top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-[14px]`} />
              <span className={`${corner} bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-[14px]`} />
              <span className={`${corner} bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-[14px]`} />
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg flex items-center justify-around py-4 z-10">
        <div className="w-12" />

        {/* Shutter */}
        <button
          type="button"
          onClick={handleCapture}
          disabled={!!cameraError || isStarting}
          className="w-[76px] h-[76px] rounded-full border-[4px] border-white flex items-center justify-center disabled:opacity-40 cursor-pointer group"
          title="Snap Photo"
          aria-label="Snap Photo"
        >
          <span className="w-[62px] h-[62px] rounded-full bg-white group-active:scale-90 transition-transform" />
        </button>

        <button
          type="button"
          onClick={toggleFacingMode}
          disabled={!!cameraError || isStarting}
          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors disabled:opacity-30 cursor-pointer"
          title="Flip Camera"
          aria-label="Flip Camera"
        >
          <SwitchCamera className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
