import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuditAccessLog, AuditAccessAction } from '../types';
import { auditAccessService, AccessLogFilter } from '../services/auditAccessService';
import PageHeader from '../components/PageHeader';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  FileDown,
  Eye,
  Printer,
  FileSpreadsheet,
  Calendar,
  User,
  Clock,
  Layers,
  FileText,
  Activity,
  Laptop,
} from 'lucide-react';

const RECORD_TYPES = [
  { value: 'All', label: 'All Record Types' },
  { value: 'blotter', label: 'Blotter Records' },
  { value: 'blotter_archive', label: 'Archived Blotters' },
  { value: 'cctv_request', label: 'CCTV Requests' },
  { value: 'logbook', label: 'Operations Logbook' },
  { value: 'vehicle_monitor', label: 'Vehicle Monitoring' },
  { value: 'vehicle_trip', label: 'Vehicle Trips' },
  { value: 'resident', label: 'Resident Directory' },
];

export const AuditTrail: React.FC = () => {
  const [logs, setLogs] = useState<AuditAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>('All');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const fetchLogs = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      try {
        const data = await auditAccessService.getAccessLogs({
          action: actionFilter,
          record_type: recordTypeFilter,
          date_start: dateStart || undefined,
          date_end: dateEnd || undefined,
          search_query: searchQuery,
        });
        setLogs(data);
      } catch (err) {
        console.error('Failed to load audit access trail:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [actionFilter, recordTypeFilter, dateStart, dateEnd, searchQuery]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCsv = async () => {
    try {
      await auditAccessService.exportCsv(logs);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // KPI counts
  const stats = useMemo(() => {
    const viewed = logs.filter((l) => l.action === 'viewed').length;
    const exported = logs.filter((l) => l.action === 'exported').length;
    const printed = logs.filter((l) => l.action === 'printed').length;
    return { total: logs.length, viewed, exported, printed };
  }, [logs]);

  const getActionBadge = (action: AuditAccessAction) => {
    switch (action) {
      case 'viewed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
            <Eye size={12} />
            Viewed
          </span>
        );
      case 'exported':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
            <FileDown size={12} />
            Exported
          </span>
        );
      case 'printed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
            <Printer size={12} />
            Printed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Sensitive Data Audit Trail"
        subtitle="Data Privacy Act Compliance • Immutable Access Log for Sensitive Records"
      >
        <button
          onClick={handleExportCsv}
          disabled={logs.length === 0}
          className="w-full sm:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <FileSpreadsheet size={16} />
          <span>Export Access CSV</span>
        </button>
      </PageHeader>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Access</span>
            <Activity size={16} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-blue-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Views</span>
            <Eye size={16} />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.viewed}</p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-emerald-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Exports</span>
            <FileDown size={16} />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.exported}
          </p>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-purple-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Prints</span>
            <Printer size={16} />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.printed}</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Search Ref ID / Officer
            </label>
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Case #, officer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Access Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
            >
              <option value="All">All Actions</option>
              <option value="viewed">Viewed</option>
              <option value="exported">Exported</option>
              <option value="printed">Printed</option>
            </select>
          </div>

          {/* Record Type Filter */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Record Type
            </label>
            <select
              value={recordTypeFilter}
              onChange={(e) => setRecordTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
            >
              {RECORD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Strict reference logging: Personal data content is never retained in audit records.</span>
          </div>
          <button
            onClick={() => fetchLogs(true)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table of Audit Logs */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <RefreshCw size={28} className="animate-spin text-taguig-blue" />
          <p className="text-xs font-bold uppercase tracking-wider">Loading Access Audit Logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 text-center p-6">
          <ShieldCheck size={36} className="mx-auto text-slate-400 mb-2" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            No access log records found
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Access events will be recorded here whenever sensitive records or exports are viewed.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-white/5 text-slate-500 uppercase font-black text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Officer / Account</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Record Type</th>
                  <th className="px-5 py-3.5">Record Reference ID</th>
                  <th className="px-5 py-3.5">Client / User Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Timestamp */}
                    <td className="px-5 py-3.5 font-mono whitespace-nowrap text-[11px]">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {log.user_name || 'System / Officer'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{log.user_email || '—'}</div>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5">{getActionBadge(log.action)}</td>

                    {/* Record Type */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold uppercase text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                        {log.record_type}
                      </span>
                    </td>

                    {/* Record ID */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {log.record_id}
                      </span>
                    </td>

                    {/* User Agent */}
                    <td className="px-5 py-3.5 max-w-xs truncate text-[10px] font-mono text-slate-400" title={log.user_agent}>
                      {log.user_agent ? log.user_agent.slice(0, 60) + '...' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;
