
import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  MapPin, 
  User, 
  ArrowRight,
  TrendingUp,
  Shield,
  FileText,
  Truck
} from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { IncidentWithDetails, DispatchLog } from '../types';
import { useToast } from '../contexts/ToastContext';

const CommandCenter: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentWithDetails[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [incData, logData] = await Promise.all([
        supabaseService.getIncidents(),
        supabaseService.getDispatchHistory()
      ]);
      setIncidents(incData);
      setDispatchLogs(logData);
    } catch (error: any) {
      console.error("Failed to fetch command center data:", error);
      showToast("Failed to refresh data", "error");
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { 
      label: 'Total Incidents', 
      value: incidents.length, 
      icon: <FileText className="text-blue-600" />, 
      bg: 'bg-blue-50 dark:bg-blue-900/20' 
    },
    { 
      label: 'Active Dispatches', 
      value: incidents.filter(i => i.status === 'Dispatched').length, 
      icon: <Truck className="text-orange-600" />, 
      bg: 'bg-orange-50 dark:bg-orange-900/20' 
    },
    { 
      label: 'Pending Reports', 
      value: incidents.filter(i => i.status === 'Pending').length, 
      icon: <Clock className="text-amber-600" />, 
      bg: 'bg-amber-50 dark:bg-amber-900/20' 
    },
    { 
      label: 'Resolved Today', 
      value: incidents.filter(i => i.status === 'Resolved' && new Date(i.created_at).toDateString() === new Date().toDateString()).length, 
      icon: <CheckCircle className="text-emerald-600" />, 
      bg: 'bg-emerald-50 dark:bg-emerald-900/20' 
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Command Center</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Real-time monitoring and incident management.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg}`}>
                {stat.icon}
              </div>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Incidents */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
              <Activity className="mr-2 text-blue-600" size={20} />
              Recent Incidents
            </h2>
            <button className="text-sm font-bold text-blue-600 hover:underline flex items-center">
              View All <ArrowRight size={16} className="ml-1" />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Case #</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Location</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {incidents.slice(0, 8).map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                      <td className="p-4 font-mono text-sm font-bold text-blue-600">{inc.case_number}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                          inc.type === 'Medical' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' :
                          inc.type === 'Fire' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20' :
                          inc.type === 'Theft' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20' :
                          'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                        }`}>
                          {inc.type}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-1 opacity-50" />
                          {inc.location}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          inc.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                          inc.status === 'Dispatched' ? 'bg-blue-100 text-blue-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                  {incidents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 italic">No incidents reported yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Dispatch Feed */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Truck className="mr-2 text-blue-600" size={20} />
            Dispatch Feed
          </h2>
          <div className="space-y-4">
            {dispatchLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{log.unit_name}</span>
                  <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{log.incidents?.type} at {log.incidents?.location}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                    log.status === 'En Route' ? 'bg-blue-100 text-blue-700' :
                    log.status === 'On Scene' ? 'bg-orange-100 text-orange-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {log.status}
                  </span>
                  <button className="text-[10px] font-bold text-slate-400 hover:text-blue-600">Details</button>
                </div>
              </div>
            ))}
            {dispatchLogs.length === 0 && (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-sm text-slate-500">No active dispatches.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
