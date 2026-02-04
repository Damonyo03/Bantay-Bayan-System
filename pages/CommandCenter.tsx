import React, { useEffect, useState, useCallback } from 'react';
import { supabaseService } from '../services/supabaseService';
import { IncidentWithDetails, DispatchLog, AssetRequest, UserProfile } from '../types';
import DispatchBottomSheet from '../components/DispatchBottomSheet';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Clock, MapPin, Car, AlertCircle, TrendingUp, Users, Edit2, X, Check, FileText, Package, ChevronRight, Shield, BadgeCheck } from 'lucide-react';
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
      case 'Pending': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'Dispatched': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Resolved': return 'bg-green-50 text-green-800 border-green-200';
      case 'Closed': return 'bg-gray-50 text-gray-800 border-gray-200';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
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
            {/* TEXT COLOR UPDATED TO WHITE FOR DARK BACKGROUND */}
            <h1 className="text-3xl font-bold text-white tracking-tight">{t.dashboard}</h1>
            <p className="text-slate-300 mt-2">
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
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t.activeIncidents}</p>
                <p className="text-3xl font-bold text-slate-900">{activeIncidents.length}</p>
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
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pending Requests</p>
                <p className="text-3xl font-bold text-slate-900">{pendingAssets.length}</p>
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
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{t.onDuty}</p>
                <p className="text-3xl font-bold text-slate-900">{activeUsers.length}</p>
            </div>
        </div>
      </div>

      {isLoading ? (
         <div className="flex items-center justify-center h-48">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
         </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COL: INCIDENTS (Blotter) */}
            <div className="lg:col-span-2 space-y-6" id="blotter-section">
                 {/* TEXT COLOR UPDATED TO WHITE */}
                 <h2 className="text-xl font-bold text-white flex items-center justify-between">
                    {t.recentEntries}
                 </h2>

                {/* CARD VIEW ONLY */}
                <div className="grid gap-6 animate-fade-in">
                    {incidents.slice(0, 10).map((incident) => (
                        <div key={incident.id} className="glass-panel p-6 rounded-3xl border border-white/60 transition-all hover:shadow-lg">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <span className="font-mono text-xs text-slate-500 font-bold">{incident.case_number}</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(incident.status)}`}>
                                        {incident.status}
                                        </span>
                                        {incident.is_restricted_entry && (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-600 text-white shadow-sm">Restricted</span>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">{incident.type}</h3>
                                    <p className="text-slate-700 leading-relaxed text-sm line-clamp-2 font-medium">{incident.narrative}</p>
                                    <div className="flex items-center text-xs text-slate-500 font-bold pt-2">
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

                                    {/* Dispatch Status Display */}
                                    {incident.dispatch_logs && incident.dispatch_logs.length > 0 ? (
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Dispatch Unit</p>
                                            <div className="flex items-center space-x-2 mb-2">
                                                <Car size={16} className="text-slate-600"/>
                                                <span className="text-xs font-bold text-slate-800 truncate">{incident.dispatch_logs[0].unit_name}</span>
                                            </div>
                                            <button
                                                onClick={() => setSelectedDispatch(incident.dispatch_logs![0])}
                                                className={`w-full py-1.5 rounded-lg text-[10px] font-bold uppercase transition-colors ${
                                                    incident.dispatch_logs[0].status === 'En Route' ? 'bg-yellow-100 text-yellow-700' :
                                                    incident.dispatch_logs[0].status === 'On Scene' ? 'bg-red-100 text-red-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}
                                            >
                                                {incident.dispatch_logs[0].status}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                            <p className="text-xs text-gray-400 font-medium">No active dispatch</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT COL: Status Board */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-white flex items-center">
                    Status Board
                </h2>
                
                {/* On Duty Summary */}
                <div className="glass-panel p-6 rounded-3xl border border-white/60">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Active Personnel</h3>
                    <div className="space-y-3">
                        {activeUsers.slice(0, 5).map(u => (
                            <div key={u.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                        {u.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">{u.full_name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase">{u.role}</p>
                                    </div>
                                </div>
                                <span className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></span>
                            </div>
                        ))}
                        {activeUsers.length === 0 && <p className="text-sm text-slate-400 italic">No personnel currently active.</p>}
                        
                        <button 
                            onClick={() => setShowOnDutyModal(true)}
                            className="w-full mt-2 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            View All Active
                        </button>
                    </div>
                </div>

                {/* Quick Stats or Info */}
                <div className="glass-panel p-6 rounded-3xl border border-white/60 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <Shield size={24} className="text-blue-200" />
                        <span className="px-2 py-1 bg-white/20 rounded-lg text-xs font-bold">SYSTEM ACTIVE</span>
                    </div>
                    <p className="text-2xl font-bold">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    <p className="text-blue-200 text-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {selectedDispatch && (
        <DispatchBottomSheet 
          dispatchLog={selectedDispatch} 
          availableOfficers={activeUsers}
          onClose={() => setSelectedDispatch(null)}
          onUpdate={handleUpdateDispatch}
        />
      )}

      {/* On Duty Modal */}
      {showOnDutyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 relative">
                  <button 
                      onClick={() => setShowOnDutyModal(false)}
                      className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                  >
                      <X size={20} className="text-gray-500" />
                  </button>
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                      <Users className="mr-2 text-green-600" />
                      Active Personnel
                  </h3>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      {activeUsers.map(u => (
                          <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                              <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                        {u.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{u.full_name}</p>
                                        <p className="text-xs text-slate-500 uppercase tracking-wide">{u.badge_number} • {u.role}</p>
                                    </div>
                              </div>
                              <div className="flex flex-col items-end">
                                  <span className="flex items-center text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                      Online
                                  </span>
                                  <span className="text-[10px] text-slate-400 mt-1">
                                      {new Date(u.last_active_at).toLocaleTimeString()}
                                  </span>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Edit Incident Modal */}
      {editingIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Update Status</h3>
                  <div className="space-y-3">
                      {['Pending', 'Dispatched', 'Resolved', 'Closed'].map((s) => (
                          <button
                              key={s}
                              onClick={() => handleUpdateIncident(editingIncident.id, { status: s })}
                              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-between ${
                                  editingIncident.status === s 
                                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' 
                                  : 'bg-gray-50 text-slate-600 hover:bg-gray-100'
                              }`}
                          >
                              <span>{s}</span>
                              {editingIncident.status === s && <Check size={18} />}
                          </button>
                      ))}
                  </div>
                  <button 
                    onClick={() => setEditingIncident(null)}
                    className="w-full mt-4 py-3 text-slate-500 font-bold hover:bg-gray-50 rounded-xl"
                  >
                      Cancel
                  </button>
              </div>
          </div>
      )}

      {/* Edit Narrative Modal */}
      {editingNarrative && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Update Narrative</h3>
                  <textarea 
                      className="w-full h-40 bg-gray-50 border border-gray-200 rounded-xl p-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      defaultValue={editingNarrative.narrative}
                      id="narrative-edit"
                  />
                  <div className="flex space-x-3 mt-4">
                      <button 
                        onClick={() => setEditingNarrative(null)}
                        className="flex-1 py-3 text-slate-500 font-bold hover:bg-gray-50 rounded-xl"
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