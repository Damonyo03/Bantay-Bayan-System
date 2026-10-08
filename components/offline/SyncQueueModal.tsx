import React, { useState, useEffect } from 'react';
import { offlineDb } from '../../services/offline/offlineDb';
import { offlineSyncService } from '../../services/offline/offlineSyncService';
import { OfflineQueueItem, SyncSummary } from '../../services/offline/offlineTypes';
import {
  X,
  RefreshCw,
  AlertTriangle,
  Clock,
  Trash2,
  CheckCircle2,
  Wifi,
  WifiOff,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SyncSummary;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({
  isOpen,
  onClose,
  summary,
}) => {
  const [items, setItems] = useState<OfflineQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      const all = await offlineDb.getAllItems();
      setItems(all);
    } catch (err) {
      console.error('Failed to load queue items:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
  }, [isOpen, summary]);

  if (!isOpen) return null;

  const handleSyncAll = async () => {
    setLoading(true);
    try {
      await offlineSyncService.syncQueue();
      await loadQueue();
    } finally {
      setLoading(false);
    }
  };

  const handleRetryItem = async (id: string) => {
    setActionId(id);
    try {
      await offlineSyncService.retryItem(id);
      await loadQueue();
    } finally {
      setActionId(null);
    }
  };

  const handleDismissItem = async (id: string) => {
    if (window.confirm('Are you sure you want to dismiss this queued item? It will be removed from local storage.')) {
      setActionId(id);
      try {
        await offlineSyncService.dismissItem(id);
        await loadQueue();
      } finally {
        setActionId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div
              className={`p-3 rounded-2xl ${
                summary.isOnline
                  ? summary.conflictCount > 0
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
              }`}
            >
              {summary.isOnline ? <Wifi size={22} /> : <WifiOff size={22} />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                  Offline Storage & Sync
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    summary.isOnline
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                  }`}
                >
                  {summary.isOnline ? 'Network Connected' : 'Working Offline'}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                Local Queue Inspector
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="px-6 py-3 bg-slate-100/60 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Pending: <strong className="text-slate-900 dark:text-white">{summary.pendingCount}</strong>
            </span>
            {summary.conflictCount > 0 && (
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                <AlertTriangle size={13} />
                <span>Conflicts: <strong>{summary.conflictCount}</strong></span>
              </span>
            )}
            {summary.failedCount > 0 && (
              <span className="font-semibold text-red-600 dark:text-red-400 flex items-center space-x-1">
                <AlertCircle size={13} />
                <span>Failed: <strong>{summary.failedCount}</strong></span>
              </span>
            )}
          </div>

          <button
            disabled={loading || !summary.isOnline || summary.totalQueued === 0}
            onClick={handleSyncAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-taguig-blue hover:bg-taguig-navy text-white text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading || summary.isSyncing ? 'animate-spin' : ''} />
            <span>{loading || summary.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                All Changes Synced
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                There are no pending offline mutations. All logbook entries and vehicle actions are up-to-date.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isItemBusy = actionId === item.id;
              const originalTime = new Date(item.client_timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.status === 'conflict'
                      ? 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-300 dark:border-amber-500/30'
                      : item.status === 'failed'
                      ? 'bg-red-50/50 dark:bg-red-500/5 border-red-300 dark:border-red-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            item.status === 'conflict'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                              : item.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300'
                              : item.status === 'syncing'
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
                          <Clock size={11} />
                          <span>Entered: {originalTime}</span>
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.title || item.type}
                      </h4>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        title="Retry sync"
                        disabled={isItemBusy || !summary.isOnline}
                        onClick={() => handleRetryItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-40"
                      >
                        <RotateCcw size={14} className={isItemBusy ? 'animate-spin' : ''} />
                      </button>
                      <button
                        title="Dismiss item"
                        disabled={isItemBusy}
                        onClick={() => handleDismissItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Conflict or Error Details */}
                  {item.conflict_reason && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-100/80 dark:bg-amber-500/10 text-amber-900 dark:text-amber-300 text-xs flex items-start space-x-2">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <div>
                        <strong>Server Constraint Conflict:</strong> {item.conflict_reason}
                        <p className="text-[11px] mt-0.5 opacity-90">
                          Review vehicle status or re-apply after resolving the active assignment.
                        </p>
                      </div>
                    </div>
                  )}

                  {item.error_message && !item.conflict_reason && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-red-100/80 dark:bg-red-500/10 text-red-900 dark:text-red-300 text-xs flex items-start space-x-2">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <div>
                        <strong>Error:</strong> {item.error_message}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 text-[10px] font-mono text-slate-400 truncate">
                    Key: {item.id}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-end bg-slate-50 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
