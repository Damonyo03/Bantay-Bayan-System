
import React, { useEffect, useState, useCallback } from 'react';
import { supabaseService } from '../services/supabaseService';
import { IncidentWithDetails, DispatchLog, AssetRequest, UserProfile } from '../types';
import DispatchBottomSheet from '../components/DispatchBottomSheet';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Clock, MapPin, Ambulance, AlertCircle, TrendingUp, Users, Edit2, X, Check, FileText, Package, ChevronRight, Shield, BadgeCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const CommandCenter: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  // Data States
  const [incidents, setIncidents] = useState<IncidentWithDetails[]>([]);
  const [assetRequests, setAssetRequests] = useState<AssetRequest[]>([]);
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States
  const [editingIncident, setEditingIncident] = useState<IncidentWithDetails | null>(null);
  const [editingNarrative, setEditingNarrative] = useState<IncidentWithDetails | null>(null);
  const [showOnDutyModal, setShowOnDutyModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [incData, assetData, userData] = await Promise.all([
          supabaseService.getIncidents(),
          supabaseService.getAssetRequests(),
          supabaseService.getUsers()
      ]);
      setIncidents(incData);
      setAssetRequests(assetData);
      setActiveUsers(userData.filter(u => u.status === 'active'));
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
      showToast("Failed to sync dashboard", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();

    // Realtime Subscription
    const channel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_logs' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_requests' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleUpdateDispatch = async (id: string, updates: Partial<DispatchLog>) => {
    await supabaseService.updateDispatchStatus(id, updates);
    showToast("Dispatch status updated", "success");
  };

  const handleUpdateIncident = async (id: string, updates: any) => {
      try {
          await supabaseService.updateIncident(id, updates);
          setEditingIncident(null);
          setEditingNarrative(null);
          showToast("Incident record updated successfully", "success");
      } catch (err) {
          showToast("Failed to update incident", "error");
      }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'Dispatched': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'Resolved': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'Closed': return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  // Filter for dashboard display
  const activeIncidents = incidents.filter(i => i.status !== 'Closed');
  const pendingAssets = assetRequests.filter(r => r.status === 'Pending');

  const scrollToBlotter = () => {
    document.getElementById('blotter-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t.dashboard}</h1>
            <p className="text-gray-500 mt-2">
                {t.welcome}, {user?.full_name}.
            </p>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Incidents - Scroll to Blotter */}
        <div 
            onClick={scrollToBlotter}
            className="glass-panel p-6 rounded-3xl flex items-center space-x-4 cursor-pointer hover:shadow-lg transition-all group"
        >
            <div className="p-4 bg-red-100 text-red-600 rounded-2xl group-hover:scale-110 transition-transform">
                <AlertCircle size={24} />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t.activeIncidents}</p>
                <p className="text-3xl font-bold text-gray-900">{activeIncidents.length}</p>
            </div>
        </div>

        {/* Pending Requests - Navigate to Resources */}
        <div 
            onClick={() => navigate('/resources')}
            className="glass-panel p-6 rounded-3xl flex items-center space-x-4 cursor-pointer hover:shadow-lg transition-all group"
        >
            <div className="p-4 bg-purple-100 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform">
                <Package size={24} />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pending Requests</p>
                <p className="text-3xl font-bold text-gray-900">{pendingAssets.length}</p>
            </div>
        </div>

        {/* On Duty - Open Modal */}
        <div 
            onClick={() => setShowOnDutyModal(true)}
            className="glass-panel p-6 rounded-3xl flex items-center space-x-4 cursor-pointer hover:shadow-lg transition-all group"
        >
            <div className="p-4 bg-green-100 text-green-600 rounded-2xl group-hover:scale-110 transition-transform">
                <Users size={24} />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t.onDuty}</p>
                <p className="text-3xl font-bold text-gray-900">{activeUsers.length}</p>
            </div>
        </div>
      </div>

      {isLoading ? (
         <div className="flex items-center justify-center h-48">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
         </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COL: INCIDENTS (Blotter) */}
            <div className="lg:col-span-2 space-y-6" id="blotter-section">
                 <h2 className="text-xl font-bold text-gray-800 flex items-center justify-between">
                    {t.recentEntries}
                 </h2>

                {/* CARD VIEW ONLY */}
                <div className="grid gap-6 animate-fade-in">
                    {incidents.slice(0, 10).map((incident) => (
                        <div key={incident.id} className="glass-panel p-6 rounded-3xl border border-white/60 transition-all hover:shadow-lg">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <span className="font-mono text-xs text-gray-400 font-bold">{incident.case_number}</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(incident.status)}`}>
                                        {incident.status}
                                        </span>
                                        {incident.is_restricted_entry && (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white shadow-sm">Restricted</span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">{incident.type}</h3>
                                    <p className="text-gray-600 leading-relaxed text-sm line-clamp-2">{incident.narrative}</p>
                                    <div className="flex items-center text-xs text-gray-500 font-medium pt-2">
                                        <MapPin size={14} className="mr-1" />
                                        {incident.location}
                                        <span className="mx-2">•</span>
                                        <Clock size={14} className="mr-1" />
                                        {new Date(incident.created_at).toLocaleString()}
                                    </div>
                                </div>
                                
                                {/* Right Column: Admin Actions & Dispatch */}
                                <div className="md:w-60 flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
                                    
                                    {/* SUPERVISOR EDIT ACTIONS */}
                                    {user?.role === 'supervisor' && (
                                        <div className="flex space-x-2 mb-4">
                                            <button 
                                                onClick={() => setEditingIncident(incident)}
                                                className="flex-1 flex items-center justify-center space-x-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                                                title="Edit Record"
                                            >
                                                <Edit2 size={14} />
                                                <span>Edit</span>
                                            </button>
                                            <button 
                                                onClick={() => setEditingNarrative(incident)}
                                                className="flex-1 flex items-center justify-center space-x-1 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors"
                                                title="Edit Narrative"
                                            >
                                                <FileText size={14} />
                                                <span>Note</span>
                                            </button>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{t.responseUnits}</h4>
                                        <div className="space-y-2">
                                            {incident.dispatch_logs && incident.dispatch_logs.length > 0 ? (
                                                incident.dispatch_logs.map((log) => (
                                                    <button
                                                        key={log.id}
                                                        onClick={() => setSelectedDispatch(log)}
                                                        className="w-full flex items-center justify-between p-2.5 bg-white/40 hover:bg-white rounded-xl border border-gray-100 transition-all shadow-sm group"
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            <div className={`p-1.5 rounded-lg ${log.status === 'On Scene' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                <Ambulance size={16} />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-sm font-bold text-gray-800">{log.unit_name}</p>
                                                                <p className="text-[10px] text-gray-500 font-medium uppercase">{log.status}</p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="py-3 text-center text-xs text-gray-400 italic">{t.noDispatch}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT COL: PENDING RESOURCE REQUESTS */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-800">Pending Requests</h2>
                    <button onClick={() => navigate('/resources')} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center">
                        View All <ChevronRight size={14} />
                    </button>
                </div>

                <div className="space-y-4">
                    {pendingAssets.length === 0 ? (
                        <div className="glass-panel p-8 rounded-3xl text-center text-gray-400">
                             <Package size={32} className="mx-auto mb-2 opacity-30" />
                             <p className="text-sm">No pending requests</p>
                        </div>
                    ) : (
                        pendingAssets.map(req => (
                            <div key={req.id} className="glass-panel p-5 rounded-3xl border-l-4 border-l-yellow-400 border-white/60 hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/resources')}>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-gray-900 text-sm">{req.borrower_name}</h4>
                                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold uppercase">Pending</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-3">{req.purpose}</p>
                                <div className="flex flex-wrap gap-1">
                                    {req.items_requested.slice(0, 3).map((item, idx) => (
                                        <span key={idx} className="text-[10px] bg-white border border-gray-100 px-2 py-1 rounded-md text-gray-600">
                                            {item.item}
                                        </span>
                                    ))}
                                    {req.items_requested.length > 3 && <span className="text-[10px] text-gray-400 px-1">+{req.items_requested.length - 3} more</span>}
                                </div>
                                <div className="mt-3 text-[10px] text-gray-400 font-medium text-right">
                                    Pickup: {req.pickup_date}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

      {selectedDispatch && (
        <DispatchBottomSheet 
          dispatchLog={selectedDispatch}
          availableOfficers={activeUsers}
          onClose={() => setSelectedDispatch(null)}
          onUpdate={handleUpdateDispatch}
        />
      )}

      {/* SUPERVISOR NARRATIVE EDIT MODAL */}
      {editingNarrative && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
             <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-slide-up">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center space-x-2">
                        <FileText className="text-amber-600" size={20} />
                        <h3 className="font-bold text-lg text-gray-800">Edit Narrative: <span className="font-mono text-base ml-1 text-gray-600">{editingNarrative.case_number}</span></h3>
                    </div>
                    <button onClick={() => setEditingNarrative(null)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Narrative of Facts</label>
                    <textarea 
                        className="w-full p-4 bg-gray-100 rounded-xl border-none h-64 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none font-normal leading-relaxed text-gray-800"
                        value={editingNarrative.narrative}
                        onChange={(e) => setEditingNarrative({...editingNarrative, narrative: e.target.value})}
                        placeholder="Update the details of the incident..."
                        autoFocus
                    />
                </div>
                <div className="p-6 bg-gray-50 flex justify-end space-x-3">
                    <button onClick={() => setEditingNarrative(null)} className="px-6 py-3 rounded-xl text-gray-500 font-semibold hover:bg-gray-200">{t.cancel}</button>
                    <button onClick={() => handleUpdateIncident(editingNarrative.id, { narrative: editingNarrative.narrative })} className="px-6 py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 shadow-lg shadow-amber-500/30 flex items-center space-x-2"><Check size={18} /><span>Update Narrative</span></button>
                </div>
             </div>
          </div>
      )}

      {/* SUPERVISOR MAIN EDIT MODAL */}
      {editingIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-slide-up">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-lg text-gray-800">{t.edit} Record: {editingIncident.case_number}</h3>
                      <button onClick={() => setEditingIncident(null)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
                          <X size={18} />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.type}</label>
                            <select className="w-full p-3 bg-gray-100 rounded-xl border-none" value={editingIncident.type} onChange={(e) => setEditingIncident({...editingIncident, type: e.target.value as any})}>
                                <option>Medical</option><option>Fire</option><option>Theft</option><option>Disturbance</option><option>Traffic</option><option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.status}</label>
                            <select className="w-full p-3 bg-gray-100 rounded-xl border-none" value={editingIncident.status} onChange={(e) => setEditingIncident({...editingIncident, status: e.target.value as any})}>
                                <option>Pending</option><option>Dispatched</option><option>Resolved</option><option>Closed</option>
                            </select>
                        </div>
                      </div>
                      <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.location}</label>
                            <input type="text" className="w-full p-3 bg-gray-100 rounded-xl border-none" value={editingIncident.location} onChange={(e) => setEditingIncident({...editingIncident, location: e.target.value})} />
                      </div>
                      <div className="flex items-center p-3 bg-red-50 rounded-xl border border-red-100">
                          <input type="checkbox" checked={editingIncident.is_restricted_entry} onChange={(e) => setEditingIncident({...editingIncident, is_restricted_entry: e.target.checked})} className="w-5 h-5 text-red-600 mr-3" />
                          <span className="text-sm font-bold text-red-800">Persona Non Grata / Restricted</span>
                      </div>
                  </div>
                  <div className="p-6 bg-gray-50 flex justify-end space-x-3">
                      <button onClick={() => setEditingIncident(null)} className="px-6 py-3 rounded-xl text-gray-500 font-semibold hover:bg-gray-200">{t.cancel}</button>
                      <button onClick={() => handleUpdateIncident(editingIncident.id, {
                            type: editingIncident.type,
                            status: editingIncident.status,
                            location: editingIncident.location,
                            is_restricted_entry: editingIncident.is_restricted_entry
                        })} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center space-x-2">
                          <Check size={18} /><span>{t.saveChanges}</span>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* ACTIVE PERSONNEL MODAL */}
      {showOnDutyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-green-50">
                      <div className="flex items-center space-x-2 text-green-800">
                          <BadgeCheck size={20} />
                          <h3 className="font-bold text-lg">Active Personnel</h3>
                      </div>
                      <button onClick={() => setShowOnDutyModal(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
                          <X size={18} />
                      </button>
                  </div>
                  <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {activeUsers.length === 0 ? (
                          <div className="text-center py-8 text-gray-400">
                              <p>No active personnel found.</p>
                          </div>
                      ) : (
                          <div className="space-y-3">
                              {activeUsers.map(u => (
                                  <div key={u.id} className="flex items-center space-x-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                      <div className="w-10 h-10 rounded-full bg-green-200 text-green-800 flex items-center justify-center font-bold">
                                          {u.full_name.charAt(0)}
                                      </div>
                                      <div>
                                          <p className="font-bold text-gray-900">{u.full_name}</p>
                                          <p className="text-xs text-gray-500 font-mono">Badge: {u.badge_number || 'N/A'}</p>
                                      </div>
                                      <div className="ml-auto">
                                          <span className="text-[10px] uppercase font-bold text-gray-400 border border-gray-200 px-2 py-1 rounded-lg">
                                              {u.role === 'supervisor' ? 'Official' : 'Officer'}
                                          </span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CommandCenter;
