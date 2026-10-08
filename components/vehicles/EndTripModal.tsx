import React, { useState } from 'react';
import { VehicleTrip } from '../../types';
import { vehicleService } from '../../services/vehicleService';
import { attachmentService } from '../../services/attachmentService';
import { PhotoUploader, PhotoAttachmentItem } from '../attachments/PhotoUploader';
import { isFeatureEnabled } from '../../src/config/features';
import {
  X,
  StopCircle,
  Gauge,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';

interface EndTripModalProps {
  trip: VehicleTrip | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EndTripModal: React.FC<EndTripModalProps> = ({
  trip,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [odometerEnd, setOdometerEnd] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [photos, setPhotos] = useState<PhotoAttachmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setOdometerEnd('');
    setRemarks('');
    setPhotos([]);
    setError(null);
  }, [isOpen, trip]);

  if (!isOpen || !trip) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endKm = odometerEnd ? parseFloat(odometerEnd) : null;
      if (
        trip.odometer_start &&
        endKm !== null &&
        endKm < trip.odometer_start
      ) {
        setError('Ending odometer cannot be less than starting odometer.');
        setLoading(false);
        return;
      }

      await vehicleService.endTrip(trip.id, endKm, remarks ? remarks.trim() : null);

      if (photos.length > 0) {
        attachmentService.uploadAttachments({
          tripId: trip.id,
          files: photos.map((p) => p.blob),
          fileNames: photos.map((p) => p.fileName),
        }).catch((err) => console.warn('Background trip check-in attachment upload error:', err));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to end trip:', err);
      setError(err.message || 'Failed to complete trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const distanceTravelled =
    trip.odometer_start && odometerEnd
      ? (parseFloat(odometerEnd) - trip.odometer_start).toFixed(1)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900">
              <StopCircle size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500">
                Complete Mission
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                End Vehicle Trip
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Trip Summary Mini Banner */}
        <div className="px-6 py-4 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-white/5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center space-x-1">
              <User size={13} className="text-taguig-blue" />
              <span>Driver: {trip.driver_name}</span>
            </span>
            {trip.started_at && (
              <span className="font-mono text-slate-500 text-[11px] flex items-center space-x-1">
                <Clock size={12} />
                <span>{new Date(trip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            )}
          </div>
          <div className="text-[11px] truncate">
            <strong>Purpose:</strong> {trip.purpose}
          </div>
          {trip.odometer_start && (
            <div className="text-[11px] font-mono text-slate-500">
              Start Odometer: <strong>{trip.odometer_start} km</strong>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Ending Odometer */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Ending Odometer (km, Optional)
            </label>
            <div className="relative">
              <Gauge
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="number"
                step="0.1"
                placeholder={trip.odometer_start ? `Higher than ${trip.odometer_start}` : 'e.g. 45310.2'}
                value={odometerEnd}
                onChange={(e) => setOdometerEnd(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>
            {distanceTravelled && parseFloat(distanceTravelled) >= 0 && (
              <div className="mt-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 size={13} />
                <span>Calculated Distance: {distanceTravelled} km</span>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Trip Remarks / Return Status (Optional)
            </label>
            <div className="relative">
              <FileText
                size={16}
                className="absolute left-4 top-3 text-slate-400"
              />
              <textarea
                rows={3}
                placeholder="e.g. Mission completed, vehicle safely parked at headquarters with full tank."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>
          </div>

          {/* Photo Attachments */}
          {isFeatureEnabled('PHOTO_ATTACHMENTS') && (
            <PhotoUploader
              photos={photos}
              onChange={setPhotos}
              maxPhotos={3}
              label="Return Photos / Odometer (Optional)"
              hint="Max 3 photos • Check-in verification"
            />
          )}

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end space-x-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <StopCircle size={15} />
              <span>{loading ? 'Completing...' : 'Finish & Check-In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
