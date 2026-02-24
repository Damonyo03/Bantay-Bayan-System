
import React, { useEffect, useState } from 'react';
import { resourceService } from '../services/resourceService';
import { userService } from '../services/userService';
import { AssetRequest, DispatchLog, UserProfile, CCTVRequest, AuditLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Package, Plus, CheckCircle, XCircle, Truck, RotateCcw, Printer, AlertTriangle, RefreshCw, Archive, Clock, CalendarCheck, Car, MapPin, Navigation, CheckSquare, X, Loader2, Video, User, History, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import { generateBorrowingSlip, reprintCCTVForm, generateVehicleLog } from '../utils/pdfGenerator';
import { PersonnelSchedule as PersonnelScheduleType } from '../types';

interface LogWithIncident extends DispatchLog {
    incidents?: {
        type: string;
        narrative: string;
        location: string;
    } | null;
}

const VEHICLE_DATA = [
    { name: "Trimo #1", plate: "1312 - 0438584" },
    { name: "Trimo #2", plate: "1312 - 0438585" },
    { name: "Trimo #3", plate: "For Registration" },
    { name: "Transformative #1", plate: "SNN 3519" },
    { name: "Transformative #2", plate: "SNN 2501" },
    { name: "APY", plate: "SNN 1977" },
    { name: "L300", plate: "1312 - 0438510" },
    { name: "Traviz", plate: "SNA 5654" },
    { name: "Ambulance (Innova)", plate: "1301 - 2076919" },
    { name: "Red Plate", plate: "SND 7512" },
    { name: "Harabas", plate: "SNA 8450" },
    { name: "Revo", plate: "XJF 830" },
    { name: "New Ambulance", plate: "CNB 1823" },
    { name: "Foot Patrol / Walking", plate: "N/A" },
    { name: "Command Post", plate: "N/A" }
];

const VEHICLE_OPTIONS = VEHICLE_DATA.map(v => v.name);

const ResourceTracking: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [requests, setRequests] = useState<AssetRequest[]>([]);
    const [cctvRequests, setCctvRequests] = useState<CCTVRequest[]>([]);
    const [dispatchLogs, setDispatchLogs] = useState<LogWithIncident[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [updatingLogId, setUpdatingLogId] = useState<string | null>(null);
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const [requestHistory, setRequestHistory] = useState<AuditLog[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [todaySchedule, setTodaySchedule] = useState<PersonnelScheduleType[]>([]);

    const [filter, setFilter] = useState<'Pending' | 'Scheduled' | 'History' | 'Vehicles' | 'CCTV'>('Pending');

    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [usersList, setUsersList] = useState<UserProfile[]>([]);
    const [vehicleForm, setVehicleForm] = useState({
        vehicle: 'Trimo 1',
        officers: [] as string[],
        destination: '',
        purpose: ''
    });
    const [currentOfficerSelect, setCurrentOfficerSelect] = useState('');

    useEffect(() => {
        fetchRequests();
        fetchCCTV();
        fetchUsers();
        fetchTodaySchedule();

        const channel = supabase
            .channel('assets_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_requests' }, () => fetchRequests())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cctv_requests' }, () => fetchCCTV())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_logs' }, () => {
                if (filter === 'Vehicles') fetchDispatchHistory();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, []);

    useEffect(() => {
        if (filter === 'Vehicles') {
            fetchDispatchHistory();
        }
    }, [filter]);

    const fetchUsers = async () => {
        try {
            const data = await userService.getUsers();
            setUsersList(data.filter(u => u.status === 'active'));
        } catch (e) {
            console.error("Failed to load users", e);
        }
    };

    const fetchTodaySchedule = async () => {
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;
            const data = await userService.getSchedules(todayStr, todayStr);
            setTodaySchedule(data);
        } catch (e) {
            console.error("Failed to fetch today's schedule", e);
        }
    };

    const isOfficerOnDuty = (fullName: string) => {
        const officer = usersList.find(u => u.full_name === fullName);
        if (!officer) return false;

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const schedule = todaySchedule.find(s => s.user_id === officer.id && s.date === todayStr);
        if (!schedule || schedule.status !== 'On Duty') return false;

        const currentHour = today.getHours();
        if (schedule.shift === '1st' && (currentHour >= 6 && currentHour < 14)) return true;
        if (schedule.shift === '2nd' && (currentHour >= 14 && currentHour < 22)) return true;
        if (schedule.shift === '3rd' && (currentHour >= 22 || currentHour < 6)) return true;

        return false;
    };

    const fetchRequests = async () => {
        if (filter === 'Vehicles' || filter === 'CCTV') return;
        setLoading(true);
        setError(null);
        try {
            const data = await resourceService.getAssetRequests();
            setRequests(data);
        } catch (err: any) {
            console.error("Resource fetch error:", err);
            setError("Failed to load resource data.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCCTV = async () => {
        try {
            const data = await resourceService.getCCTVRequests();
            setCctvRequests(data);
        } catch (e) { console.error(e); }
    };

    const fetchDispatchHistory = async () => {
        setLoading(true);
        try {
            const data = await resourceService.getDispatchHistory();
            setDispatchLogs(data as LogWithIncident[]);
        } catch (err: any) {
            console.error(err);
            showToast("Failed to load vehicle logs", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchRequestHistory = async (requestId: string) => {
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*, profiles:performed_by (full_name)')
                .eq('table_name', 'asset_requests')
                .eq('record_id', requestId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setRequestHistory(data.map((log: any) => ({
                ...log,
                performer_name: log.profiles?.full_name || 'System'
            })));
        } catch (err) {
            console.error("Failed to fetch request history", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const toggleExpandRequest = (requestId: string) => {
        if (expandedRequestId === requestId) {
            setExpandedRequestId(null);
            setRequestHistory([]);
        } else {
            setExpandedRequestId(requestId);
            fetchRequestHistory(requestId);
        }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        if (user?.role !== 'supervisor') {
            showToast("Unauthorized: Supervisors only.", "error");
            return;
        }

        let confirmMsg = "";
        if (status === 'Approved') confirmMsg = "Approve this request?";
        if (status === 'Rejected') confirmMsg = "Reject this request?";
        if (status === 'Released') confirmMsg = "Mark items as Released?";
        if (status === 'Returned') confirmMsg = "Mark items as Returned?";

        if (!confirm(confirmMsg)) return;

        setProcessingId(id);
        try {
            await resourceService.updateAssetRequestStatus(id, status);
            showToast(`Request ${status}.`, 'success');
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: status as any } : r));
            // If expanded, refresh history
            if (expandedRequestId === id) fetchRequestHistory(id);
        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Failed to update status", 'error');
            fetchRequests();
        } finally {
            setProcessingId(null);
        }
    };

    const handleLogVehicleUsage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!vehicleForm.destination || !vehicleForm.purpose) {
            showToast("Please fill in destination and purpose", "error");
            return;
        }

        setProcessingId('new-log');
        try {
            const officersStr = vehicleForm.officers.length > 0 ? vehicleForm.officers.join(', ') : 'Unassigned';
            await resourceService.logVehicleDispatch(user.id, vehicleForm.vehicle, officersStr, vehicleForm.purpose, vehicleForm.destination);
            showToast("Vehicle dispatch recorded", "success");
            setIsVehicleModalOpen(false);
            setVehicleForm({ vehicle: 'Trimo 1', officers: [], destination: '', purpose: '' });
            if (filter === 'Vehicles') fetchDispatchHistory();
        } catch (error: any) {
            showToast("Failed to log usage: " + error.message, "error");
        } finally {
            setProcessingId(null);
        }
    };

    const handleAddOfficer = () => {
        if (!currentOfficerSelect) return;
        if (!vehicleForm.officers.includes(currentOfficerSelect)) {
            setVehicleForm(prev => ({ ...prev, officers: [...prev.officers, currentOfficerSelect] }));
        }
        setCurrentOfficerSelect('');
    };

    const handleLogArrival = async (logId: string) => {
        setUpdatingLogId(logId);
        try {
            await resourceService.updateDispatchStatus(logId, { status: 'Clear' });
            showToast("Arrival time recorded", "success");
            await fetchDispatchHistory();
        } catch (error) {
            console.error(error);
            showToast("Failed to update status", "error");
        } finally {
            setUpdatingLogId(null);
        }
    };

    const getFilteredRequests = () => {
        return requests.filter(r => {
            if (filter === 'Pending') return r.status === 'Pending';
            if (filter === 'Scheduled') return ['Approved', 'Released'].includes(r.status);
            if (filter === 'History') return ['Returned', 'Rejected'].includes(r.status);
            return true;
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Approved': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Released': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Returned': return 'bg-green-100 text-green-800 border-green-200';
            case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const counts = {
        Pending: requests.filter(r => r.status === 'Pending').length,
        Scheduled: requests.filter(r => ['Approved', 'Released'].includes(r.status)).length,
        History: requests.filter(r => ['Returned', 'Rejected'].includes(r.status)).length,
        CCTV: cctvRequests.length
    };

    const parseVehicleLog = (unitName: string) => {
        const parts = unitName.split(' - ');
        const vehicleName = parts[0];
        const vehicleInfo = VEHICLE_DATA.find(v => v.name === vehicleName);

        if (parts.length >= 2) {
            return {
                vehicle: vehicleName,
                plate: vehicleInfo?.plate || 'N/A',
                personnel: parts.slice(1).join(' - ')
            };
        }
        return {
            vehicle: vehicleName,
            plate: vehicleInfo?.plate || 'N/A',
            personnel: 'Unassigned'
        };
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 animate-fade-in">
                <div className="bg-red-50 p-6 rounded-full mb-6">
                    <AlertTriangle size={48} className="text-red-500" />
                </div>
                <p className="text-slate-600 max-w-md mb-8">{error}</p>
                <button onClick={() => filter === 'Vehicles' ? fetchDispatchHistory() : fetchRequests()} className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-lg">
                    <RefreshCw size={18} />
                    <span>Retry Connection</span>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="Equipment Hub"
                subtitle="Equipment & Vehicle Monitoring • Post Proper Northside"
            >
                <button onClick={() => navigate('/resources/new')} className="w-full sm:w-auto bg-taguig-blue text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-taguig-navy hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-taguig-blue/20 flex items-center justify-center space-x-3">
                    <Plus size={20} />
                    <span>New Request</span>
                </button>
            </PageHeader>

            <div className="flex space-x-2 bg-taguig-blue/5 dark:bg-white/5 p-2 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar border border-taguig-blue/10 shadow-sm mb-10">
                <button onClick={() => setFilter('Pending')} className={`flex-shrink-0 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-2 whitespace-nowrap ${filter === 'Pending' ? 'bg-white dark:bg-slate-800 text-taguig-blue shadow-premium' : 'text-slate-500 dark:text-slate-400 hover:text-taguig-blue dark:hover:text-white'}`}>
                    <Clock size={16} />
                    <span>Pending</span>
                    {counts.Pending > 0 && <span className="ml-2 px-2 py-0.5 bg-taguig-red text-white rounded-full text-[9px] shadow-sm">{counts.Pending}</span>}
                </button>
                <button onClick={() => setFilter('Scheduled')} className={`flex-shrink-0 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-2 whitespace-nowrap ${filter === 'Scheduled' ? 'bg-white dark:bg-slate-800 text-taguig-blue shadow-premium' : 'text-slate-500 dark:text-slate-400 hover:text-taguig-blue dark:hover:text-white'}`}>
                    <CalendarCheck size={16} />
                    <span>Approved</span>
                    {counts.Scheduled > 0 && <span className="ml-2 px-2 py-0.5 bg-taguig-blue text-white rounded-full text-[9px] shadow-sm">{counts.Scheduled}</span>}
                </button>
                <button onClick={() => setFilter('History')} className={`flex-shrink-0 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-2 whitespace-nowrap ${filter === 'History' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-premium' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                    <Archive size={16} />
                    <span>History</span>
                </button>
                <button onClick={() => setFilter('CCTV')} className={`flex-shrink-0 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-2 whitespace-nowrap ${filter === 'CCTV' ? 'bg-white dark:bg-slate-800 text-taguig-red shadow-premium' : 'text-slate-500 dark:text-slate-400 hover:text-taguig-red dark:hover:text-white'}`}>
                    <Video size={16} />
                    <span>CCTV Logs</span>
                    {counts.CCTV > 0 && <span className="ml-2 px-2 py-0.5 bg-taguig-red text-white rounded-full text-[9px] shadow-sm">{counts.CCTV}</span>}
                </button>
                <button onClick={() => setFilter('Vehicles')} className={`flex-shrink-0 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center space-x-2 whitespace-nowrap ${filter === 'Vehicles' ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-premium' : 'text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-white'}`}>
                    <Car size={16} />
                    <span>Vehicles</span>
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-white"></div></div>
            ) : (
                <div className="animate-fade-in">
                    {filter === 'Vehicles' ? (
                        <div className="glass-panel rounded-[2.5rem] overflow-hidden shadow-premium border border-white dark:border-white/10 relative z-10">
                            <div className="p-6 bg-taguig-blue/5 dark:bg-white/5 border-b border-taguig-blue/10 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <h3 className="text-[11px] font-black text-taguig-blue dark:text-taguig-gold uppercase tracking-[0.2em]">Dispatch Log Registry</h3>
                                <button onClick={() => setIsVehicleModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 bg-taguig-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-taguig-navy transition-all shadow-lg shadow-taguig-blue/20">
                                    <Navigation size={16} />
                                    <span>New Mission</span>
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-slate-700">
                                            <th className="p-6 font-semibold text-slate-600 dark:text-slate-400 text-sm uppercase tracking-wider">Vehicle / Plate</th>
                                            <th className="p-6 font-semibold text-slate-600 dark:text-slate-400 text-sm uppercase tracking-wider">Personnel / Destination</th>
                                            <th className="p-6 font-semibold text-slate-600 dark:text-slate-400 text-sm uppercase tracking-wider">Departure</th>
                                            <th className="p-6 font-semibold text-slate-600 dark:text-slate-400 text-sm uppercase tracking-wider">Status</th>
                                            <th className="p-6 font-semibold text-slate-600 dark:text-slate-400 text-sm uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {dispatchLogs.map((log) => {
                                            const details = parseVehicleLog(log.unit_name);
                                            const isInUse = log.status !== 'Clear';
                                            return (
                                                <tr key={log.id} className={`transition-colors ${isInUse ? 'bg-orange-50/50 dark:bg-orange-900/10 border-l-4 border-l-orange-500' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                                    <td className="p-6">
                                                        <div className="flex flex-col space-y-1">
                                                            <div className="flex items-center space-x-2">
                                                                <Car size={16} className={isInUse ? "text-orange-600" : "text-slate-400"} />
                                                                <span className="font-bold text-slate-900 dark:text-white">{details.vehicle}</span>
                                                            </div>
                                                            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 w-fit">
                                                                {details.plate}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex flex-col space-y-1">
                                                            <div className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                                                                <User size={14} className="mr-2 text-slate-400" />
                                                                <span className="font-medium">{details.personnel}</span>
                                                            </div>
                                                            <div className="flex items-center text-xs text-slate-500">
                                                                <MapPin size={12} className="mr-2" />
                                                                <span>{log.incidents?.location}</span>
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 italic">
                                                                Purpose: {log.incidents?.narrative}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                                {new Date(log.created_at).toLocaleDateString()}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                {new Date(log.created_at).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        {log.status === 'Clear' ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Returned</span>
                                                                <span className="text-xs text-slate-500">{new Date(log.updated_at).toLocaleTimeString()}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-orange-600 animate-pulse uppercase tracking-wider">In Use</span>
                                                                <span className="text-xs text-slate-400 italic">En Route...</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <button
                                                                onClick={() => {
                                                                    const details = parseVehicleLog(log.unit_name);
                                                                    generateVehicleLog({
                                                                        time_of_departure: new Date(log.created_at).toLocaleTimeString(),
                                                                        time_of_arrival: log.status === 'Clear' ? new Date(log.updated_at).toLocaleTimeString() : '---',
                                                                        driver: details.personnel,
                                                                        passenger: 'N/A',
                                                                        purpose: log.incidents?.narrative || 'N/A'
                                                                    });
                                                                }}
                                                                className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors"
                                                                title="Print Dispatch Form"
                                                            >
                                                                <Printer size={16} />
                                                            </button>
                                                            {log.status !== 'Clear' && (
                                                                <button
                                                                    onClick={() => handleLogArrival(log.id)}
                                                                    disabled={updatingLogId === log.id}
                                                                    className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-[10px] font-bold hover:bg-orange-700 transition-colors flex items-center space-x-1"
                                                                >
                                                                    {updatingLogId === log.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                                                                    <span>Return</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : filter === 'CCTV' ? (
                        <div className="grid gap-6">
                            {cctvRequests.length === 0 && <p className="text-center text-slate-400 py-10">No CCTV logs found.</p>}
                            {cctvRequests.map(req => (
                                <div key={req.id} className="glass-panel p-6 rounded-3xl border-l-4 border-l-red-500 shadow-lg border border-white/60 dark:border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{req.request_number}</p>
                                        <div className="flex items-center space-x-2">
                                            <Video size={18} className="text-red-500" />
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{req.requester_name}</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-4 mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center"><MapPin size={14} className="mr-1" /> {req.location}</span>
                                            <span className="flex items-center"><Clock size={14} className="mr-1" /> {req.incident_date}</span>
                                            <span className="flex items-center bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">Type: {req.incident_type}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => reprintCCTVForm(req)} className="w-full md:w-auto flex items-center justify-center space-x-2 py-3 px-6 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-lg">
                                        <Printer size={16} />
                                        <span>Reprint Form</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {getFilteredRequests().length === 0 && <p className="text-center py-10 text-slate-400">No matching requests found.</p>}
                            {getFilteredRequests().map((req) => (
                                <div key={req.id} className="glass-panel p-6 rounded-3xl border border-white/60 dark:border-white/10 hover:shadow-lg transition-all relative overflow-hidden flex flex-col">
                                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${getStatusColor(req.status).split(' ')[0]}`} />
                                    <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-6 pl-4">
                                        <div className="space-y-4 flex-1">
                                            <div className="flex items-center space-x-3">
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{req.borrower_name}</h3>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(req.status)}`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400">
                                                <p className="flex items-center"><Truck size={14} className="mr-1" /> {req.pickup_date}</p>
                                                <p className="flex items-center"><RotateCcw size={14} className="mr-1" /> {req.return_date}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {req.items_requested.map((item, idx) => (
                                                    <span key={idx} className="bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300">{item.quantity}x {item.item}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-col space-y-3 lg:w-64 pt-2">
                                            <button onClick={() => toggleExpandRequest(req.id)} className={`w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all ${expandedRequestId === req.id ? 'bg-taguig-blue text-white shadow-lg shadow-taguig-blue/20' : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400'}`}>
                                                <History size={16} />
                                                <span>{expandedRequestId === req.id ? 'Collapse' : 'Audit Trail'}</span>
                                                {expandedRequestId === req.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                            <button onClick={() => generateBorrowingSlip(req)} className="w-full py-3.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all">
                                                <Printer size={16} />
                                                <span>Print Slip</span>
                                            </button>
                                            {user?.role === 'supervisor' && req.status === 'Pending' && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button onClick={() => handleStatusUpdate(req.id, 'Approved')} className="py-3.5 bg-taguig-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-taguig-blue/20 hover:bg-taguig-navy transition-all">Approve</button>
                                                    <button onClick={() => handleStatusUpdate(req.id, 'Rejected')} className="py-3.5 bg-taguig-red/10 text-taguig-red border border-taguig-red/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-taguig-red hover:text-white transition-all">Reject</button>
                                                </div>
                                            )}
                                            {user?.role === 'supervisor' && req.status === 'Approved' && (
                                                <button onClick={() => handleStatusUpdate(req.id, 'Released')} className="w-full py-3.5 bg-taguig-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-taguig-blue/20 hover:bg-taguig-navy transition-all">Release Assets</button>
                                            )}
                                            {user?.role === 'supervisor' && req.status === 'Released' && (
                                                <button onClick={() => handleStatusUpdate(req.id, 'Returned')} className="w-full py-3.5 bg-taguig-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-taguig-blue/20 hover:bg-taguig-navy transition-all">Mark Returned</button>
                                            )}
                                        </div>
                                    </div>

                                    {/* TRANSACTION HISTORY FOOTPRINT */}
                                    {expandedRequestId === req.id && (
                                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 pl-4 animate-slide-down">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                                                <History size={14} className="mr-2" />
                                                Transaction Audit Trail
                                            </h4>

                                            {loadingHistory ? (
                                                <div className="flex items-center space-x-2 text-slate-400 text-xs py-4">
                                                    <Loader2 size={14} className="animate-spin" />
                                                    <span>Loading history...</span>
                                                </div>
                                            ) : (
                                                <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
                                                    {/* Initial Request Footprint */}
                                                    <div className="relative pl-8 pb-2">
                                                        <div className="absolute left-0 top-1 w-[24px] h-[24px] rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 z-10 flex items-center justify-center">
                                                            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Request Filed</p>
                                                        <p className="text-[10px] text-slate-500 font-medium">
                                                            {new Date(req.created_at).toLocaleString()} • Performed by {req.logger_name}
                                                        </p>
                                                    </div>

                                                    {/* Subsequent Transitions from Audit Logs */}
                                                    {requestHistory.filter(h => h.operation === 'UPDATE').map((history, idx) => {
                                                        const statusVal = history.new_data?.status;
                                                        if (!statusVal) return null;

                                                        return (
                                                            <div key={history.id} className="relative pl-8 pb-2">
                                                                <div className={`absolute left-0 top-1 w-[24px] h-[24px] rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 z-10 flex items-center justify-center`}>
                                                                    <div className={`w-2 h-2 rounded-full ${statusVal === 'Approved' ? 'bg-blue-500' :
                                                                        statusVal === 'Released' ? 'bg-purple-500' :
                                                                            statusVal === 'Returned' ? 'bg-green-500' :
                                                                                statusVal === 'Rejected' ? 'bg-red-500' :
                                                                                    statusVal === 'Pending' ? 'bg-yellow-500' :
                                                                                        'bg-slate-400'
                                                                        }`}></div>
                                                                </div>
                                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                    Status changed to <span className={statusVal === 'Rejected' ? 'text-red-600' : 'text-blue-600'}>{statusVal}</span>
                                                                </p>
                                                                <p className="text-[10px] text-slate-500 font-medium">
                                                                    {new Date(history.created_at).toLocaleString()} • Performed by {history.performer_name}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {isVehicleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden border border-white dark:border-white/10 relative">
                        <div className="px-8 py-6 border-b border-taguig-blue/10 dark:border-white/5 flex justify-between items-center bg-taguig-blue/5">
                            <div>
                                <h3 className="font-black text-xl text-taguig-blue dark:text-white uppercase tracking-tight">Dispatch Mission</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Vehicle Deployment Module</p>
                            </div>
                            <button onClick={() => setIsVehicleModalOpen(false)} className="w-10 h-10 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-taguig-red transition-all"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleLogVehicleUsage} className="p-6 space-y-4">
                            <select
                                value={vehicleForm.vehicle}
                                onChange={e => setVehicleForm({ ...vehicleForm, vehicle: e.target.value })}
                                className="w-full bg-gray-100 dark:bg-slate-700 border border-transparent dark:border-slate-600 rounded-xl py-3 px-4 outline-none font-bold text-slate-900 dark:text-white"
                            >
                                {VEHICLE_OPTIONS.map(v => <option key={v} value={v} className="dark:bg-slate-800">{v}</option>)}
                            </select>
                            <div className="flex space-x-2">
                                <select
                                    value={currentOfficerSelect}
                                    onChange={(e) => setCurrentOfficerSelect(e.target.value)}
                                    className="flex-1 bg-gray-100 dark:bg-slate-700 border border-transparent dark:border-slate-600 rounded-xl py-3 px-4 outline-none text-slate-800 dark:text-white"
                                >
                                    <option value="" className="dark:bg-slate-800">-- Add Officer --</option>
                                    {usersList.map(u => (
                                        <option key={u.id} value={u.full_name} className="dark:bg-slate-800">
                                            {u.full_name} {isOfficerOnDuty(u.full_name) ? '● (On Duty)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <button type="button" onClick={handleAddOfficer} className="bg-slate-800 dark:bg-blue-600 text-white px-4 rounded-xl hover:opacity-90 transition-opacity"><Plus size={18} /></button>
                            </div>

                            {/* On-Duty Quick Add */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">On-Duty Officers (Quick Add)</p>
                                <div className="flex flex-wrap gap-2">
                                    {usersList.filter(u => isOfficerOnDuty(u.full_name)).length === 0 ? (
                                        <span className="text-[10px] text-slate-400 italic">No officers currently on shift...</span>
                                    ) : (
                                        usersList.filter(u => isOfficerOnDuty(u.full_name)).map(u => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => {
                                                    if (!vehicleForm.officers.includes(u.full_name)) {
                                                        setVehicleForm(prev => ({ ...prev, officers: [...prev.officers, u.full_name] }));
                                                    }
                                                }}
                                                className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold border border-green-200 dark:border-green-800 hover:bg-green-100 transition-colors flex items-center"
                                            >
                                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                                {u.full_name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 min-h-[40px] bg-gray-50 dark:bg-slate-900/50 p-2 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                                {vehicleForm.officers.length === 0 && <span className="text-xs text-gray-400 dark:text-slate-500 italic p-1">No officers added...</span>}
                                {vehicleForm.officers.map((officer, idx) => (
                                    <span key={idx} className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-xs font-bold flex items-center border border-orange-200 dark:border-orange-800">
                                        {officer}
                                        <button type="button" onClick={() => setVehicleForm(prev => ({ ...prev, officers: prev.officers.filter(o => o !== officer) }))} className="ml-2 hover:text-red-600"><X size={12} /></button>
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                required
                                value={vehicleForm.destination}
                                onChange={e => setVehicleForm({ ...vehicleForm, destination: e.target.value })}
                                className="w-full bg-gray-100 dark:bg-slate-700 border border-transparent dark:border-slate-600 rounded-xl py-3 px-4 outline-none text-slate-800 dark:text-white placeholder:text-gray-400"
                                placeholder="Destination"
                            />
                            <input
                                type="text"
                                required
                                value={vehicleForm.purpose}
                                onChange={e => setVehicleForm({ ...vehicleForm, purpose: e.target.value })}
                                className="w-full bg-gray-100 dark:bg-slate-700 border border-transparent dark:border-slate-600 rounded-xl py-3 px-4 outline-none text-slate-800 dark:text-white placeholder:text-gray-400"
                                placeholder="Purpose"
                            />
                            <button type="submit" disabled={processingId === 'new-log'} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-500/30 hover:bg-orange-700 transition-colors">Record Dispatch</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourceTracking;
