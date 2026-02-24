
import React, { useEffect, useState, useCallback } from 'react';
import { incidentService } from '../services/incidentService';
import { resourceService } from '../services/resourceService';
import { userService } from '../services/userService';
import { systemService } from '../services/systemService';
import { IncidentWithDetails, DispatchLog, AssetRequest, UserProfile, PersonnelSchedule, CCTVRequest, CalendarActivity, ShiftType } from '../types';
import DispatchBottomSheet from '../components/DispatchBottomSheet';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Clock, MapPin, Car, AlertCircle, Users, Edit2, X, Check, FileText, Package, Shield, CheckCircle, ArrowRight, Loader2, ChevronDown, ChevronUp, History, Video, ClipboardList, ChevronRight, Printer, CalendarDays, Calendar, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { generateOfficialReport } from '../utils/pdfGenerator';
import PageHeader from '../components/PageHeader';

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
    isRoadClearing: boolean;
    statusState: {
        label: string;
        dot: string;
        badge: string;
    };
}

const CommandCenter: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const navigate = useNavigate();

    // Data States
    const [incidents, setIncidents] = useState<IncidentWithDetails[]>([]);
    const [assetRequests, setAssetRequests] = useState<AssetRequest[]>([]);
    const [cctvRequests, setCctvRequests] = useState<CCTVRequest[]>([]);
    const [activities, setActivities] = useState<CalendarActivity[]>([]);

    // Personnel list
    const [onDutyPersonnel, setOnDutyPersonnel] = useState<OnDutyPersonnel[]>([]);

    const [activeLogistics, setActiveLogistics] = useState<LogWithIncident[]>([]);
    const [selectedDispatch, setSelectedDispatch] = useState<DispatchLog | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingLogId, setUpdatingLogId] = useState<string | null>(null);

    // UI States
    const [editingIncident, setEditingIncident] = useState<IncidentWithDetails | null>(null);
    const [editingNarrative, setEditingNarrative] = useState<IncidentWithDetails | null>(null);
    const [tempNarrative, setTempNarrative] = useState('');
    const [showOnDutyModal, setShowOnDutyModal] = useState(false);

    // Activity Modal States
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [newActivity, setNewActivity] = useState({ title: '', description: '', event_date: '', shift: '1st' as ShiftType | 'All Day' });
    const [isSavingActivity, setIsSavingActivity] = useState(false);

    // Expanded Incident State
    const [expandedIncidentId, setExpandedIncidentId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            const currentHour = today.getHours();
            const isSaturday = today.getDay() === 6;

            const [incData, assetData, userData, dispatchData, scheduleData, cctvData, activityData] = await Promise.all([
                incidentService.getIncidents(),
                resourceService.getAssetRequests(),
                userService.getUsers(),
                resourceService.getDispatchHistory(),
                userService.getSchedules(todayStr, todayStr),
                resourceService.getCCTVRequests(),
                systemService.getActivities()
            ]);

            setIncidents(incData);
            setAssetRequests(assetData);
            setCctvRequests(cctvData);
            setActivities(activityData);

            const activeOnShift = userData.filter(u => u.status === 'active').reduce<OnDutyPersonnel[]>((acc, userProfile) => {
                const userSched = scheduleData.find((s: any) => s.user_id === userProfile.id);

                if (userSched) {
                    const currentHour = new Date().getHours();
                    let isOnShift = false;
                    if (userSched.shift === '1st' && (currentHour >= 6 && currentHour < 14)) isOnShift = true;
                    if (userSched.shift === '2nd' && (currentHour >= 14 && currentHour < 22)) isOnShift = true;
                    if (userSched.shift === '3rd' && (currentHour >= 22 || currentHour < 6)) isOnShift = true;

                    // Definitions for mapping
                    const stateUnavailable = { label: 'Unavailable', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
                    const stateOffDuty = { label: 'Off Duty', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' };
                    const stateOnDuty = { label: 'On Duty', dot: 'bg-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
                    const stateRoadClearing = { label: 'Road Ops', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' };

                    let finalState = stateOffDuty;
                    let isRoadClearing = false;

                    if (userSched.status === 'Leave' || userSched.status === 'Day Off') {
                        finalState = stateUnavailable;
                    } else if (isOnShift) {
                        const isRoadClearingTime = currentHour >= 8 && currentHour < 10;
                        isRoadClearing = userSched.status === 'Road Clearing' || (userSched.status === 'On Duty' && userSched.shift === '1st' && isSaturday && isRoadClearingTime);
                        finalState = isRoadClearing ? stateRoadClearing : stateOnDuty;
                    }

                    // Only show personnel who are either ON SHIFT or explicitly UNAVAILABLE (Red/Green/Orange)
                    // Gray (Off Duty) are hidden from the primary active list but counted in directory
                    if (userSched.status === 'Leave' || userSched.status === 'Day Off' || isOnShift) {
                        acc.push({
                            profile: userProfile,
                            schedule: userSched,
                            isRoadClearing,
                            statusState: finalState
                        });
                    }
                }
                return acc;
            }, []);

            setOnDutyPersonnel(activeOnShift);

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

        const channel = supabase
            .channel('dashboard_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_logs' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_requests' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cctv_requests' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'personnel_schedules' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_activities' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    useEffect(() => {
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleUpdateDispatch = async (id: string, updates: Partial<DispatchLog>) => {
        await resourceService.updateDispatchStatus(id, updates);
        showToast("Dispatch status updated", "success");
        fetchData();
    };

    const handleUpdateIncident = async (id: string, updates: any) => {
        try {
            await incidentService.updateIncident(id, updates);
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
            await resourceService.updateDispatchStatus(logId, { status: 'Clear' });
            showToast("Vehicle returned and logged", "success");
            setActiveLogistics(prev => prev.filter(item => item.id !== logId));
            fetchData();
        } catch (err) {
            console.error(err);
            showToast("Failed to update status", "error");
            fetchData();
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

    const toggleExpand = (id: string) => {
        setExpandedIncidentId(expandedIncidentId === id ? null : id);
    };

    const allActiveIncidents = incidents.filter(i => ['Pending', 'Dispatched'].includes(i.status));
    const pendingAssets = assetRequests.filter(r => r.status === 'Pending');

    const scrollToBlotter = () => {
        document.getElementById('blotter-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const openNarrativeEditor = (incident: IncidentWithDetails) => {
        setEditingNarrative(incident);
        setTempNarrative(incident.narrative || '');
    };

    const handleCreateActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSavingActivity(true);
        try {
            await systemService.createActivity({
                ...newActivity,
                created_by: user.id
            });
            showToast("Activity added successfully!", "success");
            setShowActivityModal(false);
            setNewActivity({ title: '', description: '', event_date: '', shift: '1st' });
            fetchData();
        } catch (error) {
            showToast("Failed to add activity", "error");
        } finally {
            setIsSavingActivity(false);
        }
    };

    const handleDeleteActivity = async (id: string) => {
        if (!confirm("Are you sure you want to delete this activity?")) return;
        try {
            await systemService.deleteActivity(id);
            fetchData();
            showToast("Activity deleted", "success");
        } catch (error) {
            showToast("Failed to delete activity", "error");
        }
    };

    // Calculate Current Shift
    const currentHourLocal = new Date().getHours();
    let computedActiveShift = 'Unknown';
    if (currentHourLocal >= 6 && currentHourLocal < 14) computedActiveShift = '1st';
    else if (currentHourLocal >= 14 && currentHourLocal < 22) computedActiveShift = '2nd';
    else computedActiveShift = '3rd';

    // Get Today's Date String
    const todayStrLocal = getLocalDateStr(new Date());

    // Activities for logged in user's shift today
    const activeActivitiesForShift = activities.filter(a => {
        return a.event_date === todayStrLocal && (a.shift === 'All Day' || a.shift === computedActiveShift);
    });

    // Determine logged in user's shift status to display alert
    const userScheduleToday = onDutyPersonnel.find(p => p.profile.id === user?.id);
    const shouldShowActivityAlert = activeActivitiesForShift.length > 0 &&
        (user?.role === 'supervisor' || (userScheduleToday && userScheduleToday.schedule.shift === computedActiveShift));

    // For upcoming activities in right rail
    const upcomingActivities = activities.filter(a => new Date(a.event_date) >= new Date(todayStrLocal)).slice(0, 4);

    // Helpers
    function getLocalDateStr(date: Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return (
        <div className="space-y-8 pb-20">
            {shouldShowActivityAlert && (
                <div className="bg-taguig-blue text-white p-4 rounded-3xl shadow-lg border-2 border-taguig-blue flex items-start md:items-center justify-between gap-4 animate-slide-down">
                    <div className="flex items-center space-x-4">
                        <div className="bg-white/20 p-3 rounded-2xl flex-shrink-0 animate-pulse">
                            <CalendarDays size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-lg font-display tracking-tight leading-tight">Attention {computedActiveShift} Shift Personnel!</h3>
                            <p className="text-sm font-medium text-white/90">You have {activeActivitiesForShift.length} scheduled {activeActivitiesForShift.length === 1 ? 'activity' : 'activities'} today.</p>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader
                title="Command Center"
                subtitle="Main Control Center • Post Proper Northside"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                <div onClick={scrollToBlotter} className="glass-panel p-6 md:p-8 rounded-[2.5rem] flex items-center space-x-6 cursor-pointer hover:shadow-premium transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-taguig-red/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <div className="p-4 md:p-5 bg-taguig-red text-white rounded-2xl shadow-lg shadow-taguig-red/20 group-hover:scale-110 transition-transform relative z-10">
                        <AlertCircle size={28} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-1">{t.activeIncidents}</p>
                        <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white font-display">{allActiveIncidents.length}</p>
                    </div>
                </div>

                <div onClick={() => navigate('/resources')} className="glass-panel p-6 md:p-8 rounded-[2.5rem] flex items-center space-x-6 cursor-pointer hover:shadow-premium transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-taguig-blue/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <div className="p-4 md:p-5 bg-taguig-blue text-white rounded-2xl shadow-lg shadow-taguig-blue/20 group-hover:scale-110 transition-transform relative z-10">
                        <Package size={28} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-1">Equipment for Approval</p>
                        <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white font-display">{pendingAssets.length}</p>
                    </div>
                </div>

                <div onClick={() => setShowOnDutyModal(true)} className="glass-panel p-6 md:p-8 rounded-[2.5rem] flex items-center space-x-6 cursor-pointer hover:shadow-premium transition-all group relative overflow-hidden sm:col-span-2 lg:col-span-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <div className="p-4 md:p-5 bg-green-600 text-white rounded-2xl shadow-lg shadow-green-500/20 group-hover:scale-110 transition-transform relative z-10">
                        <Users size={28} />
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse shadow-md"></span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-1">{t.onDuty}</p>
                        <p className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white font-display">{onDutyPersonnel.filter(p => p.statusState.label !== 'Unavailable').length}</p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-white"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    <div className="xl:col-span-2 space-y-6" id="blotter-section">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center justify-between">
                            {t.recentEntries}
                        </h2>

                        <div className="grid gap-6 animate-fade-in">
                            {allActiveIncidents.length === 0 && (
                                <div className="glass-panel p-8 text-center rounded-3xl border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                    <CheckCircle size={40} className="mx-auto mb-3 opacity-30" />
                                    <p className="font-medium font-display">No pending or active incidents. Good job!</p>
                                </div>
                            )}

                            {allActiveIncidents.slice(0, 10).map((incident) => (
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
                                            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-display uppercase tracking-tight">{incident.type}</h3>
                                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm line-clamp-2 font-medium bg-slate-50/50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">{incident.narrative}</p>
                                            <div className="flex flex-wrap items-center text-xs text-slate-500 dark:text-slate-400 font-bold pt-2 gap-2">
                                                <span className="flex items-center"><MapPin size={14} className="mr-1" />{incident.location}</span>
                                                <span className="hidden md:inline">•</span>
                                                <span className="flex items-center"><Clock size={14} className="mr-1" />{new Date(incident.created_at).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <div className="w-full md:w-60 flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pl-6 flex flex-col gap-3">
                                            {user?.role === 'supervisor' && (
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => setEditingIncident(incident)}
                                                        className="flex-1 flex items-center justify-center space-x-1 py-2.5 bg-taguig-blue/5 dark:bg-taguig-blue/20 text-taguig-blue dark:text-taguig-gold rounded-xl text-xs font-bold hover:bg-taguig-blue/10 transition-all border border-taguig-blue/10"
                                                    >
                                                        <Edit2 size={14} />
                                                        <span>Status</span>
                                                    </button>
                                                    <button
                                                        onClick={() => openNarrativeEditor(incident)}
                                                        className="flex-1 flex items-center justify-center space-x-1 py-2.5 bg-taguig-red/5 dark:bg-taguig-red/20 text-taguig-red dark:text-taguig-red rounded-xl text-xs font-bold hover:bg-taguig-red/10 transition-all border border-taguig-red/10"
                                                    >
                                                        <FileText size={14} />
                                                        <span>Narrative</span>
                                                    </button>
                                                </div>
                                            )}

                                            {incident.dispatch_logs && incident.dispatch_logs.length > 0 ? (
                                                <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Dispatch Unit</p>
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <Car size={16} className="text-slate-600 dark:text-slate-300 flex-shrink-0" />
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{incident.dispatch_logs[0].unit_name}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setSelectedDispatch(incident.dispatch_logs![0])}
                                                        className={`w-full py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${incident.dispatch_logs[0].status === 'En Route' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                                                            incident.dispatch_logs[0].status === 'On Scene' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
                                                                'bg-green-100 text-green-700 dark:bg-green-900 text-green-700 dark:text-green-300'
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

                                            <button
                                                onClick={() => toggleExpand(incident.id)}
                                                className="w-full py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center space-x-1"
                                            >
                                                {expandedIncidentId === incident.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                <span>{expandedIncidentId === incident.id ? 'Hide Details' : 'View Details'}</span>
                                            </button>

                                            <button
                                                onClick={() => generateOfficialReport(incident)}
                                                className="w-full py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors flex items-center justify-center space-x-1"
                                            >
                                                <Printer size={14} />
                                                <span>Print Record</span>
                                            </button>
                                        </div>
                                    </div>

                                    {expandedIncidentId === incident.id && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 animate-slide-down">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                                                        <Users size={14} className="mr-2" /> Involved Parties ({incident.parties?.length || 0})
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {incident.parties?.length === 0 && <p className="text-sm text-slate-500 italic">No parties recorded.</p>}
                                                        {incident.parties?.map(p => (
                                                            <div key={p.id} className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{p.name}</span>
                                                                    <span className="text-xs px-2 py-0.5 bg-white dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600 text-slate-500">{p.role}</span>
                                                                </div>
                                                                {p.contact_info && <div className="text-xs text-slate-500 mt-1">{p.contact_info}</div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                                                        <History size={14} className="mr-2" /> Dispatch History
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {incident.dispatch_logs?.length === 0 && <p className="text-sm text-slate-500 italic">No dispatch logs.</p>}
                                                        {incident.dispatch_logs?.map(log => (
                                                            <div key={log.id} className="flex justify-between items-center bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700 text-sm">
                                                                <div>
                                                                    <div className="font-bold text-slate-700 dark:text-slate-200">{log.unit_name}</div>
                                                                    <div className="text-xs text-slate-500">{new Date(log.updated_at).toLocaleString()}</div>
                                                                </div>
                                                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${log.status === 'On Scene' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                                                    log.status === 'En Route' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                                    }`}>
                                                                    {log.status}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

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
                                                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${log.status === 'On Scene' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' :
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
                                            className="w-full flex items-center justify-center space-x-2 py-3 bg-taguig-navy dark:bg-taguig-blue text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-taguig-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {updatingLogId === log.id ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    <span>Processing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle size={16} />
                                                    <span>Mark Mission Complete</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* UPCOMING ACTIVITIES SECTION */}
                        <div className="space-y-4 pt-4">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center justify-between">
                                Upcoming Activities
                                {user?.role === 'supervisor' && (
                                    <button
                                        onClick={() => setShowActivityModal(true)}
                                        className="p-2 bg-taguig-blue/10 text-taguig-blue rounded-xl hover:bg-taguig-blue hover:text-white transition-all group"
                                        title="Add Activity"
                                    >
                                        <Plus size={16} />
                                    </button>
                                )}
                            </h2>

                            <div className="space-y-3">
                                {upcomingActivities.length === 0 ? (
                                    <div className="glass-panel p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
                                        <Calendar className="mx-auto mb-2 text-slate-300" size={24} />
                                        <p className="text-xs text-slate-400 font-medium">No upcoming activities scheduled.</p>
                                    </div>
                                ) : (
                                    upcomingActivities.map((activity) => (
                                        <div key={activity.id} className="glass-panel p-4 rounded-3xl border border-white/60 dark:border-white/10 hover:shadow-premium transition-all group overflow-hidden relative">
                                            <div className="flex items-start justify-between relative z-10">
                                                <div className="flex items-start space-x-3">
                                                    <div className={`p-2.5 rounded-2xl flex-shrink-0 ${activity.event_date === todayStrLocal ? 'bg-taguig-blue text-white shadow-lg shadow-taguig-blue/20 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                        <CalendarDays size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 group-hover:text-taguig-blue transition-colors">
                                                            {activity.title}
                                                        </p>
                                                        <div className="flex items-center space-x-2 mt-1">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                                {activity.shift} Shift
                                                            </span>
                                                            <span className="text-[10px] text-slate-300">•</span>
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                {new Date(activity.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {user?.role === 'supervisor' && (
                                                    <button
                                                        onClick={() => handleDeleteActivity(activity.id)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            {activity.description && (
                                                <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic border-t border-slate-50 dark:border-slate-700 pt-2">
                                                    {activity.description}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* RECENT REQUESTS FOOTPRINT */}
                        <div className="space-y-4 pt-4">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center justify-between">
                                Recent Requests
                            </h2>
                            <div className="space-y-3">
                                {isLoading ? (
                                    <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>
                                ) : (
                                    <>
                                        {[...cctvRequests.slice(0, 2), ...assetRequests.slice(0, 2)]
                                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                            .slice(0, 4)
                                            .map((req: any) => (
                                                <div key={req.id} className="glass-panel p-4 rounded-2xl border border-white/60 dark:border-white/10 flex items-center justify-between hover:scale-[1.02] transition-all cursor-pointer" onClick={() => navigate('/resources')}>
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`p-2 rounded-lg ${req.request_number ? 'bg-red-50 text-red-500' : 'bg-purple-50 text-purple-500'}`}>
                                                            {req.request_number ? <Video size={16} /> : <Package size={16} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                                                                {req.requester_name || req.borrower_name}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                                                                {req.request_number ? 'CCTV' : 'Asset'} • {new Date(req.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={14} className="text-slate-300" />
                                                </div>
                                            ))
                                        }
                                        {cctvRequests.length === 0 && assetRequests.length === 0 && (
                                            <p className="text-center text-xs text-slate-400 italic py-4">No recent requests.</p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedDispatch && (
                <DispatchBottomSheet
                    dispatchLog={selectedDispatch}
                    availableOfficers={onDutyPersonnel.map(o => o.profile)}
                    onClose={() => setSelectedDispatch(null)}
                    onUpdate={handleUpdateDispatch}
                />
            )}

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
                                {onDutyPersonnel.map(({ profile, schedule, statusState }) => (
                                    <div key={profile.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-100 dark:border-slate-600">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-10 h-10 rounded-full ${statusState.dot} flex items-center justify-center font-bold text-white border-2 border-white dark:border-slate-600 overflow-hidden`}>
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    profile.full_name.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-white">{profile.full_name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{profile.badge_number || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border shadow-sm ${statusState.badge}`}>
                                                <Clock size={10} className="mr-1.5" />
                                                {statusState.label}
                                            </span>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1">{schedule.shift} Shift</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {editingIncident && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Update Status</h3>
                        <div className="space-y-3">
                            {['Pending', 'Dispatched', 'Resolved', 'Closed'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => handleUpdateIncident(editingIncident.id, { status: s })}
                                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-between ${editingIncident.status === s
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

            {editingNarrative && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Update Narrative</h3>
                        <textarea
                            className="w-full h-40 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none font-medium"
                            value={tempNarrative}
                            onChange={(e) => setTempNarrative(e.target.value)}
                            placeholder="Enter details about the incident..."
                        />
                        <div className="flex space-x-3 mt-4">
                            <button
                                onClick={() => setEditingNarrative(null)}
                                className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleUpdateIncident(editingNarrative.id, { narrative: tempNarrative })}
                                className="flex-1 py-3 bg-amber-50 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:bg-amber-600"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showActivityModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 relative">
                        <button
                            onClick={() => setShowActivityModal(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 dark:text-gray-400"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                            <CalendarDays className="mr-2 text-taguig-blue" />
                            Add Activity
                        </h3>

                        <form onSubmit={handleCreateActivity} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Activity Title</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-taguig-blue/50 dark:text-white"
                                    placeholder="e.g. VIP Visit Escort"
                                    value={newActivity.title}
                                    onChange={e => setNewActivity({ ...newActivity, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Date</label>
                                <input
                                    required
                                    type="date"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-taguig-blue/50 dark:text-white"
                                    value={newActivity.event_date}
                                    onChange={e => setNewActivity({ ...newActivity, event_date: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Designated Shift</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-taguig-blue/50 dark:text-white"
                                    value={newActivity.shift}
                                    onChange={e => setNewActivity({ ...newActivity, shift: e.target.value as any })}
                                >
                                    <option value="All Day">All Day</option>
                                    <option value="1st">1st Shift</option>
                                    <option value="2nd">2nd Shift</option>
                                    <option value="3rd">3rd Shift</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Description (Optional)</label>
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-taguig-blue/50 dark:text-white resize-none h-24"
                                    placeholder="Provide additional details..."
                                    value={newActivity.description}
                                    onChange={e => setNewActivity({ ...newActivity, description: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSavingActivity}
                                className="w-full py-4 mt-2 bg-taguig-blue text-white rounded-2xl font-black uppercase tracking-widest text-[13px] hover:bg-taguig-navy hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-taguig-blue/20 flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSavingActivity ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} />
                                        <span>Save Activity</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CommandCenter;
