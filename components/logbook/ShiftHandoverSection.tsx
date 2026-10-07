import React, { useState, useEffect, useCallback } from 'react';
import { ShiftHandover } from '../../types';
import { shiftHandoverService } from '../../services/shiftHandoverService';
import { CreateHandoverModal } from './CreateHandoverModal';
import { AcknowledgeHandoverModal } from './AcknowledgeHandoverModal';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  Clock,
  User,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  ShieldAlert,
} from 'lucide-react';

export const ShiftHandoverSection: React.FC = () => {
  const [handovers, setHandovers] = useState<ShiftHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [acknowledgingHandover, setAcknowledgingHandover] = useState<ShiftHandover | null>(null);

  const fetchHandovers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await shiftHandoverService.getHandovers(50);
      setHandovers(data);
    } catch (err) {
      console.error('Failed to load shift handovers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHandovers();

    const channel = shiftHandoverService.subscribeToHandovers(() => {
      fetchHandovers();
    });

    return () => {
      shiftHandoverService.unsubscribe(channel);
    };
  }, [fetchHandovers]);

  const filteredHandovers = handovers.filter((h) => {
    const matchesSearch =
      h.outgoing_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.shift_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.acknowledged_by_name &&
        h.acknowledged_by_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterPendingOnly && h.acknowledged_at) return false;
    return true;
  });

  const pendingCount = handovers.filter((h) => !h.acknowledged_at).length;

  return (
    <div className="space-y-6">
      {/* Top Controls Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-taguig-blue/10 dark:bg-taguig-gold/20 text-taguig-blue dark:text-taguig-gold text-[10px] font-black uppercase tracking-widest">
              Shift Operations
            </span>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center space-x-1">
                <AlertTriangle size={11} />
                <span>{pendingCount} Pending Acknowledgment</span>
              </span>
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            Officer Shift Handovers & Endorsements
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Outgoing duty briefings, key incident endorsements, and incoming officer acknowledgments.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-taguig-blue hover:bg-taguig-navy text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-taguig-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>New Handover</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search notes, officer names, shift types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue"
          />
        </div>

        <button
          onClick={() => setFilterPendingOnly(!filterPendingOnly)}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 ${
            filterPendingOnly
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Pending Acknowledgment Only</span>
        </button>

        <button
          onClick={fetchHandovers}
          title="Refresh Handovers"
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-taguig-blue transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* List of Handover Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <RefreshCw size={28} className="animate-spin text-taguig-blue" />
          <p className="text-xs font-bold uppercase tracking-wider">Loading Handover Notes...</p>
        </div>
      ) : filteredHandovers.length === 0 ? (
        <div className="py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 text-center p-6">
          <ClipboardList size={36} className="mx-auto text-slate-400 mb-2" />
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            No shift handover records found
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {filterPendingOnly
              ? 'All shift handovers are currently acknowledged!'
              : 'Logged shift transfers will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHandovers.map((item) => {
            const isAcknowledged = !!item.acknowledged_at;

            return (
              <div
                key={item.id}
                className={`p-5 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border transition-all shadow-sm space-y-4 ${
                  !isAcknowledged
                    ? 'border-amber-400/80 dark:border-amber-500/40 ring-1 ring-amber-400/20'
                    : 'border-slate-200/80 dark:border-white/10'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2.5 rounded-2xl ${
                        !isAcknowledged
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isAcknowledged ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-black text-sm text-slate-900 dark:text-white">
                          {item.shift_name}
                        </h3>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(item.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 flex items-center space-x-2">
                        <User size={13} className="text-taguig-blue" />
                        <span>
                          Outgoing Officer: <strong>{item.outgoing_name}</strong>
                        </span>
                        {item.incoming_name && (
                          <span className="text-slate-400">
                            → Target: <strong>{item.incoming_name}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isAcknowledged ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                        <Check size={13} />
                        Acknowledged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 animate-pulse">
                        <AlertTriangle size={12} />
                        Pending Acknowledgment
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes & Pending Items */}
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] block mb-1">
                      Briefing Notes & Observations
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                      {item.notes}
                    </p>
                  </div>

                  {item.pending_items && (
                    <div>
                      <span className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider text-[11px] block mb-1">
                        Pending Items / Follow-up Tasks
                      </span>
                      <p className="text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-line bg-amber-50/60 dark:bg-amber-500/5 p-3 rounded-2xl border border-amber-200/80 dark:border-amber-500/20 font-medium">
                        {item.pending_items}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer / Acknowledgment Status */}
                <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {isAcknowledged ? (
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center space-x-1.5">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>
                        Acknowledged by <strong>{item.acknowledged_by_name}</strong> on{' '}
                        {new Date(item.acknowledged_at!).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 ml-auto">
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                        Incoming officer must review & acknowledge.
                      </span>
                      <button
                        onClick={() => setAcknowledgingHandover(item)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-1.5"
                      >
                        <CheckCircle2 size={14} />
                        <span>Acknowledge Handover</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateHandoverModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchHandovers}
      />

      <AcknowledgeHandoverModal
        handover={acknowledgingHandover}
        isOpen={!!acknowledgingHandover}
        onClose={() => setAcknowledgingHandover(null)}
        onSuccess={fetchHandovers}
      />
    </div>
  );
};
