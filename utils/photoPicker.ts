/**
 * Unified Photo Picker
 * Supports Capacitor Camera on mobile devices and browser file dialogs.
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export async function capturePhotoFromCamera(): Promise<Blob | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 80,
        allowEditing: false,
      });

      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        return await response.blob();
      }
    } catch (err: any) {
      if (err.message && err.message.includes('User cancelled')) {
        return null;
      }
      console.warn('Capacitor Camera error:', err);
    }
  }

  // Fallback: trigger HTML file input with capture="environment"
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      resolve(file || null);
    };

    input.click();
  });
}

export async function pickPhotoFromGallery(): Promise<Blob | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        quality: 80,
      });

      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        return await response.blob();
      }
    } catch (err: any) {
      if (err.message && err.message.includes('User cancelled')) {
        return null;
      }
      console.warn('Capacitor Gallery error:', err);
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      resolve(file || null);
    };

    input.click();
  });
}
