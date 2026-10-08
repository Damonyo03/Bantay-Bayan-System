import React, { useState } from 'react';
import { Vehicle } from '../../types';
import { vehicleService, StartTripParams } from '../../services/vehicleService';
import { attachmentService } from '../../services/attachmentService';
import { PhotoUploader, PhotoAttachmentItem } from '../attachments/PhotoUploader';
import { isFeatureEnabled } from '../../src/config/features';
import {
  X,
  Play,
  User,
  Users,
  MapPin,
  FileText,
  Gauge,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';

interface StartTripModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMON_PURPOSES = [
  'Barangay Security Patrol',
  'Emergency Medical Response',
  'Disaster Response / Rescue',
  'Official Document Delivery',
  'Community Assistance / Transport',
  'Inspection / Zone Monitoring',
  'Logistics / Equipment Transport',
];

export const StartTripModal: React.FC<StartTripModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [driverName, setDriverName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [initialDestination, setInitialDestination] = useState('');
  const [odometerStart, setOdometerStart] = useState<string>('');
  const [passengers, setPassengers] = useState<string[]>(['']);
  const [photos, setPhotos] = useState<PhotoAttachmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !vehicle) return null;

  const handleAddPassenger = () => {
    setPassengers([...passengers, '']);
  };

  const handlePassengerChange = (index: number, value: string) => {
    const updated = [...passengers];
    updated[index] = value;
    setPassengers(updated);
  };

  const handleRemovePassenger = (index: number) => {
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) {
      setError('Driver name is required.');
      return;
    }
    if (!purpose.trim()) {
      setError('Trip purpose / mission is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const validPassengers = passengers
        .filter((p) => p.trim() !== '')
        .map((p) => ({ name: p.trim() }));

      const params: StartTripParams = {
        vehicle_id: vehicle.id,
        driver_name: driverName.trim(),
        purpose: purpose.trim(),
        initial_destination: initialDestination.trim() || undefined,
        odometer_start: odometerStart ? parseFloat(odometerStart) : null,
        passengers: validPassengers,
      };

      const tripId = await vehicleService.startTrip(params);

      if (tripId && photos.length > 0) {
        attachmentService.uploadAttachments({
          tripId,
          files: photos.map((p) => p.blob),
          fileNames: photos.map((p) => p.fileName),
        }).catch((err) => console.warn('Background trip attachment upload error:', err));
      }

      onSuccess();
      onClose();
      // Reset form
      setDriverName('');
      setPurpose('');
      setInitialDestination('');
      setOdometerStart('');
      setPassengers(['']);
      setPhotos([]);
    } catch (err: any) {
      console.error('Failed to start trip:', err);
      setError(err.message || 'Failed to start trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-taguig-blue/10 dark:bg-taguig-gold/20 text-taguig-blue dark:text-taguig-gold text-[11px] font-black tracking-widest uppercase">
                Dispatch Trip
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              Start Trip: {vehicle.name}
            </h2>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Plate: {vehicle.plate_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Driver Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Assigned Driver <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                required
                placeholder="e.g. Officer Juan Dela Cruz / External Driver"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>
          </div>

          {/* Mission / Purpose */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Trip Purpose / Mission <span className="text-red-500">*</span>
            </label>
            <div className="relative mb-2">
              <FileText
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                required
                placeholder="e.g. Routine Patrol Zone 1 to Zone 6"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>
            {/* Purpose presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMMON_PURPOSES.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPurpose(p)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-taguig-blue/10 dark:hover:bg-taguig-gold/10 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Initial Destination */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Initial Destination / Place (Optional)
            </label>
            <div className="relative">
              <MapPin
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="e.g. Zone 3 Outpost / Taguig City Hall"
                value={initialDestination}
                onChange={(e) => setInitialDestination(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>
          </div>

          {/* Starting Odometer */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Starting Odometer (km, Optional)
            </label>
            <div className="relative">
              <Gauge
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 45280.5"
                value={odometerStart}
                onChange={(e) => setOdometerStart(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>
          </div>

          {/* Passengers / Crew Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Users size={14} />
                <span>Crew / Passengers (Optional)</span>
              </label>
              <button
                type="button"
                onClick={handleAddPassenger}
                className="text-xs font-bold text-taguig-blue dark:text-taguig-gold flex items-center space-x-1 hover:underline"
              >
                <Plus size={14} />
                <span>Add Crew</span>
              </button>
            </div>

            <div className="space-y-2">
              {passengers.map((passenger, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder={`Passenger / Crew #${index + 1}`}
                    value={passenger}
                    onChange={(e) => handlePassengerChange(index, e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue"
                  />
                  {passengers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePassenger(index)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Optional Pre-Trip Photos */}
          {isFeatureEnabled('PHOTO_ATTACHMENTS') && (
            <PhotoUploader
              photos={photos}
              onChange={setPhotos}
              maxPhotos={3}
              label="Pre-Trip Photos / Odometer (Optional)"
              hint="Max 3 photos • Condition verification"
            />
          )}
        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-end space-x-3 bg-slate-50 dark:bg-slate-800/40">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-5 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 rounded-2xl bg-taguig-blue hover:bg-taguig-navy text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-taguig-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Play size={16} fill="currentColor" />
            <span>{loading ? 'Dispatching...' : 'Dispatch Vehicle'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
