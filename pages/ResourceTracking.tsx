
import React, { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { AssetRequest, DispatchLog, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Package, Plus, CheckCircle, XCircle, Truck, RotateCcw, Printer, AlertTriangle, RefreshCw, Archive, Clock, CalendarCheck, Car, MapPin, Navigation, CheckSquare, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { generateBorrowingSlip } from '../utils/pdfGenerator';

// Local interface for the joined data
interface LogWithIncident extends DispatchLog {
    incidents?: {
        type: string;
        narrative: string;
        location: string;
    } | null;
}

const VEHICLE_OPTIONS = [
    "Trimo 1",
    "Trimo 2",
    "Trimo 3",
    "Traviz",
    "APV",
    "Rescue 1",
    "Rescue 2",
    "Ambulance 1",
    "Ambulance 2",
    "Foot Patrol / Walking",
    "Command Post"
];

const ResourceTracking: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<LogWithIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [updatingLogId, setUpdatingLogId] = useState<string | null>(null);

  const [filter, setFilter] = useState<'Pending' | 'Scheduled' | 'History' | 'Vehicles'>('Pending');

  // Vehicle Modal State
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
    fetchUsers(); // Pre-fetch users for the modal
    
    // Realtime subscriptions
    const channel = supabase
      .channel('assets_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_requests' }, () => fetchRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_logs' }, () => {
          if (filter === 'Vehicles') fetchDispatchHistory();
      })
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    }
  }, []);

  // Fetch dispatch logs when Vehicles tab is selected
  useEffect(() => {
      if (filter === 'Vehicles') {
          fetchDispatchHistory();
      }
  }, [filter]);

  const fetchUsers = async () => {
      try {
          const data = await supabaseService.getUsers();
          setUsersList(data.filter(u => u.status === 'active'));
      } catch (e) {
          console.error("Failed to load users", e);
      }
  };

  const fetchRequests = async () => {
      if (filter === 'Vehicles') return; // Don't fetch requests if looking at vehicles
      setLoading(true);
      setError(null);
      try {
          const data = await supabaseService.getAssetRequests();
          setRequests(data);
      } catch (err: any) {
          console.error("Resource fetch error:", err);
          setError("Failed to load resource data.");
      } finally {
          setLoading(false);
      }
  };

  const fetchDispatchHistory = async () => {
      setLoading(true);
      try {
          const data = await supabaseService.getDispatchHistory();
          setDispatchLogs(data as LogWithIncident[]);
      } catch (err: any) {
          console.error(err);
          showToast("Failed to load vehicle logs", "error");
      } finally {
          setLoading(false);
      }
  };

  // --- APPROVAL / REJECTION LOGIC ---
  const handleStatusUpdate = async (id: string, status: string) => {
      if (user?.role !== 'supervisor') {
          showToast("Unauthorized: Supervisors only.", "error");
          return;
      }
      
      let confirmMsg = "";
      if (status === 'Approved') confirmMsg = "Approve this request? The user will be notified that the item is reserved.";
      if (status === 'Rejected') confirmMsg = "Reject this request? This action will move the request to history.";
      if (status === 'Released') confirmMsg = "Mark items as Released? This confirms the borrower has taken the items.";
      if (status === 'Returned') confirmMsg = "Mark items as Returned? This confirms items are back in inventory.";

      if (!confirm(confirmMsg)) return;

      setProcessingId(id);
      try {
          await supabaseService.updateAssetRequestStatus(id, status);
          
          let successMsg = `Request ${status}.`;
          if (status === 'Approved') successMsg = "Request Approved. Moved to 'Approved' tab.";
          if (status === 'Rejected') successMsg = "Request Rejected. Moved to 'History' tab.";
          
          showToast(successMsg, 'success');
          
          // Optimistic update to reflect change immediately in UI
          setRequests(prev => prev.map(r => r.id === id ? { ...r, status: status as any } : r));
      } catch (error: any) {
          console.error(error);
          showToast(error.message || "Failed to update status", 'error');
          fetchRequests(); // Revert on error
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
          
          await supabaseService.logVehicleDispatch(
              user.id,
              vehicleForm.vehicle,
              officersStr,
              vehicleForm.purpose,
              vehicleForm.destination
          );
          
          showToast("Vehicle dispatch recorded", "success");
          setIsVehicleModalOpen(false);
          setVehicleForm({
              vehicle: 'Trimo 1',
              officers: [],
              destination: '',
              purpose: ''
          });
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
          // Setting status to 'Clear' updates the `updated_at` field in supabaseService
          await supabaseService.updateDispatchStatus(logId, { status: 'Clear' });
          showToast("Arrival time recorded", "success");
          // Refresh list to update 'isCompleted' status
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
      switch(status) {
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
      History: requests.filter(r => ['Returned', 'Rejected'].includes(r.status)).length
  };

  const parseVehicleLog = (unitName: string) => {
      // Format: "Vehicle Name - Officer A, Officer B"
      const parts = unitName.split(' - ');
      if (parts.length >= 2) {
          return { vehicle: parts[0], personnel: parts.slice(1).join(' - ') };
      }
      return { vehicle: unitName, personnel: 'Unassigned / Generic' };
  };

  if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 animate-fade-in">
             <div className="bg-red-50 p-6 rounded-full mb-6">
                 <AlertTriangle size={48} className="text-red-500" />
             </div>
             <p className="text-slate-600 max-w-md mb-8">{error}</p>
             <button 
                onClick={() => filter === 'Vehicles' ? fetchDispatchHistory() : fetchRequests()}
                className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
             >
                 <RefreshCw size={18} />
                 <span>Retry Connection</span>
             </button>
        </div>
      );
  }

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
            {/* UPDATED VISIBILITY */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
                <Package className="mr-3 text-purple-600 dark:text-purple-400" />
                {t.resources}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">Manage borrowing requests and equipment logs.</p>
        </div>
        <button 
            onClick={() => navigate('/resources/new')}
            className="w-full sm:w-auto mt-2 sm:mt-0 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-xl flex items-center justify-center space-x-2"
        >
            <Plus size={18} />
            <span>{t.resourceRequest}</span>
        </button>
      </header>

      {/* Tabs - Scrollable on mobile */}
      <div className="flex space-x-2 bg-gray-200/50 dark:bg-white/5 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter('Pending')}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
                filter === 'Pending' 
                ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
              <Clock size={16} />
              <span>Pending</span>
              {counts.Pending > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px]">{counts.Pending}</span>
              )}
          </button>
          <button
            onClick={() => setFilter('Scheduled')}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
                filter === 'Scheduled' 
                ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
              <CalendarCheck size={16} />
              <span>Approved</span>
              {counts.Scheduled > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white rounded-full text-[10px]">{counts.Scheduled}</span>
              )}
          </button>
          <button
            onClick={() => setFilter('History')}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
                filter === 'History' 
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
              <Archive size={16} />
              <span>History</span>
          </button>
          <button
            onClick={() => setFilter('Vehicles')}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
                filter === 'Vehicles' 
                ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
              <Car size={16} />
              <span>Vehicle Logs</span>
          </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-white"></div></div>
      ) : (
        <div className="animate-fade-in">
             
             {/* VEHICLE LOGS VIEW */}
             {filter === 'Vehicles' ? (
                 <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-white/50 dark:border-white/10">
                    
                    {/* Toolbar for Vehicle Logs */}
                    <div className="p-4 bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-2">Dispatch History</h3>
                        </div>
                        <div className="flex items-center space-x-2">
                             <button
                                onClick={() => setIsVehicleModalOpen(true)}
                                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors shadow-lg"
                             >
                                 <Navigation size={14} />
                                 <span>Log Usage</span>
                             </button>
                             <button 
                                onClick={fetchDispatchHistory}
                                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                                title="Refresh Logs"
                             >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>

                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse whitespace-nowrap">
                         <thead>
                             <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-slate-700">
                                 <th className="p-6 font-semibold text-slate-600 dark:text-slate-400 text-sm uppercase tracking-wider">Asset / Personnel</th>
                                 <th className="p-6 font-semibold text-slate-600 dark:text-slate-400 text-sm uppercase tracking-wider">Details</th>
                                 <th className="p-6 font-semibold text-slate-600 dark:text-slate-400 text-sm uppercase tracking-wider">Departure</th>
                                 <th className="p-6 font-semibold text-slate-600 dark:text-slate-400 text-sm uppercase tracking-wider">Arrival</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                             {dispatchLogs.map((log) => {
                                 const details = parseVehicleLog(log.unit_name);
                                 const isCompleted = log.status === 'Clear';

                                 return (
                                     <tr key={log.id} className="hover:bg-orange-50/30 dark:hover:bg-orange-900/20 transition-colors">
                                         <td className="p-6">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center space-x-2">
                                                    <Car size={16} className="text-orange-600"/>
                                                    <span className="font-bold text-slate-900 dark:text-white">{details.vehicle}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1 max-w-xs whitespace-normal">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{details.personnel}</span>
                                                </div>
                                            </div>
                                         </td>
                                         <td className="p-6">
                                              <div className="max-w-xs whitespace-normal">
                                                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{log.incidents?.narrative}</p>
                                                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-1">
                                                     <MapPin size={12} className="mr-1"/>
                                                     {log.incidents?.location}
                                                  </p>
                                              </div>
                                         </td>
                                         <td className="p-6">
                                             <div className="flex flex-col">
                                                 <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                 <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleDateString()}</span>
                                             </div>
                                         </td>
                                         <td className="p-6">
                                             {isCompleted ? (
                                                 <div className="flex flex-col">
                                                     <span className="font-bold text-green-700 dark:text-green-400">{new Date(log.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                     <span className="text-xs text-green-600/70 dark:text-green-400/70">{new Date(log.updated_at).toLocaleDateString()}</span>
                                                 </div>
                                             ) : (
                                                <button
                                                    onClick={() => handleLogArrival(log.id)}
                                                    disabled={updatingLogId === log.id}
                                                    className="px-3 py-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold border border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors flex items-center shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                                >
                                                    {updatingLogId === log.id ? (
                                                        <>
                                                            <Loader2 size={14} className="mr-1.5 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock size={14} className="mr-1.5" />
                                                            Log Return
                                                        </>
                                                    )}
                                                </button>
                                             )}
                                         </td>
                                     </tr>
                                 );
                             })}
                             {dispatchLogs.length === 0 && (
                                 <tr>
                                     <td colSpan={4} className="p-12 text-center text-slate-400">
                                         <Car size={32} className="mx-auto mb-2 opacity-30"/>
                                         No vehicle dispatch history found.
                                     </td>
                                 </tr>
                             )}
                         </tbody>
                     </table>
                   </div>
                 </div>
             ) : (
                 // ASSET REQUESTS VIEW
                 <div className="grid gap-6">
                    {getFilteredRequests().length === 0 && (
                        <div className="text-center py-16 text-slate-400 glass-panel rounded-3xl border-dashed">
                            <Package size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No records found in this category.</p>
                        </div>
                    )}

                    {getFilteredRequests().map((req) => (
                        <div key={req.id} className="glass-panel p-6 rounded-3xl border border-white/60 dark:border-white/10 hover:shadow-lg transition-all relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-2 ${getStatusColor(req.status).split(' ')[0]}`} />
                            
                            <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-6 pl-4">
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center space-x-3">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{req.borrower_name}</h3>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Pickup Date</p>
                                            <p className="font-medium flex items-center mt-1"><Truck size={14} className="mr-1 text-blue-400"/> {req.pickup_date}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Return Date</p>
                                            <p className="font-medium flex items-center mt-1"><RotateCcw size={14} className="mr-1 text-green-400"/> {req.return_date}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/80 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Items</p>
                                        <div className="flex flex-wrap gap-2">
                                            {req.items_requested.map((item, idx) => (
                                                <span key={idx} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm">
                                                    {item.quantity}x {item.item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 italic border-l-2 border-gray-300 dark:border-slate-600 pl-3">"{req.purpose}"</p>
                                </div>

                                <div className="flex flex-col space-y-3 lg:w-56 pt-2">
                                    <button 
                                        onClick={() => generateBorrowingSlip(req)}
                                        className="w-full flex items-center justify-center space-x-2 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                                    >
                                        <Printer size={16} />
                                        <span>Print Slip</span>
                                    </button>
                                    
                                    {/* SUPERVISOR APPROVAL / REJECTION BUTTONS */}
                                    {user?.role === 'supervisor' && req.status === 'Pending' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button 
                                                onClick={() => handleStatusUpdate(req.id, 'Approved')}
                                                disabled={processingId === req.id}
                                                className="flex flex-col items-center justify-center py-3 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-colors shadow-green-200 shadow-lg disabled:opacity-50 hover:scale-[1.03]"
                                            >
                                                {processingId === req.id ? (
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1"/>
                                                ) : (
                                                    <CheckCircle size={18} className="mb-1" />
                                                )}
                                                <span>Approve</span>
                                            </button>
                                            <button 
                                                onClick={() => handleStatusUpdate(req.id, 'Rejected')}
                                                disabled={processingId === req.id}
                                                className="flex flex-col items-center justify-center py-3 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors disabled:opacity-50 hover:scale-[1.03]"
                                            >
                                                {processingId === req.id ? (
                                                    <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin mb-1"/>
                                                ) : (
                                                    <XCircle size={18} className="mb-1" />
                                                )}
                                                <span>Reject</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* POST-APPROVAL WORKFLOW */}
                                    {user?.role === 'supervisor' && req.status === 'Approved' && (
                                        <button 
                                            onClick={() => handleStatusUpdate(req.id, 'Released')}
                                            disabled={processingId === req.id}
                                            className="w-full flex items-center justify-center space-x-2 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 shadow-purple-200 shadow-lg disabled:opacity-50"
                                        >
                                            {processingId === req.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Truck size={16} />}
                                            <span>Mark as Released</span>
                                        </button>
                                    )}

                                    {user?.role === 'supervisor' && req.status === 'Released' && (
                                        <button 
                                            onClick={() => handleStatusUpdate(req.id, 'Returned')}
                                            disabled={processingId === req.id}
                                            className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-blue-200 shadow-lg disabled:opacity-50"
                                        >
                                            {processingId === req.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <RotateCcw size={16} />}
                                            <span>Mark as Returned</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
             )}

             {/* Vehicle Log Modal - Code omitted but assumes similar color fixes */}
             {isVehicleModalOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden">
                         <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
                             <div className="flex items-center space-x-2">
                                <Car className="text-orange-600" size={20} />
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Log Vehicle Dispatch</h3>
                             </div>
                             <button onClick={() => setIsVehicleModalOpen(false)} className="p-2 bg-gray-200 dark:bg-slate-700 rounded-full hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-600 dark:text-white">
                                 <X size={18} />
                             </button>
                         </div>
                         <form onSubmit={handleLogVehicleUsage} className="p-6 space-y-4">
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Select Vehicle</label>
                                 <select 
                                     value={vehicleForm.vehicle}
                                     onChange={e => setVehicleForm({ ...vehicleForm, vehicle: e.target.value })}
                                     className="w-full bg-gray-100 dark:bg-slate-700 rounded-xl py-3 px-4 outline-none font-semibold text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500/20"
                                 >
                                     {VEHICLE_OPTIONS.map(v => (
                                         <option key={v} value={v}>{v}</option>
                                     ))}
                                 </select>
                             </div>

                             <div>
                                 <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Assigned Officers / Drivers</label>
                                 <div className="flex space-x-2 mb-2">
                                     <select
                                         value={currentOfficerSelect}
                                         onChange={(e) => setCurrentOfficerSelect(e.target.value)}
                                         className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-xl py-3 px-4 outline-none text-slate-800 dark:text-white text-sm"
                                     >
                                         <option value="">-- Add Officer --</option>
                                         {usersList.map(u => (
                                             <option key={u.id} value={u.full_name}>{u.full_name}</option>
                                         ))}
                                     </select>
                                     <button 
                                         type="button"
                                         onClick={handleAddOfficer}
                                         disabled={!currentOfficerSelect}
                                         className="bg-slate-800 dark:bg-slate-600 text-white px-4 rounded-xl"
                                     >
                                         <Plus size={18} />
                                     </button>
                                 </div>
                                 <div className="flex flex-wrap gap-2 min-h-[40px] bg-gray-50 dark:bg-slate-800/50 p-2 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                                     {vehicleForm.officers.map((officer, idx) => (
                                         <span key={idx} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                                             {officer}
                                             <button 
                                                type="button" 
                                                onClick={() => setVehicleForm(prev => ({...prev, officers: prev.officers.filter(o => o !== officer)}))}
                                                className="ml-2 hover:text-red-600"
                                             >
                                                 <X size={12} />
                                             </button>
                                         </span>
                                     ))}
                                     {vehicleForm.officers.length === 0 && <span className="text-gray-400 text-xs italic p-1">No officers assigned.</span>}
                                 </div>
                             </div>

                             <div className="grid grid-cols-1 gap-4">
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Destination / Location</label>
                                     <div className="relative">
                                         <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                                         <input 
                                             type="text"
                                             required
                                             value={vehicleForm.destination}
                                             onChange={e => setVehicleForm({...vehicleForm, destination: e.target.value})}
                                             className="w-full bg-gray-100 dark:bg-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 dark:text-white"
                                             placeholder="e.g. City Hall"
                                         />
                                     </div>
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Purpose / Reason</label>
                                     <input 
                                         type="text"
                                         required
                                         value={vehicleForm.purpose}
                                         onChange={e => setVehicleForm({...vehicleForm, purpose: e.target.value})}
                                         className="w-full bg-gray-100 dark:bg-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 dark:text-white"
                                         placeholder="e.g. Document Delivery, Patrol"
                                     />
                                 </div>
                             </div>

                             <div className="pt-4">
                                 <button 
                                     type="submit"
                                     disabled={processingId === 'new-log'}
                                     className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-500/30 flex items-center justify-center space-x-2"
                                 >
                                     {processingId === 'new-log' ? (
                                         <span>Recording...</span>
                                     ) : (
                                         <>
                                            <CheckSquare size={18} />
                                            <span>Record Dispatch</span>
                                         </>
                                     )}
                                 </button>
                             </div>
                         </form>
                    </div>
                 </div>
             )}
        </div>
      )}
    </div>
  );
};

export default ResourceTracking;
