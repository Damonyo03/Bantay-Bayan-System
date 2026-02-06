
import React, { useEffect, useState, useCallback } from 'react';
import { supabaseService } from '../services/supabaseService';
import { IncidentWithDetails, DispatchLog, AssetRequest, UserProfile, PersonnelSchedule } from '../types';
import DispatchBottomSheet from '../components/DispatchBottomSheet';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Clock, MapPin, Car, AlertCircle, TrendingUp, Users, Edit2, X, Check, FileText, Package, ChevronRight, Shield, BadgeCheck, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

// Local interface for vehicle logs on dashboard
interface LogWithIncident extends DispatchLog {
    incidents?: {
        type: string;
        narrative: string;
        location: string;
    } | null;
}

// Interface for Combined User + Schedule data
interface OnDutyPersonnel {
    profile: UserProfile;
    schedule: PersonnelSchedule;
}

const CommandCenter: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  // Data States
  const [incidents, setIncidents] = useState<IncidentWithDetails[]>([]);
  const [assetRequests, setAssetRequests] = useState<AssetRequest[]>([]);
  
  // REPLACED activeUsers with specific OnDuty list
  const [onDutyPersonnel, setOnDutyPersonnel] = useState<OnDutyPersonnel[]>([]);
  
  const [activeLogistics, setActiveLogistics] = useState<LogWithIncident[]>([]);
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingLogId, setUpdatingLogId] = useState<string | null>(null);
  
  // UI States
  const [editingIncident, setEditingIncident] = useState<IncidentWithDetails | null>(null);
  const [editingNarrative, setEditingNarrative] = useState<IncidentWithDetails | null>(null);
  const [showOnDutyModal, setShowOnDutyModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // 1. Calculate Today's Date properly (Local Time)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      const currentHour = today.getHours();

      // 2. Fetch Data Parallel
      const [incData, assetData, userData, dispatchData, scheduleData] = await Promise.all([
          supabaseService.getIncidents(),
          supabaseService.getAssetRequests(),
          supabaseService.getUsers(),
          supabaseService.getDispatchHistory(),
          supabaseService.getSchedules(todayStr, todayStr) // Strict range: today only
      ]);
      
      setIncidents(incData);
      setAssetRequests(assetData);

      // 3. Filter Active Personnel based on Schedule AND Shift Time
      const activeOnShift = userData.filter(u => u.status === 'active').reduce<OnDutyPersonnel[]>((acc, userProfile) => {
          // Find schedule for this user today
          const userSched = scheduleData.find((s: any) => s.user_id === userProfile.id);
          
          if (userSched) {
              // Must be On Duty or Road Clearing
              if (userSched.status === 'On Duty' || userSched.status === 'Road Clearing') {
                  
                  // Strict Shift Time Checking
                  let isOnShift = false;
                  // 1st Shift: 6:00 AM - 2:00 PM (14:00)
                  if (userSched.shift === '1st' && (currentHour >= 6 && currentHour < 14)) isOnShift = true;
                  // 2nd Shift: 2:00 PM - 10:00 PM (22:00)
                  if (userSched.shift === '2nd' && (currentHour >= 14 && currentHour < 22)) isOnShift = true;
                  // 3rd Shift: 10:00 PM - 6:00 AM
                  if (userSched.shift === '3rd' && (currentHour >= 22 || currentHour < 6)) isOnShift = true;

                  if (isOnShift) {
                      acc.push({ profile: userProfile, schedule: userSched });
                  }
              }
          }
          return acc;
      }, []);

      setOnDutyPersonnel(activeOnShift);
      
      // Filter active vehicle logistics (Anything not 'Clear').
      const activeLogs = (dispatchData as LogWithIncident[]).filter(
          log => log.status !== 'Clear'
      );
      setActiveLogistics(activeLogs);

    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Realtime Subscription
    const channel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_logs' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_requests' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personnel_schedules' }, () => fetchData()) // Listen to schedule changes
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Refresh data every minute to check for Shift Changes
  useEffect(() => {
      const interval = setInterval(fetchData, 60000);
      return () => clearInterval(interval);
  }, [fetchData]);

  const handleUpdateDispatch = async (id: string, updates: Partial<DispatchLog>) => {
    await supabaseService.updateDispatchStatus(id, updates);
    showToast("Dispatch status updated", "success");
    fetchData(); // Force refresh
  };

  const handleUpdateIncident = async (id: string, updates: any) => {
      try {
          await supabaseService.updateIncident(id, updates);
          setEditingIncident(null);
          setEditingNarrative(null);
          showToast("Incident record updated successfully", "success");
          fetchData();
      } catch (err) {
          showToast("Failed to update incident", "error");
      }
  };

  const handleLogReturn = async (logId: string) => {
      setUpdatingLogId(logId);
      try {
          // Perform update
          await supabaseService.updateDispatchStatus(logId, { status: 'Clear' });
          showToast("Vehicle returned and logged", "success");
          
          // Optimistic update: Remove from UI immediately
          setActiveLogistics(prev => prev.filter(item => item.id !== logId));
          
          // Re-fetch to ensure background consistency
          fetchData();
      } catch (err) {
          console.error(err);
          showToast("Failed to update status", "error");
          fetchData(); // Revert on error
      } finally {
          setUpdatingLogId(null);
      }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      case 'Dispatched': return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case 'Resolved': return 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'Closed': return 'bg-gray-50 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  const parseVehicleLog = (unitName: string) => {
      const parts = unitName.split(' - ');
      if (parts.length >= 2) {
          return { vehicle: parts[0], personnel: parts.slice(1).join(' - ') };
      }
      return { vehicle: unitName, personnel: 'Unassigned' };
  };

  // Filter for dashboard display
  // Active incidents are strictly 'Pending' or 'Dispatched'. 
  // 'Resolved' and 'Closed' cases are considered inactive/archived.
  const allActiveIncidents = incidents.filter(i => ['Pending', 'Dispatched'].includes(i.status));
  const pendingAssets = assetRequests.filter(r => r.status === 'Pending');

  // List View Filter: Same logic as stats, show only 'Pending' and 'Dispatched'. 
  const dashboardListIncidents = allActiveIncidents;

  const scrollToBlotter = () => {
    document.getElementById('blotter-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-2">
        <div>
            {/* TEXT COLOR UPDATED TO WHITE FOR DARK BACKGROUND */}
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{t.dashboard}</h1>
            <p className="text-slate-500 dark:text-slate-300 mt-1 md:mt-2 text-sm md:text-base">
                {t.welcome}, {user?.full_name}.
            </p>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Active Incidents - Scroll to Blotter */}
        <div 
            onClick={scrollToBlotter}
            className="glass-panel p-5 md:p-6 rounded-3xl flex items-center space-x-4 cursor-pointer hover:shadow-lg transition-all group"
        >
            <div className="p-3 md:p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl group-hover:scale-110 transition-transform">
                <AlertCircle size={24} />
            </div>
            <div>
                <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.activeIncidents}</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{allActiveIncidents.length}</p>
            </div>
        </div>

        {/* Pending Requests - Navigate to Resources */}
        <div 
            onClick={() => navigate('/resources')}
            className="glass-panel p-5 md:p-6 rounded-3xl flex items-center space-x-4 cursor-pointer hover:shadow-lg transition-all group"
        >
            <div className="p-3 md:p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:scale-110 transition-transform">
                <Package size={24} />
            </div>
            <div>
                <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Requests</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{pendingAssets.length}</p>
            </div>
        </div>

        {/* On Duty - Open Modal */}
        <div 
            onClick={() => setShowOnDutyModal(true)}
            className="glass-panel p-5 md:p-6 rounded-3xl flex items-center space-x-4 cursor-pointer hover:shadow-lg transition-all group sm:col-span-2 lg:col-span-1"
        >
            <div className="p-3 md:p-4 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl group-hover:scale-110 transition-transform relative">
                <Users size={24} />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white animate-pulse"></span>
            </div>
            <div>
                <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.onDuty}</p>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{onDutyPersonnel.length}</p>
            </div>
        </div>
      </div>

      {isLoading ? (
         <div className="flex items-center justify-center h-48">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-white"></div>
         </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* LEFT COL: INCIDENTS (Blotter) */}
            <div className="xl:col-span-2 space-y-6" id="blotter-section">
                 <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center justify-between">
                    {t.recentEntries}
                 </h2>

                {/* CARD VIEW ONLY */}
                <div className="grid gap-6 animate-fade-in">
                    {dashboardListIncidents.length === 0 && (
                        <div className="glass-panel p-8 text-center rounded-3xl border-dashed border-gray-300 dark:border-gray-700 text-slate-400">
                             <CheckCircle size={40} className="mx-auto mb-3 opacity-30" />
                             <p>No pending or active incidents. Good job!</p>
                        </div>
                    )}

                    {dashboardListIncidents.slice(0, 10).map((incident) => (
                        <div key={incident.id} className="glass-panel p-5 md:p-6 rounded-3xl border border-white/60 dark:border-white/10 transition-all hover:shadow-lg">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 md:gap-6">
                                <div className="flex-1 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-bold">{incident.case_number}</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(incident.status)}`}>
                                        {incident.status}
                                        </span>
                                        {incident.is_restricted_entry && (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white shadow-sm">Restricted</span>
                                        )}
                                    </div>
                                    <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">{incident.type}</h3>
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm line-clamp-2 font-medium">{incident.narrative}</p>
                                    <div className="flex flex-wrap items-center text-xs text-slate-500 dark:text-slate-400 font-bold pt-2 gap-2">
                                        <span className="flex items-center"><MapPin size={14} className="mr-1" />{incident.location}</span>
                                        <span className="hidden md:inline">•</span>
                                        <span className="flex items-center"><Clock size={14} className="mr-1" />{new Date(incident.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                {/* Right Column: Admin Actions & Dispatch */}
                                <div className="w-full md:w-60 flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pl-6 flex flex-col gap-3">
                                    
                                    {/* SUPERVISOR EDIT ACTIONS */}
                                    {user?.role === 'supervisor' && (
                                        <div className="flex space-x-2">
                                            <button 
                                                onClick={() => setEditingIncident(incident)}
                                                className="flex-1 flex items-center justify-center space-x-1 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                                title="Edit Record"
                                            >
                                                <Edit2 size={14} />
                                                <span>Edit</span>
                                            </button>
                                            <button 
                                                onClick={() => setEditingNarrative(incident)}
                                                className="flex-1 flex items-center justify-center space-x-1 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 rounded-xl text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                                                title="Edit Narrative"
                                            >
                                                <FileText size={14} />
                                                <span>Note</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* Dispatch Status Display */}
                                    {incident.dispatch_logs && incident.dispatch_logs.length > 0 ? (
                                        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Dispatch Unit</p>
                                            <div className="flex items-center space-x-2 mb-2">
                                                <Car size={16} className="text-slate-600 dark:text-slate-300 flex-shrink-0"/>
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{incident.dispatch_logs[0].unit_name}</span>
                                            </div>
                                            <button
                                                onClick={() => setSelectedDispatch(incident.dispatch_logs![0])}
                                                className={`w-full py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                                                    incident.dispatch_logs[0].status === 'En Route' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                                                    incident.dispatch_logs[0].status === 'On Scene' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                                                    'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                                }`}
                                            >
                                                {incident.dispatch_logs[0].status}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                            <p className="text-xs text-gray-400 font-medium">No active dispatch</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT COL: Active Logistics Quick Box */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center justify-between">
                    Active Resources
                    <button onClick={() => navigate('/resources')} className="text-xs font-bold bg-white/50 dark:bg-white/10 px-3 py-1 rounded-lg hover:bg-white dark:hover:bg-white/20 transition-colors flex items-center">
                        View All <ArrowRight size={12} className="ml-1" />
                    </button>
                </h2>
                
                <div className="space-y-4 animate-fade-in">
                    {activeLogistics.length === 0 && (
                        <div className="glass-panel p-6 rounded-3xl border border-white/60 dark:border-white/10 text-center text-slate-400">
                            <Car size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No vehicles currently dispatched.</p>
                        </div>
                    )}

                    {activeLogistics.map((log) => {
                        const details = parseVehicleLog(log.unit_name);
                        return (
                            <div key={log.id} className="glass-panel p-5 rounded-3xl border border-white/60 dark:border-white/10 hover:shadow-lg transition-all group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
                                            <Car size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{details.vehicle}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                {new Date(log.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                        log.status === 'On Scene' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' : 
                                        log.status === 'Returning' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                                        'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                                    }`}>
                                        {log.status}
                                    </span>
                                </div>
                                
                                <div className="space-y-2 mb-4">
                                     <div className="bg-white/50 dark:bg-white/5 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Assigned To</p>
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">{details.personnel}</p>
                                     </div>
                                     <div className="bg-white/50 dark:bg-white/5 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Location / Purpose</p>
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                                            {log.incidents?.location || log.incidents?.narrative}
                                        </p>
                                     </div>
                                </div>

                                <button 
                                    onClick={() => handleLogReturn(log.id)}
                                    disabled={updatingLogId === log.id}
                                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-black dark:hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {updatingLogId === log.id ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Updating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Clock size={14} />
                                            <span>Log Return / Clear</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {selectedDispatch && (
        <DispatchBottomSheet 
          dispatchLog={selectedDispatch} 
          availableOfficers={onDutyPersonnel.map(o => o.profile)}
          onClose={() => setSelectedDispatch(null)}
          onUpdate={handleUpdateDispatch}
        />
      )}

      {/* On Duty Modal */}
      {showOnDutyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 relative">
                  <button 
                      onClick={() => setShowOnDutyModal(false)}
                      className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600"
                  >
                      <X size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                      <Users className="mr-2 text-green-600" />
                      Personnel On Shift
                  </h3>
                  
                  {onDutyPersonnel.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl">
                          <p>No personnel scheduled for the current shift.</p>
                      </div>
                  ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {onDutyPersonnel.map(({ profile, schedule }) => {
                            const currentHour = new Date().getHours();
                            const isRoadClearingTime = currentHour >= 8 && currentHour < 10;
                            const isRoadClearing = schedule.status === 'Road Clearing' || (schedule.status === 'On Duty' && schedule.shift === '1st' && isRoadClearingTime);
                            
                            return (
                                <div key={profile.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-100 dark:border-slate-600">
                                    <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center font-bold text-slate-600 dark:text-white">
                                                {profile.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">{profile.full_name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{profile.badge_number} • {profile.role}</p>
                                            </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${
                                            isRoadClearing 
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' 
                                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                isRoadClearing ? 'bg-amber-500' : 'bg-green-500'
                                            }`}></span>
                                            {schedule.shift} Shift
                                        </span>
                                        {isRoadClearing && (
                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">Road Clearing</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                  )}
              </div>
          </div>
      )}

      {/* Edit Incident Modal */}
      {editingIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Update Status</h3>
                  <div className="space-y-3">
                      {['Pending', 'Dispatched', 'Resolved', 'Closed'].map((s) => (
                          <button
                              key={s}
                              onClick={() => handleUpdateIncident(editingIncident.id, { status: s })}
                              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-between ${
                                  editingIncident.status === s 
                                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                                  : 'bg-gray-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600'
                              }`}
                          >
                              <span>{s}</span>
                              {editingIncident.status === s && <Check size={18} />}
                          </button>
                      ))}
                  </div>
                  <button 
                    onClick={() => setEditingIncident(null)}
                    className="w-full mt-4 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl"
                  >
                      Cancel
                  </button>
              </div>
          </div>
      )}

      {/* Edit Narrative Modal */}
      {editingNarrative && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Update Narrative</h3>
                  <textarea 
                      className="w-full h-40 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      defaultValue={editingNarrative.narrative}
                      id="narrative-edit"
                  />
                  <div className="flex space-x-3 mt-4">
                      <button 
                        onClick={() => setEditingNarrative(null)}
                        className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={() => {
                            const val = (document.getElementById('narrative-edit') as HTMLTextAreaElement).value;
                            handleUpdateIncident(editingNarrative.id, { narrative: val });
                        }}
                        className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:bg-amber-600"
                      >
                          Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default CommandCenter;
