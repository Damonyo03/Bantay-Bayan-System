import React, { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { AssetRequest } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Package, Plus, CheckCircle, XCircle, Truck, RotateCcw, Printer, AlertTriangle, RefreshCw, Archive, Clock, CalendarCheck, Car, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { generateBorrowingSlip } from '../utils/pdfGenerator';

const ResourceTracking: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [filter, setFilter] = useState<'Pending' | 'Scheduled' | 'History' | 'Vehicles'>('Pending');

  useEffect(() => {
    fetchRequests();
    
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

  useEffect(() => {
      if (filter === 'Vehicles') {
          fetchDispatchHistory();
      }
  }, [filter]);

  const fetchRequests = async () => {
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
          setDispatchLogs(data);
      } catch (err: any) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
      if (user?.role !== 'supervisor') {
          showToast("Unauthorized: Supervisors only.", "error");
          return;
      }
      
      if (status === 'Rejected') {
          if (!confirm("Are you sure you want to reject this request?")) return;
      }

      setProcessingId(id);
      try {
          await supabaseService.updateAssetRequestStatus(id, status);
          showToast(`Request updated to ${status}`, 'success');
          setRequests(prev => prev.map(r => r.id === id ? { ...r, status: status as any } : r));
      } catch (error: any) {
          console.error(error);
          showToast(error.message || "Failed to update status", 'error');
          fetchRequests(); 
      } finally {
          setProcessingId(null);
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
                onClick={fetchRequests}
                className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-lg"
             >
                 <RefreshCw size={18} />
                 <span>Retry Connection</span>
             </button>
        </div>
      );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
            {/* UPDATED TO WHITE TEXT */}
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
                <Package className="mr-3 text-purple-400" />
                {t.resources}
            </h1>
            <p className="text-slate-300 mt-2">Manage borrowing requests and equipment logs.</p>
        </div>
        <button 
            onClick={() => navigate('/resources/new')}
            className="w-full sm:w-auto mt-2 sm:mt-0 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-xl flex items-center justify-center space-x-2"
        >
            <Plus size={18} />
            <span>{t.resourceRequest}</span>
        </button>
      </header>

      {/* Tabs - Scrollable on mobile */}
      <div className="flex space-x-2 bg-gray-200/50 p-1.5 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter('Pending')}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
                filter === 'Pending' 
                ? 'bg-white text-purple-700 shadow-sm' 
                : 'text-slate-200 hover:text-white'
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
                ? 'bg-white text-blue-700 shadow-sm' 
                : 'text-slate-200 hover:text-white'
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
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-200 hover:text-white'
            }`}
          >
              <Archive size={16} />
              <span>History</span>
          </button>
          <button
            onClick={() => setFilter('Vehicles')}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
                filter === 'Vehicles' 
                ? 'bg-white text-orange-600 shadow-sm' 
                : 'text-slate-200 hover:text-white'
            }`}
          >
              <Car size={16} />
              <span>Vehicle Logs</span>
          </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>
      ) : (
        <div className="animate-fade-in">
             
             {/* VEHICLE LOGS VIEW */}
             {filter === 'Vehicles' ? (
                 <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-white/50">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse whitespace-nowrap">
                         <thead>
                             <tr className="bg-gray-50/50 border-b border-gray-200">
                                 <th className="p-6 font-semibold text-slate-600 text-sm uppercase tracking-wider">Date/Time</th>
                                 <th className="p-6 font-semibold text-slate-600 text-sm uppercase tracking-wider">Vehicle</th>
                                 <th className="p-6 font-semibold text-slate-600 text-sm uppercase tracking-wider">Personnel / Officer</th>
                                 <th className="p-6 font-semibold text-slate-600 text-sm uppercase tracking-wider">Reason / Incident</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                             {dispatchLogs.map((log) => {
                                 const details = parseVehicleLog(log.unit_name);
                                 return (
                                     <tr key={log.id} className="hover:bg-orange-50/30 transition-colors">
                                         <td className="p-6">
                                             <div className="flex flex-col">
                                                 <span className="font-semibold text-slate-900">{new Date(log.created_at).toLocaleDateString()}</span>
                                                 <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                                             </div>
                                         </td>
                                         <td className="p-6">
                                             <div className="flex items-center space-x-2">
                                                 <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                                                     <Car size={16} />
                                                 </div>
                                                 <span className="font-bold text-slate-800">{details.vehicle}</span>
                                             </div>
                                         </td>
                                         <td className="p-6">
                                             <div className="flex flex-wrap gap-1 max-w-xs whitespace-normal">
                                                 {details.personnel.split(',').map((p, i) => (
                                                     <span key={i} className="text-xs bg-gray-100 text-slate-700 px-2 py-1 rounded-md border border-gray-200 inline-block mt-1">
                                                         {p.trim()}
                                                     </span>
                                                 ))}
                                             </div>
                                         </td>
                                         <td className="p-6">
                                             {log.incidents ? (
                                                 <div className="max-w-xs whitespace-normal">
                                                     <span className="text-xs font-bold uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md mb-1 inline-block">
                                                         {log.incidents.type}
                                                     </span>
                                                     <p className="text-sm text-slate-600 truncate">{log.incidents.narrative}</p>
                                                     <p className="text-[10px] text-slate-400 mt-0.5"><MapPin size={10} className="inline mr-1"/>{log.incidents.location}</p>
                                                 </div>
                                             ) : (
                                                 <span className="text-slate-400 italic text-sm">No linked incident details</span>
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
                        <div key={req.id} className="glass-panel p-6 rounded-3xl border border-white/60 hover:shadow-lg transition-all relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-2 ${getStatusColor(req.status).split(' ')[0]}`} />
                            
                            <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-6 pl-4">
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center space-x-3">
                                        <h3 className="text-xl font-bold text-slate-900">{req.borrower_name}</h3>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Pickup Date</p>
                                            <p className="font-medium flex items-center mt-1"><Truck size={14} className="mr-1 text-blue-400"/> {req.pickup_date}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Return Date</p>
                                            <p className="font-medium flex items-center mt-1"><RotateCcw size={14} className="mr-1 text-green-400"/> {req.return_date}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Items</p>
                                        <div className="flex flex-wrap gap-2">
                                            {req.items_requested.map((item, idx) => (
                                                <span key={idx} className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 shadow-sm">
                                                    {item.quantity}x {item.item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 italic border-l-2 border-gray-300 pl-3">"{req.purpose}"</p>
                                </div>

                                <div className="flex flex-col space-y-3 lg:w-56 pt-2">
                                    <button 
                                        onClick={() => generateBorrowingSlip(req)}
                                        className="w-full flex items-center justify-center space-x-2 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        <Printer size={16} />
                                        <span>Print Slip</span>
                                    </button>
                                    
                                    {user?.role === 'supervisor' && req.status === 'Pending' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <button 
                                                onClick={() => handleStatusUpdate(req.id, 'Approved')}
                                                disabled={processingId === req.id}
                                                className="flex flex-col items-center justify-center py-3 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-colors shadow-green-200 shadow-lg disabled:opacity-50"
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
                                                className="flex flex-col items-center justify-center py-3 bg-red-100 text-red-600 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors disabled:opacity-50"
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
        </div>
      )}
    </div>
  );
};

export default ResourceTracking;