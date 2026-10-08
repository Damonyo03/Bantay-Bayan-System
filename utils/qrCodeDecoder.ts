/**
 * Browser & Mobile Camera QR Decoder
 * Uses native BarcodeDetector where available, with canvas / video frame processing.
 */

export interface QRDecodeResult {
  data: string;
  vehicleId?: string;
  action?: string;
}

/**
 * Parses a decoded QR string (which may be a full URL, JSON, or an opaque vehicle token/UUID)
 */
export function parseVehicleQRString(rawText: string): QRDecodeResult {
  const trimmed = rawText.trim();

  // 1. Check if it's a URL
  try {
    // Handle hash router URL (e.g. https://domain.app/#/vehicles?vehicle_id=... or ?action=quick_trip)
    if (trimmed.includes('/vehicles') || trimmed.includes('vehicle_id=')) {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://dummy.local/${trimmed}`);
      
      let vehicleId = urlObj.searchParams.get('vehicle_id') || urlObj.searchParams.get('scan_vehicle');
      let action = urlObj.searchParams.get('action') || 'quick_trip';

      // Also check inside hash query params if using HashRouter (#/vehicles?vehicle_id=...)
      if (!vehicleId && urlObj.hash.includes('?')) {
        const hashQuery = urlObj.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        vehicleId = hashParams.get('vehicle_id') || hashParams.get('scan_vehicle');
        if (hashParams.get('action')) {
          action = hashParams.get('action')!;
        }
      }

      if (vehicleId) {
        return {
          data: trimmed,
          vehicleId: vehicleId.trim(),
          action,
        };
      }
    }
  } catch {
    // Ignore URL parse error and continue
  }

  // 2. Check if it's JSON: {"vehicle_id": "...", "action": "..."}
  try {
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (parsed.vehicle_id || parsed.id) {
        return {
          data: trimmed,
          vehicleId: String(parsed.vehicle_id || parsed.id).trim(),
          action: parsed.action || 'quick_trip',
        };
      }
    }
  } catch {
    // Ignore JSON error
  }

  // 3. Fallback: treat raw string as a direct vehicle ID or token (UUID / code)
  return {
    data: trimmed,
    vehicleId: trimmed,
    action: 'quick_trip',
  };
}

/**
 * Checks if the browser or platform natively supports BarcodeDetector API
 */
export function isNativeBarcodeDetectorSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/**
 * Scans an ImageBitmap, Canvas, Video, or Image element for QR codes
 */
export async function scanQRFromCanvasOrVideo(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<string | null> {
  if (isNativeBarcodeDetectorSupported()) {
    try {
      // @ts-ignore - BarcodeDetector is standard in modern Web APIs
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const codes = await detector.detect(source);
      if (codes && codes.length > 0 && codes[0].rawValue) {
        return codes[0].rawValue;
      }
    } catch (err) {
      console.warn('BarcodeDetector error:', err);
    }
  }

  return null;
}
