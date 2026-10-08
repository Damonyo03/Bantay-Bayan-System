import React, { useState, useEffect } from 'react';
import { offlineSyncService } from '../../services/offline/offlineSyncService';
import { SyncSummary } from '../../services/offline/offlineTypes';
import { SyncQueueModal } from './SyncQueueModal';
import { isFeatureEnabled } from '../../src/config/features';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, AlertCircle } from 'lucide-react';

interface SyncStatusBadgeProps {
  className?: string;
  compact?: boolean;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  className = '',
  compact = false,
}) => {
  const [summary, setSummary] = useState<SyncSummary>({
    connectionState: 'online',
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    conflictCount: 0,
    failedCount: 0,
    totalQueued: 0,
    lastSyncTime: null,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Initial fetch
    offlineSyncService.getSyncSummary().then(setSummary);

    // Subscribe to live changes
    const unsubscribe = offlineSyncService.subscribe((newSummary) => {
      setSummary(newSummary);
    });

    return unsubscribe;
  }, []);

  if (!isFeatureEnabled('OFFLINE_SYNC')) {
    return null;
  }

  // Render variations based on connectionState
  const renderBadgeContent = () => {
    // 1. Syncing State
    if (summary.isSyncing) {
      return (
        <button
          onClick={() => setIsModalOpen(true)}
          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-300 dark:border-sky-500/30 transition-all hover:scale-105 active:scale-95 ${className}`}
          title="Syncing pending items with server..."
        >
          <RefreshCw size={12} className="animate-spin text-sky-600 dark:text-sky-400" />
          {!compact && <span>Syncing ({summary.totalQueued})</span>}
        </button>
      );
    }

    // 2. Conflict or Failure State
    if (summary.conflictCount > 0 || summary.failedCount > 0) {
      return (
        <button
          onClick={() => setIsModalOpen(true)}
          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300 border border-red-300 dark:border-red-500/30 transition-all hover:scale-105 active:scale-95 animate-pulse ${className}`}
          title="Sync issues detected. Click to view and resolve."
        >
          <AlertTriangle size={12} className="text-red-600 dark:text-red-400" />
          <span>
            {compact
              ? `! (${summary.conflictCount + summary.failedCount})`
              : `Sync Issue (${summary.conflictCount + summary.failedCount})`}
          </span>
        </button>
      );
    }

    // 3. Offline State
    if (!summary.isOnline) {
      return (
        <button
          onClick={() => setIsModalOpen(true)}
          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 transition-all hover:scale-105 active:scale-95 ${className}`}
          title="Device is offline. Changes are safely saved locally in IndexedDB."
        >
          <WifiOff size={12} className="text-amber-600 dark:text-amber-400" />
          <span>
            {compact
              ? `Offline${summary.pendingCount > 0 ? ` (${summary.pendingCount})` : ''}`
              : `Offline • ${summary.pendingCount} Queued`}
          </span>
        </button>
      );
    }

    // 4. Online with pending queue
    if (summary.pendingCount > 0) {
      return (
        <button
          onClick={() => setIsModalOpen(true)}
          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 transition-all hover:scale-105 active:scale-95 ${className}`}
          title="Online with pending local items. Click to sync."
        >
          <RefreshCw size={12} className="text-blue-600 dark:text-blue-400" />
          <span>{compact ? `${summary.pendingCount}` : `${summary.pendingCount} Pending`}</span>
        </button>
      );
    }

    // 5. Online Clean State
    return (
      <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all hover:bg-slate-200 dark:hover:bg-slate-700 ${className}`}
        title="Connected to server. Click to view offline queue status."
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        {!compact && <span className="font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300">Online</span>}
      </button>
    );
  };

  return (
    <>
      {renderBadgeContent()}
      <SyncQueueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        summary={summary}
      />
    </>
  );
};
