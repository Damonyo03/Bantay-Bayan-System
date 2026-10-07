import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShiftHandover } from '../../types';
import { shiftHandoverService } from '../../services/shiftHandoverService';
import {
  X,
  CheckCircle2,
  User,
  Clock,
  AlertCircle,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';

interface AcknowledgeHandoverModalProps {
  handover: ShiftHandover | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AcknowledgeHandoverModal: React.FC<AcknowledgeHandoverModalProps> = ({
  handover,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const defaultOfficer = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  const [acknowledgedByName, setAcknowledgedByName] = useState(defaultOfficer);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (handover?.incoming_name) {
      setAcknowledgedByName(handover.incoming_name);
    } else if (user?.user_metadata?.full_name) {
      setAcknowledgedByName(user.user_metadata.full_name);
    }
  }, [handover, user]);

  if (!isOpen || !handover) return null;

  const handleAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledgedByName.trim()) {
      setError('Relieving officer name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await shiftHandoverService.acknowledgeHandover(
        handover.id,
        acknowledgedByName.trim()
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to acknowledge handover:', err);
      setError(err.message || 'Failed to acknowledge shift handover.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                Relieving Confirmation
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                Acknowledge Shift Handover
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

        {/* Scrollable Body */}
        <form onSubmit={handleAcknowledge} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Outgoing Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5">
              <span className="font-bold text-slate-800 dark:text-white flex items-center space-x-1.5">
                <Clock size={13} className="text-taguig-blue" />
                <span>{handover.shift_name}</span>
              </span>
              <span className="font-mono text-slate-500 text-[11px]">
                {new Date(handover.created_at).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="text-slate-600 dark:text-slate-300">
              <strong className="text-slate-800 dark:text-white">Outgoing Officer:</strong>{' '}
              {handover.outgoing_name}
            </div>

            <div className="text-slate-600 dark:text-slate-300">
              <strong className="text-slate-800 dark:text-white">Briefing Notes:</strong>{' '}
              {handover.notes}
            </div>

            {handover.pending_items && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-[11px]">
                <strong>Pending Endorsements:</strong> {handover.pending_items}
              </div>
            )}
          </div>

          {/* Relieving Officer Field */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Relieving / Acknowledging Officer Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                required
                placeholder="e.g. Officer Pedro Santos"
                value={acknowledgedByName}
                onChange={(e) => setAcknowledgedByName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              By confirming, you certify that you have received the post briefing, equipment, and pending duty items.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-end space-x-3 bg-slate-50 dark:bg-slate-800/40">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider hover:bg-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAcknowledge}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{loading ? 'Confirming...' : 'Acknowledge & Take Over'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
