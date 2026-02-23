
import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Search, 
  Clock, 
  User, 
  Database,
  History,
  ArrowRight,
  Filter
} from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { AuditLog } from '../types';
import { useToast } from '../contexts/ToastContext';

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await supabaseService.getAuditLogs();
      setLogs(data);
    } catch (error: any) {
      console.error(error);
      showToast("Failed to load audit logs", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(l => 
    l.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.performer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.operation.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
          <Shield className="mr-3 text-blue-600" />
          Audit Logs
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">System-wide activity tracking for accountability.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search logs by table, user, or action..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Timestamp</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">User</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Action</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Module</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Record ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-5">
                    <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                      <Clock size={14} className="mr-2 opacity-50" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                        {log.performer_name?.charAt(0) || 'S'}
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{log.performer_name || 'System'}</span>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                      log.operation === 'INSERT' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' :
                      log.operation === 'UPDATE' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20' :
                      'bg-red-50 text-red-600 dark:bg-red-900/20'
                    }`}>
                      {log.operation}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Database size={14} className="mr-2 text-slate-400" />
                      {log.table_name}
                    </div>
                  </td>
                  <td className="p-5 font-mono text-xs text-slate-400">
                    {log.record_id}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 italic">No audit logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
