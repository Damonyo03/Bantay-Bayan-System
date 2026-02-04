
import React, { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { AuditLog } from '../types';
import { FileClock, Activity, ArrowRight, User } from 'lucide-react';

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await supabaseService.getAuditLogs();
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (op: string) => {
    switch (op) {
      case 'INSERT': return 'text-green-600 bg-green-50 border-green-200';
      case 'UPDATE': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'DELETE': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTableName = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="space-y-8 pb-20">
      <header>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center">
            <FileClock className="mr-3 text-slate-700" />
            System Audit Logs
        </h1>
        <p className="text-gray-500 mt-2">Track all critical system events and user actions in real-time.</p>
      </header>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-white/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                    <th className="p-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">Timestamp</th>
                    <th className="p-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">User</th>
                    <th className="p-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">Action</th>
                    <th className="p-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">Target</th>
                    <th className="p-6 font-semibold text-gray-600 text-sm uppercase tracking-wider w-1/3">Details</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-6 whitespace-nowrap">
                        <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">
                                {new Date(log.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-gray-500">
                                {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                        </div>
                    </td>
                    <td className="p-6 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                            <div className="bg-gray-200 p-1.5 rounded-full">
                                <User size={12} className="text-gray-600"/>
                            </div>
                            <span className="text-sm font-medium text-gray-700">{log.performer_name}</span>
                        </div>
                    </td>
                    <td className="p-6 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getActionColor(log.operation)}`}>
                            {log.operation}
                        </span>
                    </td>
                    <td className="p-6 whitespace-nowrap">
                        <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                            {formatTableName(log.table_name)}
                        </span>
                    </td>
                    <td className="p-6">
                        <div className="text-xs text-gray-500 font-mono leading-relaxed max-w-xs md:max-w-md truncate group-hover:whitespace-normal group-hover:break-words transition-all">
                             {/* Simplified Detail View logic */}
                             {log.operation === 'UPDATE' ? (
                                 <span className="flex items-center space-x-1">
                                    <span>Modified ID: {log.record_id?.substring(0,8)}...</span>
                                 </span>
                             ) : log.operation === 'INSERT' ? (
                                <span>Created new record</span>
                             ) : (
                                <span>Removed record</span>
                             )}
                        </div>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
          {logs.length === 0 && (
             <div className="p-12 text-center text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No audit logs found.</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
