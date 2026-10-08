import React, { useState, useEffect, useRef } from 'react';
import { scanQRFromCanvasOrVideo, parseVehicleQRString } from '../../utils/qrCodeDecoder';
import { Camera, X, Upload, AlertCircle, Scan, Keyboard, RefreshCw } from 'lucide-react';

interface VehicleScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleDetected: (vehicleId: string, action?: string) => void;
}

export const VehicleScannerModal: React.FC<VehicleScannerModalProps> = ({
  isOpen,
  onClose,
  onVehicleDetected,
}) => {
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>('');
  const [isManualMode, setIsManualMode] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError('Camera access is not supported by this browser/device.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access or use manual input.'
          : 'Could not access device camera.'
      );
      setHasCamera(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen && !isManualMode) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, isManualMode]);

  // Real-time frame scanner loop
  useEffect(() => {
    if (!isScanning) return;

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const rawCode = await scanQRFromCanvasOrVideo(videoRef.current);
        if (rawCode) {
          const result = parseVehicleQRString(rawCode);
          if (result.vehicleId) {
            stopCamera();
            onVehicleDetected(result.vehicleId, result.action);
          }
        }
      } catch (err) {
        // Continuous scan tick
      }
    }, 400);

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [isScanning, onVehicleDetected]);

  // Handle Image File Upload (e.g. photo of QR)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      try {
        const rawCode = await scanQRFromCanvasOrVideo(img);
        if (rawCode) {
          const result = parseVehicleQRString(rawCode);
          if (result.vehicleId) {
            onVehicleDetected(result.vehicleId, result.action);
          }
        } else {
          alert('Could not detect a valid QR code in this image. Please try again or use manual search.');
        }
      } catch (err) {
        alert('Failed to scan image. Please try another photo or enter manually.');
      }
    };
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const result = parseVehicleQRString(manualInput);
    if (result.vehicleId) {
      onVehicleDetected(result.vehicleId, result.action);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-taguig-navy dark:bg-taguig-blue text-white rounded-2xl shadow-md">
              <Scan size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                Scan Vehicle QR Code
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Patrol Trip Dispatcher
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {!isManualMode && hasCamera && !cameraError ? (
            <div className="relative rounded-3xl overflow-hidden bg-black aspect-square flex items-center justify-center shadow-inner border border-slate-700">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Target & Laser Animation */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                <div className="w-56 h-56 border-2 border-white/60 rounded-3xl relative">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-taguig-gold -mt-1 -ml-1 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-taguig-gold -mt-1 -mr-1 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-taguig-gold -mb-1 -ml-1 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-taguig-gold -mb-1 -mr-1 rounded-br-lg"></div>

                  {/* Laser line */}
                  <div className="w-full h-0.5 bg-taguig-gold shadow-[0_0_12px_#f59e0b] animate-pulse absolute top-1/2 -translate-y-1/2"></div>
                </div>
              </div>

              <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
                <span className="inline-block bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold px-4 py-1.5 rounded-full border border-white/10">
                  Align Vehicle QR inside the frame
                </span>
              </div>
            </div>
          ) : (
            /* Manual / Fallback Mode */
            <div className="space-y-4">
              {cameraError && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-3">
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p>{cameraError}</p>
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Plate Number, Vehicle ID, or Scanned Token
                  </label>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="e.g. SAA-1234 or vehicle UUID"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-taguig-blue/30"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="w-full py-3.5 bg-taguig-navy dark:bg-taguig-blue text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
                >
                  Dispatch / Manage Vehicle
                </button>
              </form>
            </div>
          )}

          {/* Quick Actions Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
            <label className="cursor-pointer text-xs font-bold text-taguig-blue hover:text-taguig-navy flex items-center space-x-1.5">
              <Upload size={14} />
              <span>Upload QR Image</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            <button
              type="button"
              onClick={() => setIsManualMode(!isManualMode)}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 flex items-center space-x-1.5"
            >
              {isManualMode ? (
                <>
                  <Camera size={14} />
                  <span>Switch to Camera</span>
                </>
              ) : (
                <>
                  <Keyboard size={14} />
                  <span>Manual Input</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
