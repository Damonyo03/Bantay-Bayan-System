import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { summaryService } from '../../services/summaryService';
import { DailySummaryData } from '../../types';
import {
  Activity,
  FileText,
  Video,
  Car,
  BookOpen,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  Sparkles,
  ClipboardList,
} from 'lucide-react';

export const DailySummaryWidget: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DailySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const data = await summaryService.getDailySummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load daily summary:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const counts = summary?.today_counts || {
    blotters: 0,
    cctv_requests: 0,
    vehicle_trips: 0,
    logbook_entries: 0,
  };

  const pending = summary?.pending_items || {
    pending_blotters: 0,
    pending_cctv: 0,
    ongoing_trips: 0,
    pending_reports: 0,
    pending_handovers: 0,
  };

  const totalPending =
    pending.pending_blotters +
    pending.pending_cctv +
    pending.ongoing_trips +
    pending.pending_reports +
    pending.pending_handovers;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5 animate-fadeIn">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-taguig-blue/10 dark:bg-taguig-gold/15 text-taguig-blue dark:text-taguig-gold">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Operations Overview
            </span>
            <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
              Daily Operations Summary
            </h3>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {totalPending > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>{totalPending} Action Items</span>
            </span>
          )}
          <button
            onClick={() => fetchSummary(true)}
            title="Refresh Daily Metrics"
            className="p-2 rounded-xl text-slate-400 hover:text-taguig-blue dark:hover:text-white transition-colors"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid 1: Today's Logged Activities */}
      <div>
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
          Today's Activity Counters
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Blotters Today */}
          <div
            onClick={() => navigate('/dashboard')}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 hover:border-red-300 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold">Blotters</span>
              <FileText size={15} className="text-red-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {loading ? '—' : counts.blotters}
            </div>
          </div>

          {/* CCTV Today */}
          <div
            onClick={() => navigate('/download-forms')}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 hover:border-sky-300 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold">CCTV</span>
              <Video size={15} className="text-sky-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {loading ? '—' : counts.cctv_requests}
            </div>
          </div>

          {/* Vehicle Trips Today */}
          <div
            onClick={() => navigate('/vehicles')}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 hover:border-emerald-300 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold">Trips</span>
              <Car size={15} className="text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {loading ? '—' : counts.vehicle_trips}
            </div>
          </div>

          {/* Logbook Entries Today */}
          <div
            onClick={() => navigate('/logbook')}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 hover:border-amber-300 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold">Ledger</span>
              <BookOpen size={15} className="text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {loading ? '—' : counts.logbook_entries}
            </div>
          </div>
        </div>
      </div>

      {/* Grid 2: Pending / Action Items Bar */}
      <div>
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
          Pending & Active Action Items
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Active Blotters */}
          <div
            onClick={() => navigate('/dashboard')}
            className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-500/5 border border-amber-200/70 dark:border-amber-500/20 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all"
          >
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-300">
                Active Blotters
              </div>
              <div className="text-[11px] text-slate-500">Pending investigation</div>
            </div>
            <div className="flex items-center space-x-1 font-mono font-black text-amber-800 dark:text-amber-300 text-lg">
              <span>{loading ? '—' : pending.pending_blotters}</span>
              <ChevronRight size={14} className="opacity-50" />
            </div>
          </div>

          {/* Ongoing Patrol Trips */}
          <div
            onClick={() => navigate('/vehicles')}
            className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-500/5 border border-sky-200/70 dark:border-sky-500/20 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all"
          >
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-sky-900 dark:text-sky-300">
                Ongoing Patrols
              </div>
              <div className="text-[11px] text-slate-500">Units currently on field</div>
            </div>
            <div className="flex items-center space-x-1 font-mono font-black text-sky-800 dark:text-sky-300 text-lg">
              <span>{loading ? '—' : pending.ongoing_trips}</span>
              <ChevronRight size={14} className="opacity-50" />
            </div>
          </div>

          {/* Pending CCTV / Handovers */}
          <div
            onClick={() => navigate(pending.pending_cctv > 0 ? '/download-forms' : '/logbook')}
            className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-500/5 border border-purple-200/70 dark:border-purple-500/20 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-all"
          >
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-purple-900 dark:text-purple-300">
                Pending Reviews
              </div>
              <div className="text-[11px] text-slate-500">
                {pending.pending_cctv} CCTV, {pending.pending_handovers} Handovers
              </div>
            </div>
            <div className="flex items-center space-x-1 font-mono font-black text-purple-800 dark:text-purple-300 text-lg">
              <span>{loading ? '—' : pending.pending_cctv + pending.pending_handovers}</span>
              <ChevronRight size={14} className="opacity-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
