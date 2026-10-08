import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleTrip, TripStop } from '../../types';
import {
  Car,
  Truck,
  Clock,
  User,
  Users,
  MapPin,
  Play,
  CheckCircle2,
  Navigation,
  StopCircle,
  AlertTriangle,
  Wrench,
  ChevronRight,
  Sparkles,
  QrCode,
} from 'lucide-react';

interface VehicleCardProps {
  vehicle: Vehicle;
  onStartTrip: (vehicle: Vehicle) => void;
  onRecordStop: (trip: VehicleTrip, mode: 'arrival' | 'departure', activeStop?: TripStop) => void;
  onEndTrip: (trip: VehicleTrip) => void;
  onToggleMaintenance: (vehicle: Vehicle, setMaintenance: boolean) => void;
  onShowQR?: (vehicle: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onStartTrip,
  onRecordStop,
  onEndTrip,
  onToggleMaintenance,
  onShowQR,
}) => {
  const activeTrip = vehicle.active_trip;
  const isAvailable = vehicle.status === 'available';
  const isOnTrip = vehicle.status === 'on_trip' && !!activeTrip;
  const isMaintenance = vehicle.status === 'maintenance';

  // Live timer for ongoing trips
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);

  useEffect(() => {
    if (!isOnTrip || !activeTrip?.started_at) return;

    const calcElapsed = () => {
      const start = new Date(activeTrip.started_at!).getTime();
      const now = new Date().getTime();
      setElapsedMinutes(Math.max(0, Math.floor((now - start) / 60000)));
    };

    calcElapsed();
    const interval = setInterval(calcElapsed, 30000);
    return () => clearInterval(interval);
  }, [isOnTrip, activeTrip?.started_at]);

  const latestStop = activeTrip?.stops && activeTrip.stops.length > 0
    ? activeTrip.stops[activeTrip.stops.length - 1]
    : null;

  // Determine if vehicle is currently waiting at a stop (arrival recorded, but no departure yet)
  const isAtStop = latestStop && latestStop.arrival_time && !latestStop.departure_time;

  const getStatusBadge = () => {
    if (isOnTrip) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          On Trip
        </span>
      );
    }
    if (isAvailable) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Ready / Available
        </span>
      );
    }
    if (isMaintenance) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/30">
          <Wrench size={12} />
          Under Maintenance
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        Decommissioned
      </span>
    );
  };

  return (
    <div
      className={`relative bg-white dark:bg-slate-900 rounded-3xl p-6 border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
        isOnTrip
          ? 'border-amber-400/80 dark:border-amber-500/40 ring-1 ring-amber-400/30'
          : isAvailable
          ? 'border-slate-200/80 dark:border-white/10'
          : 'border-red-200 dark:border-red-500/30 opacity-90'
      }`}
    >
      {/* Top Details */}
      <div>
        {/* Header: Name, Plate & Status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`p-3 rounded-2xl ${
                isOnTrip
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                  : isAvailable
                  ? 'bg-taguig-navy dark:bg-slate-800 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {vehicle.name.toLowerCase().includes('ambulance') ? (
                <Truck size={24} />
              ) : (
                <Car size={24} />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                {vehicle.name}
              </h3>
              <span className="inline-block font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md mt-0.5">
                {vehicle.plate_number}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onShowQR && (
              <button
                type="button"
                onClick={() => onShowQR(vehicle)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-taguig-navy hover:text-white dark:hover:bg-taguig-blue text-slate-600 dark:text-slate-300 transition-colors"
                title="View & Print Vehicle QR Pass"
                aria-label="View Vehicle QR"
              >
                <QrCode size={16} />
              </button>
            )}
            <div>{getStatusBadge()}</div>
          </div>
        </div>

        {/* Live Trip Activity Details */}
        {isOnTrip && activeTrip && (
          <div className="my-4 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-500/5 border border-amber-200/80 dark:border-amber-500/20 space-y-3">
            {/* Driver & Elapsed */}
            <div className="flex items-center justify-between text-xs pb-2 border-b border-amber-200/60 dark:border-amber-500/10">
              <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 font-bold">
                <User size={14} className="text-amber-600 dark:text-amber-400" />
                <span>Driver: {activeTrip.driver_name}</span>
              </div>
              <div className="flex items-center space-x-1 font-mono font-black text-amber-800 dark:text-amber-300">
                <Clock size={13} />
                <span>
                  {elapsedMinutes >= 60
                    ? `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`
                    : `${elapsedMinutes}m elapsed`}
                </span>
              </div>
            </div>

            {/* Purpose */}
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-700 dark:text-slate-200">Mission:</span>{' '}
              {activeTrip.purpose}
            </div>

            {/* Passengers */}
            {activeTrip.passengers && activeTrip.passengers.length > 0 && (
              <div className="flex items-start space-x-2 text-xs text-slate-600 dark:text-slate-300">
                <Users size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <span className="line-clamp-1">
                  <strong>Crew:</strong>{' '}
                  {activeTrip.passengers.map((p) => p.passenger_name).join(', ')}
                </span>
              </div>
            )}

            {/* Current Position / Stop Status */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-200 font-semibold">
                <MapPin size={14} className="text-taguig-blue dark:text-taguig-gold" />
                <span>
                  {isAtStop
                    ? `At: ${latestStop?.place}`
                    : latestStop?.place
                    ? `Heading to / Departed: ${latestStop?.place}`
                    : 'Patrol Active in Barangay'}
                </span>
              </div>
              {isAtStop && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                  On Scene
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
        {/* On Trip Actions */}
        {isOnTrip && activeTrip && (
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2">
            {!isAtStop ? (
              <button
                onClick={() => onRecordStop(activeTrip, 'arrival')}
                className="col-span-1 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
              >
                <CheckCircle2 size={15} />
                <span>Arrived</span>
              </button>
            ) : (
              <button
                onClick={() => onRecordStop(activeTrip, 'departure', latestStop || undefined)}
                className="col-span-1 py-3 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
              >
                <Navigation size={15} />
                <span>Depart</span>
              </button>
            )}

            <button
              onClick={() => onRecordStop(activeTrip, 'arrival')}
              title="Add a new destination waypoint"
              className="py-3 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1 active:scale-95 transition-all"
            >
              <MapPin size={14} />
              <span>Add Stop</span>
            </button>

            <button
              onClick={() => onEndTrip(activeTrip)}
              className="col-span-2 sm:col-span-1 py-3 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-1.5"
            >
              <StopCircle size={15} />
              <span>End Trip</span>
            </button>
          </div>
        )}

        {/* Available Actions */}
        {isAvailable && (
          <div className="w-full flex items-center justify-between gap-2">
            <button
              onClick={() => onStartTrip(vehicle)}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-taguig-blue hover:bg-taguig-navy text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-taguig-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <Play size={16} fill="currentColor" />
              <span>Start Trip</span>
            </button>

            <button
              onClick={() => onToggleMaintenance(vehicle, true)}
              title="Mark vehicle for maintenance"
              className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors"
            >
              <Wrench size={16} />
            </button>
          </div>
        )}

        {/* Maintenance Actions */}
        {isMaintenance && (
          <div className="w-full flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-red-500">Service in Progress</span>
            <button
              onClick={() => onToggleMaintenance(vehicle, false)}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all"
            >
              Mark as Ready
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
