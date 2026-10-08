import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Vehicle, VehicleTrip, TripStop } from '../../types';
import { vehicleService } from '../../services/vehicleService';
import { VehicleCard } from '../../components/vehicles/VehicleCard';
import { StartTripModal } from '../../components/vehicles/StartTripModal';
import { StopActionModal } from '../../components/vehicles/StopActionModal';
import { EndTripModal } from '../../components/vehicles/EndTripModal';
import { VehicleQRModal } from '../../components/vehicles/VehicleQRModal';
import { VehicleScannerModal } from '../../components/vehicles/VehicleScannerModal';
import { AddEditVehicleModal } from '../../components/vehicles/AddEditVehicleModal';
import { AttachmentGallery } from '../../components/attachments/AttachmentGallery';
import { recordAccess } from '../../services/auditAccessService';
import { isFeatureEnabled } from '../../src/config/features';
import {
  Car,
  Truck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  MapPin,
  Users,
  User,
  History,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Gauge,
  FileText,
  QrCode,
  Scan,
  Printer,
  Plus,
} from 'lucide-react';

export const VehicleMonitor: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');

  // Live vehicles state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'on_trip' | 'maintenance'>('all');

  // Trip history state
  const [historyTrips, setHistoryTrips] = useState<VehicleTrip[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyVehicleFilter, setHistoryVehicleFilter] = useState('All');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('All');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Modals state
  const [startModalVehicle, setStartModalVehicle] = useState<Vehicle | null>(null);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);

  const [stopModalTrip, setStopModalTrip] = useState<VehicleTrip | null>(null);
  const [stopModalMode, setStopModalMode] = useState<'arrival' | 'departure'>('arrival');
  const [stopModalActiveStop, setStopModalActiveStop] = useState<TripStop | null>(null);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);

  const [endModalTrip, setEndModalTrip] = useState<VehicleTrip | null>(null);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);

  // QR Modals state
  const [qrModalVehicle, setQRModalVehicle] = useState<Vehicle | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  // Vehicle Add / Edit Modal state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch live fleet
  const fetchFleet = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await vehicleService.getVehiclesWithLiveTrips();
      setVehicles(data);
      recordAccess({ action: 'viewed', record_type: 'vehicle_monitor', record_id: 'live_fleet' });
    } catch (err) {

      console.error('Failed to load fleet:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await vehicleService.getTripHistory({
        vehicle_id: historyVehicleFilter,
        driver_name: historySearch,
        status: historyStatusFilter,
        date_start: dateStart || undefined,
        date_end: dateEnd || undefined,
      });
      setHistoryTrips(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyVehicleFilter, historySearch, historyStatusFilter, dateStart, dateEnd]);

  // Initial load and realtime subscription
  useEffect(() => {
    fetchFleet();

    const channel = vehicleService.subscribeToVehicleMonitor(() => {
      fetchFleet(true);
      if (activeTab === 'history') {
        fetchHistory();
      }
    });

    return () => {
      vehicleService.unsubscribe(channel);
    };
  }, [fetchFleet, fetchHistory, activeTab]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Handler for Start Trip
  const handleOpenStartTrip = (vehicle: Vehicle) => {
    setStartModalVehicle(vehicle);
    setIsStartModalOpen(true);
  };

  // Handler for Stop (Arrival / Departure)
  const handleOpenRecordStop = (
    trip: VehicleTrip,
    mode: 'arrival' | 'departure',
    activeStop?: TripStop
  ) => {
    setStopModalTrip(trip);
    setStopModalMode(mode);
    setStopModalActiveStop(activeStop || null);
    setIsStopModalOpen(true);
  };

  // Handler for End Trip
  const handleOpenEndTrip = (trip: VehicleTrip) => {
    setEndModalTrip(trip);
    setIsEndModalOpen(true);
  };

  // Handler for QR Scanned Vehicle / Deep Link
  const handleVehicleQRAction = useCallback((vehicleIdOrToken: string) => {
    const target = vehicles.find(
      (v) =>
        v.id === vehicleIdOrToken ||
        v.qr_code_token === vehicleIdOrToken ||
        v.plate_number.toLowerCase().replace(/\s+/g, '') === vehicleIdOrToken.toLowerCase().replace(/\s+/g, '')
    );

    if (!target) {
      showToast(`Vehicle '${vehicleIdOrToken}' not found in fleet.`);
      return;
    }

    if (target.status === 'available') {
      handleOpenStartTrip(target);
    } else if (target.status === 'on_trip' && target.active_trip) {
      const activeTrip = target.active_trip;
      const latestStop = activeTrip.stops && activeTrip.stops.length > 0
        ? activeTrip.stops[activeTrip.stops.length - 1]
        : null;

      if (latestStop && latestStop.arrival_time && !latestStop.departure_time) {
        handleOpenRecordStop(activeTrip, 'departure', latestStop);
      } else {
        handleOpenRecordStop(activeTrip, 'arrival');
      }
    } else if (target.status === 'maintenance') {
      showToast(`${target.name} (${target.plate_number}) is currently under maintenance.`);
    }
  }, [vehicles]);

  // Deep Link / URL Parameter listener (e.g. when scanned via mobile phone camera)
  useEffect(() => {
    const vehicleIdParam = searchParams.get('vehicle_id') || searchParams.get('scan_vehicle');
    if (vehicleIdParam && vehicles.length > 0) {
      handleVehicleQRAction(vehicleIdParam);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('vehicle_id');
      newParams.delete('scan_vehicle');
      newParams.delete('action');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, vehicles, handleVehicleQRAction, setSearchParams]);

  // Handler for Maintenance Toggle
  const handleToggleMaintenance = async (vehicle: Vehicle, setMaintenance: boolean) => {
    try {
      const newStatus = setMaintenance ? 'maintenance' : 'available';
      await vehicleService.updateVehicleStatus(vehicle.id, newStatus);
      showToast(
        setMaintenance
          ? `${vehicle.name} marked for maintenance.`
          : `${vehicle.name} is now ready for service.`
      );
      fetchFleet(true);
    } catch (err: any) {
      alert(`Error updating maintenance status: ${err.message}`);
    }
  };

  // Filtered live vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.active_trip &&
        (v.active_trip.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.active_trip.purpose.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;


    if (statusFilter === 'all') return true;
    return v.status === statusFilter;
  });

  // Counters
  const countAvailable = vehicles.filter((v) => v.status === 'available').length;
  const countOnTrip = vehicles.filter((v) => v.status === 'on_trip').length;
  const countMaintenance = vehicles.filter((v) => v.status === 'maintenance').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-white/10 text-xs font-bold flex items-center space-x-2 animate-slideDown">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full bg-taguig-blue/10 dark:bg-taguig-gold/15 text-taguig-blue dark:text-taguig-gold text-xs font-black tracking-widest uppercase">
              Fleet Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            Vehicle Trip Monitoring
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time barangay patrol dispatch, crew assignments, waypoints, and automated logbook integration.
          </p>
        </div>

        {/* Tab Controls & Refresh */}
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-slate-200/80 dark:bg-slate-800 rounded-2xl flex items-center">
            <button
              onClick={() => setActiveTab('live')}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all ${
                activeTab === 'live'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Live Fleet ({vehicles.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider flex items-center space-x-1.5 transition-all ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History size={14} />
              <span>Trip Logs</span>
            </button>
          </div>

          {isFeatureEnabled('VEHICLE_QR_CODES') && (
            <>
              <button
                onClick={() => setIsScannerModalOpen(true)}
                title="Scan Vehicle QR Code"
                className="px-3.5 py-2.5 rounded-2xl bg-taguig-navy dark:bg-taguig-blue text-white font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-md hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Scan size={16} />
                <span className="hidden sm:inline">Scan QR</span>
              </button>

              <button
                onClick={() => {
                  setQRModalVehicle(null);
                  setIsQRModalOpen(true);
                }}
                title="Print All Vehicle QR Badges"
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:text-taguig-blue hover:border-taguig-blue transition-all active:scale-95 shadow-sm"
              >
                <Printer size={16} />
              </button>
            </>
          )}

          {/* Add New Vehicle Button */}
          <button
            onClick={() => {
              setEditingVehicle(null);
              setIsAddEditModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-taguig-blue hover:bg-taguig-navy text-white font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-md shadow-taguig-blue/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus size={16} />
            <span>Add Vehicle</span>
          </button>

          <button
            onClick={() => {
              if (activeTab === 'live') fetchFleet(true);
              else fetchHistory();
            }}
            title="Refresh Fleet Status"
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-taguig-blue hover:border-taguig-blue transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer p-4 rounded-3xl border transition-all ${
            statusFilter === 'all'
              ? 'bg-taguig-blue text-white border-taguig-blue shadow-lg shadow-taguig-blue/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider opacity-80">Total Fleet</span>
            <Car size={18} />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2">{vehicles.length}</div>
        </div>

        <div
          onClick={() => setStatusFilter('on_trip')}
          className={`cursor-pointer p-4 rounded-3xl border transition-all ${
            statusFilter === 'on_trip'
              ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              On Trip / Patrol
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-amber-600 dark:text-amber-400">
            {countOnTrip}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('available')}
          className={`cursor-pointer p-4 rounded-3xl border transition-all ${
            statusFilter === 'available'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Ready / Available
            </span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-emerald-600 dark:text-emerald-400">
            {countAvailable}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('maintenance')}
          className={`cursor-pointer p-4 rounded-3xl border transition-all ${
            statusFilter === 'maintenance'
              ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-red-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-red-500 dark:text-red-400">
              Maintenance
            </span>
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 text-red-500 dark:text-red-400">
            {countMaintenance}
          </div>
        </div>
      </div>

      {/* TAB 1: LIVE FLEET GRID */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          {/* Search & Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by vehicle name, plate, driver, or mission..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue shadow-sm"
              />
            </div>
          </div>

          {/* Grid of Vehicles */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <RefreshCw size={28} className="animate-spin text-taguig-blue" />
              <p className="text-xs font-bold uppercase tracking-wider">Loading Fleet Status...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 text-center p-6">
              <Car size={36} className="mx-auto text-slate-400 mb-2" />
              {vehicles.length === 0 ? (
                <>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    No Vehicles Registered
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    The fleet is currently empty. Click &ldquo;+ Add Vehicle&rdquo; above to register your first vehicle.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    No vehicles match your filter
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Try adjusting your search terms or status filter.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onStartTrip={handleOpenStartTrip}
                  onRecordStop={handleOpenRecordStop}
                  onEndTrip={handleOpenEndTrip}
                  onToggleMaintenance={handleToggleMaintenance}
                  onEditVehicle={(v) => {
                    setEditingVehicle(v);
                    setIsAddEditModalOpen(true);
                  }}
                  onShowQR={
                    isFeatureEnabled('VEHICLE_QR_CODES')
                      ? (v) => {
                          setQRModalVehicle(v);
                          setIsQRModalOpen(true);
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRIP HISTORY & AUDIT LOG */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* History Filters */}
          <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search Driver / Mission */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Search Driver / Mission / Vehicle
                </label>
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search trips..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue"
                  />
                </div>
              </div>

              {/* Vehicle Filter */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Vehicle
                </label>
                <select
                  value={historyVehicleFilter}
                  onChange={(e) => setHistoryVehicleFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
                >
                  <option value="All">All Vehicles</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.plate_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Trip Status
                </label>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
                >
                  <option value="All">All Statuses</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Date Filters */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
                  />
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* History List */}
          {historyLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <RefreshCw size={28} className="animate-spin text-taguig-blue" />
              <p className="text-xs font-bold uppercase tracking-wider">Loading Trip Logs...</p>
            </div>
          ) : historyTrips.length === 0 ? (
            <div className="py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 text-center p-6">
              <History size={36} className="mx-auto text-slate-400 mb-2" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                No trip records found
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Trips recorded through the Vehicle Monitor will be listed here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyTrips.map((trip) => {
                const isOngoing = trip.status === 'ongoing';
                return (
                  <div
                    key={trip.id}
                    className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm space-y-3"
                  >
                    {/* Header: Vehicle, Driver, Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/5">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2.5 rounded-2xl ${
                            isOngoing
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Car size={20} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-sm text-slate-900 dark:text-white">
                              {trip.vehicle?.name || 'Barangay Patrol'}
                            </span>
                            <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                              {trip.vehicle?.plate_number}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <User size={13} className="text-taguig-blue" />
                            <span>Driver: <strong>{trip.driver_name}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isOngoing ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            Ongoing Trip
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <CheckCircle2 size={13} className="text-emerald-500" />
                            Completed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mission Details & Times */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                          Mission / Purpose
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {trip.purpose}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                          Departure / Started
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {trip.started_at
                            ? new Date(trip.started_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                          Completed / Arrived
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {trip.completed_at
                            ? new Date(trip.completed_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : isOngoing
                            ? 'Currently in progress'
                            : 'N/A'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                          Odometer
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {trip.odometer_start !== null && trip.odometer_start !== undefined
                            ? `${trip.odometer_start} km`
                            : '—'}
                          {trip.odometer_end !== null && trip.odometer_end !== undefined
                            ? ` → ${trip.odometer_end} km`
                            : ''}
                          {trip.odometer_start && trip.odometer_end
                            ? ` (${(trip.odometer_end - trip.odometer_start).toFixed(1)} km)`
                            : ''}
                        </span>
                      </div>
                    </div>

                    {/* Crew & Stops Waypoint Log */}
                    {(trip.passengers?.length || 0) > 0 || (trip.stops?.length || 0) > 0 || trip.remarks ? (
                      <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs">
                        {/* Crew Passengers */}
                        {trip.passengers && trip.passengers.length > 0 && (
                          <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                            <Users size={14} className="text-taguig-blue shrink-0" />
                            <span>
                              <strong>Crew:</strong>{' '}
                              {trip.passengers.map((p) => p.passenger_name).join(', ')}
                            </span>
                          </div>
                        )}

                        {/* Waypoints */}
                        {trip.stops && trip.stops.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                              <MapPin size={12} />
                              <span>Waypoints & Stops ({trip.stops.length})</span>
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {trip.stops.map((stop, idx) => (
                                <div
                                  key={stop.id || idx}
                                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5"
                                >
                                  <MapPin size={11} className="text-taguig-blue" />
                                  <span>{stop.place}</span>
                                  {stop.arrival_time && (
                                    <span className="font-mono text-slate-400">
                                      {new Date(stop.arrival_time).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                  {stop.manual_time_reason && (
                                    <span
                                      title={`Manual Time Entry: ${stop.manual_time_reason}`}
                                      className="text-amber-500 text-[10px]"
                                    >
                                      *
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Remarks */}
                        {trip.remarks && (
                          <div className="text-slate-500 dark:text-slate-400 italic text-[11px]">
                            <strong>Remarks:</strong> {trip.remarks}
                          </div>
                        )}

                        {/* Photo Attachments */}
                        {isFeatureEnabled('PHOTO_ATTACHMENTS') && (
                          <AttachmentGallery
                            tripId={trip.id}
                            initialAttachments={trip.attachments}
                          />
                        )}
                      </div>
                    ) : (
                      isFeatureEnabled('PHOTO_ATTACHMENTS') ? (
                        <AttachmentGallery
                          tripId={trip.id}
                          initialAttachments={trip.attachments}
                        />
                      ) : null
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <StartTripModal
        vehicle={startModalVehicle}
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        onSuccess={() => {
          showToast(`Trip started successfully for ${startModalVehicle?.name}.`);
          fetchFleet(true);
        }}
      />

      <StopActionModal
        trip={stopModalTrip}
        mode={stopModalMode}
        activeStop={stopModalActiveStop}
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        onSuccess={() => {
          showToast(
            stopModalMode === 'arrival'
              ? 'Arrival waypoint stamped!'
              : 'Departure waypoint stamped!'
          );
          fetchFleet(true);
        }}
      />

      <EndTripModal
        trip={endModalTrip}
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        onSuccess={() => {
          showToast('Trip completed and checked in successfully!');
          fetchFleet(true);
        }}
      />

      {/* Vehicle QR Code Printable Modal */}
      {isFeatureEnabled('VEHICLE_QR_CODES') && (
        <VehicleQRModal
          vehicle={qrModalVehicle}
          allVehicles={vehicles}
          isOpen={isQRModalOpen}
          onClose={() => {
            setIsQRModalOpen(false);
            setQRModalVehicle(null);
          }}
        />
      )}

      {/* In-App Real-Time QR Camera Scanner Modal */}
      {isFeatureEnabled('VEHICLE_QR_CODES') && (
        <VehicleScannerModal
          isOpen={isScannerModalOpen}
          onClose={() => setIsScannerModalOpen(false)}
          onVehicleDetected={(vehicleId) => {
            setIsScannerModalOpen(false);
            handleVehicleQRAction(vehicleId);
          }}
        />
      )}

      {/* Dynamic Vehicle Creation & Edit Modal */}
      <AddEditVehicleModal
        vehicle={editingVehicle}
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingVehicle(null);
        }}
        onSuccess={() => {
          showToast(editingVehicle ? 'Vehicle details updated!' : 'New vehicle registered successfully!');
          fetchFleet(true);
        }}
      />
    </div>
  );
};

export default VehicleMonitor;

