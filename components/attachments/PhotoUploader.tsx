import React, { useState } from 'react';
import { Camera, Image as ImageIcon, Plus, X, AlertCircle } from 'lucide-react';
import { capturePhotoFromCamera, pickPhotoFromGallery } from '../../utils/photoPicker';
import { compressImage } from '../../utils/imageCompressor';

export interface PhotoAttachmentItem {
  id: string;
  blob: Blob;
  previewUrl: string;
  fileName: string;
  size: number;
}

interface PhotoUploaderProps {
  photos: PhotoAttachmentItem[];
  onChange: (photos: PhotoAttachmentItem[]) => void;
  maxPhotos?: number;
  label?: string;
  hint?: string;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onChange,
  maxPhotos = 3,
  label = 'Photo Evidence / Verification (Optional)',
  hint = 'Max 3 photos • Auto-compressed for fast upload',
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAddBlob = async (blob: Blob | null, defaultName = 'photo.jpg') => {
    if (!blob) return;
    if (photos.length >= maxPhotos) {
      alert(`You can attach up to ${maxPhotos} photos.`);
      return;
    }

    setIsProcessing(true);
    try {
      const compressed = await compressImage(blob, { maxDimension: 1600, quality: 0.7 });
      const newItem: PhotoAttachmentItem = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        blob: compressed.blob,
        previewUrl: compressed.dataUrl,
        fileName: compressed.fileName || defaultName,
        size: compressed.compressedSize,
      };
      onChange([...photos, newItem]);
    } catch (err) {
      console.warn('Failed to compress photo:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCameraCapture = async () => {
    const blob = await capturePhotoFromCamera();
    if (blob) {
      await handleAddBlob(blob, `camera_${Date.now()}.jpg`);
    }
  };

  const handleGalleryPick = async () => {
    const blob = await pickPhotoFromGallery();
    if (blob) {
      await handleAddBlob(blob, `gallery_${Date.now()}.jpg`);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      if (photos.length + i >= maxPhotos) break;
      await handleAddBlob(files[i], files[i].name);
    }
    // Clear input
    e.target.value = '';
  };

  const handleRemove = (id: string) => {
    onChange(photos.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
          {label}
        </label>
        <span className="text-[10px] font-bold text-slate-400">
          {photos.length} of {maxPhotos} attached
        </span>
      </div>

      {hint && (
        <p className="text-[11px] text-slate-400 font-medium">
          {hint}
        </p>
      )}

      {/* Thumbnails Row */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {photos.map((item) => (
          <div
            key={item.id}
            className="relative group rounded-2xl overflow-hidden aspect-square border border-slate-200 dark:border-white/10 shadow-sm bg-slate-100 dark:bg-slate-800"
          >
            <img
              src={item.previewUrl}
              alt={item.fileName}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-red-600 text-white rounded-full transition-colors shadow-md"
              title="Remove Photo"
            >
              <X size={13} />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-slate-950/70 backdrop-blur-xs px-2 py-0.5 text-[9px] font-mono text-white truncate">
              {(item.size / 1024).toFixed(0)} KB
            </div>
          </div>
        ))}

        {/* Upload Trigger Buttons (if under limit) */}
        {photos.length < maxPhotos && (
          <div className="flex flex-col gap-1.5 aspect-square">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleCameraCapture}
              className="flex-1 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-taguig-blue dark:hover:border-taguig-gold hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-taguig-blue dark:hover:text-taguig-gold p-1"
              title="Take Photo with Camera"
            >
              <Camera size={18} />
              <span className="text-[10px] font-black uppercase tracking-tight mt-0.5">Camera</span>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleGalleryPick}
              className="flex-1 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-taguig-blue dark:hover:border-taguig-gold hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:text-taguig-blue dark:hover:text-taguig-gold p-1"
              title="Upload from Device Gallery"
            >
              <ImageIcon size={18} />
              <span className="text-[10px] font-black uppercase tracking-tight mt-0.5">Gallery</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
