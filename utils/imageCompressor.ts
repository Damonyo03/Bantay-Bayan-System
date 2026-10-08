/**
 * Client-side Image Compression Utility
 * Resizes images to max 1600px and compresses to ~0.7 quality JPEG.
 */

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
}

export interface CompressedImageResult {
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  fileName: string;
}

export async function compressImage(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<CompressedImageResult> {
  const maxDimension = options.maxDimension || 1600;
  const quality = options.quality !== undefined ? options.quality : 0.7;
  const fileName = (file as File).name || `photo_${Date.now()}.jpg`;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = (err) => reject(err);
    reader.onload = () => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale down while maintaining aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        // Draw image onto canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create compressed image blob'));
              return;
            }
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({
              blob,
              dataUrl,
              originalSize: file.size,
              compressedSize: blob.size,
              fileName: fileName.replace(/\.[^/.]+$/, '') + '.jpg',
            });
          },
          'image/jpeg',
          quality
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
