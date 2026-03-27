
import React, { useEffect, useState, useMemo } from 'react';
import { systemService } from '../services/systemService';
import { AuditLog } from '../types';
import { FileClock, Activity, User, Filter, Search, RotateCcw, ChevronDown } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [targetFilter, setTargetFilter] = useState('All');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await systemService.getAuditLogs();
      setLogs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (op: string) => {
    switch (op) {
      case 'INSERT': return 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'UPDATE': return 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case 'DELETE': return 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      default: return 'text-slate-600 bg-gray-50 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const formatTableName = (name: string) => {
    if (!name) return 'SYSTEM';
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Derive unique values for filters
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(l => l.operation));
    return ['All', ...Array.from(actions)].sort();
  }, [logs]);

  const uniqueTargets = useMemo(() => {
    const targets = new Set(logs.map(l => l.table_name));
    return ['All', ...Array.from(targets)].sort();
  }, [logs]);

  // Filtered Logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = searchQuery === '' ||
        log.performer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.record_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.table_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = actionFilter === 'All' || log.operation === actionFilter;
      const matchesTarget = targetFilter === 'All' || log.table_name === targetFilter;

      return matchesSearch && matchesAction && matchesTarget;
    });
  }, [logs, searchQuery, actionFilter, targetFilter]);

  const resetFilters = () => {
    setSearchQuery('');
    setActionFilter('All');
    setTargetFilter('All');
  };

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <PageHeader
        title="History of Actions"
        subtitle="View recent system activities and events."
        icon={FileClock}
      >
        <button
          onClick={fetchLogs}
          className="w-full md:w-auto p-4 bg-white dark:bg-white/5 text-taguig-navy dark:text-white rounded-xl hover:bg-taguig-navy hover:text-white transition-all shadow-sm border border-slate-200 dark:border-white/10 flex items-center justify-center group"
        >
          <RotateCcw size={20} className={`${loading ? 'animate-spin' : ''} group-hover:rotate-180 transition-transform duration-500`} />
        </button>
      </PageHeader>

      {/* FILTER BAR */}
      <div className="card-premium p-4 rounded-[2rem] border border-slate-200 dark:border-white/10 flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <label htmlFor="searchLogs" className="sr-only">Search by user, record ID, or table...</label>
          <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
          <input
            id="searchLogs"
            type="text"
            placeholder="Search by user, record ID, or table..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-taguig-navy/20 outline-none text-slate-800 dark:text-white transition-all font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Action Filter */}
          <div className="relative flex-1 sm:w-44">
            <div className="absolute left-3 top-3.5 text-slate-400 pointer-events-none">
              <Filter size={16} />
            </div>
            <label htmlFor="actionFilter" className="sr-only">Action</label>
            <select
              id="actionFilter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold text-slate-700 dark:text-white appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20"
            >
              <option disabled>Action</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action === 'All' ? 'All Actions' : action}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Target Filter */}
          <div className="relative flex-1 sm:w-44">
            <div className="absolute left-3 top-3.5 text-slate-400 pointer-events-none">
              <Activity size={16} />
            </div>
            <label htmlFor="targetFilter" className="sr-only">Target</label>
            <select
              id="targetFilter"
              value={targetFilter}
              onChange={(e) => setTargetFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold text-slate-700 dark:text-white appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20"
            >
              <option disabled>Target</option>
              {uniqueTargets.map(target => (
                <option key={target} value={target}>{target === 'All' ? 'All Targets' : formatTableName(target)}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
          </div>

          <button
            onClick={resetFilters}
            className="px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-sm transition-colors whitespace-nowrap"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-500 font-medium animate-pulse">Retrieving system logs...</p>
        </div>
      ) : (
        <div className="card-premium p-0 overflow-hidden shadow-sm border border-slate-200 dark:border-white/10 animate-slide-up min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className="p-6 font-black text-slate-800 dark:text-taguig-gold text-[10px] uppercase tracking-[0.2em]">Timestamp</th>
                  <th className="p-6 font-black text-slate-800 dark:text-taguig-gold text-[10px] uppercase tracking-[0.2em]">User</th>
                  <th className="p-6 font-black text-slate-800 dark:text-taguig-gold text-[10px] uppercase tracking-[0.2em]">Action</th>
                  <th className="p-6 font-black text-slate-800 dark:text-taguig-gold text-[10px] uppercase tracking-[0.2em]">Target</th>
                  <th className="p-6 font-black text-slate-800 dark:text-taguig-gold text-[10px] uppercase tracking-[0.2em]">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {new Date(log.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-300">
                          <User size={14} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{log.performer_name || 'System'}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${getActionColor(log.operation)}`}>
                        {log.operation}
                      </span>
                    </td>
                    <td className="p-6">
                      <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        {formatTableName(log.table_name)}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed max-w-xs md:max-w-md truncate group-hover:whitespace-normal group-hover:break-words transition-all font-medium">
                        {log.operation === 'UPDATE' ? (
                          <span className="flex items-center space-x-1">
                            <span>Modified: {log.record_id?.substring(0, 8)}...</span>
                          </span>
                        ) : log.operation === 'INSERT' ? (
                          <span>Added new record ({log.record_id?.substring(0, 8)})</span>
                        ) : (
                          <span>Removed record ({log.record_id?.substring(0, 8)})</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredLogs.length === 0 && (
            <div className="p-20 text-center text-slate-400">
              <Activity className="w-16 h-16 mx-auto mb-6 opacity-10" />
              <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">No matching logs</h3>
              <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
              <button
                onClick={resetFilters}
                className="mt-6 text-blue-600 dark:text-blue-400 font-bold hover:underline"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
