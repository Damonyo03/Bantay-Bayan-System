import React, { useState } from 'react';
import { VehicleTrip, TripStop } from '../../types';
import { vehicleService } from '../../services/vehicleService';
import {
  X,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface StopActionModalProps {
  trip: VehicleTrip | null;
  mode: 'arrival' | 'departure';
  activeStop?: TripStop | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StopActionModal: React.FC<StopActionModalProps> = ({
  trip,
  mode,
  activeStop,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [place, setPlace] = useState(activeStop?.place || '');
  const [isManualTime, setIsManualTime] = useState(false);
  const [manualTime, setManualTime] = useState(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );
  const [manualReason, setManualReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if activeStop or mode changes
  React.useEffect(() => {
    if (activeStop?.place) {
      setPlace(activeStop.place);
    } else {
      setPlace('');
    }
    setIsManualTime(false);
    setManualReason('');
    setError(null);
  }, [isOpen, activeStop, mode]);

  if (!isOpen || !trip) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'arrival' && !place.trim()) {
      setError('Place / Location name is required.');
      return;
    }

    if (isManualTime && !manualReason.trim()) {
      setError('Reason for manual time entry is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'arrival') {
        await vehicleService.recordArrival(
          trip.id,
          place.trim(),
          isManualTime ? manualTime : null,
          isManualTime ? manualReason.trim() : null
        );
      } else {
        // Departure
        const stopId = activeStop?.id || trip.stops?.[trip.stops.length - 1]?.id;
        if (!stopId) {
          // If no previous stop exists, record arrival first or create stop
          await vehicleService.recordArrival(
            trip.id,
            place.trim() || 'Origin Stop',
            isManualTime ? manualTime : null,
            isManualTime ? manualReason.trim() : null
          );
        } else {
          await vehicleService.recordDeparture(
            stopId,
            isManualTime ? manualTime : null,
            isManualTime ? manualReason.trim() : null
          );
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(`Failed to record ${mode}:`, err);
      setError(err.message || `Failed to record ${mode}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div
              className={`p-3 rounded-2xl ${
                mode === 'arrival'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
              }`}
            >
              {mode === 'arrival' ? <CheckCircle2 size={24} /> : <Navigation size={24} />}
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500">
                Waypoint Stamp
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                {mode === 'arrival' ? 'Record Arrival' : 'Record Departure'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Place */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Location / Waypoint Place <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                required
                disabled={mode === 'departure' && !!activeStop?.place}
                placeholder="e.g. Zone 4 Health Center / City Hall"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue disabled:opacity-75"
              />
            </div>
          </div>

          {/* Timestamp Option Switcher */}
          <div className="pt-2">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5">
              <div className="flex items-center space-x-2.5">
                <Clock size={16} className="text-taguig-blue dark:text-taguig-gold" />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {isManualTime ? 'Manual Timestamp' : 'Stamp Server Time (Now)'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isManualTime
                      ? 'Custom date & time with logged reason'
                      : 'Accurate instant clock timestamp'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsManualTime(!isManualTime)}
                className="text-slate-500 dark:text-slate-400 hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors"
              >
                {isManualTime ? (
                  <ToggleRight size={28} className="text-taguig-blue dark:text-taguig-gold" />
                ) : (
                  <ToggleLeft size={28} />
                )}
              </button>
            </div>
          </div>

          {/* Manual Time & Reason Fields */}
          {isManualTime && (
            <div className="space-y-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-fadeIn">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-1.5">
                  Manual Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-500/30 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-1.5">
                  Reason for Manual Entry <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Field area offline / delayed logging"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-500/30 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
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
              className={`px-5 py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50 ${
                mode === 'arrival'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {mode === 'arrival' ? <CheckCircle2 size={15} /> : <Navigation size={15} />}
              <span>{loading ? 'Recording...' : mode === 'arrival' ? 'Stamp Arrival' : 'Stamp Departure'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
