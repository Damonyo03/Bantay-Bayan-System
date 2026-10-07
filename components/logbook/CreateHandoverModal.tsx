import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { shiftHandoverService } from '../../services/shiftHandoverService';
import {
  X,
  FileCheck,
  User,
  Clock,
  AlertCircle,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';

interface CreateHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SHIFT_OPTIONS = [
  'Morning Shift (06:00 - 14:00)',
  'Afternoon Shift (14:00 - 22:00)',
  'Night / Graveyard Shift (22:00 - 06:00)',
  'Special Event / Emergency Shift',
];

export const CreateHandoverModal: React.FC<CreateHandoverModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const defaultOfficer = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  const [shiftName, setShiftName] = useState(SHIFT_OPTIONS[0]);
  const [outgoingName, setOutgoingName] = useState(defaultOfficer);
  const [incomingName, setIncomingName] = useState('');
  const [notes, setNotes] = useState('');
  const [pendingItems, setPendingItems] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setOutgoingName(user.user_metadata.full_name);
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outgoingName.trim()) {
      setError('Outgoing officer name is required.');
      return;
    }
    if (!notes.trim()) {
      setError('Handover briefing notes are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await shiftHandoverService.createHandover({
        shift_name: shiftName,
        outgoing_name: outgoingName.trim(),
        incoming_name: incomingName ? incomingName.trim() : null,
        notes: notes.trim(),
        pending_items: pendingItems ? pendingItems.trim() : null,
      });

      onSuccess();
      onClose();
      // Reset
      setNotes('');
      setPendingItems('');
      setIncomingName('');
    } catch (err: any) {
      console.error('Failed to create shift handover:', err);
      setError(err.message || 'Failed to submit shift handover.');
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
            <div className="p-3 rounded-2xl bg-taguig-blue/10 dark:bg-taguig-gold/20 text-taguig-blue dark:text-taguig-gold">
              <ClipboardList size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                Shift Transfer
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                New Shift Handover
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Shift Select */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Shift Schedule <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Clock
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={shiftName}
                onChange={(e) => setShiftName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              >
                {SHIFT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Outgoing Officer Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Outgoing Officer (Your Name) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                required
                placeholder="e.g. Officer Juan Dela Cruz"
                value={outgoingName}
                onChange={(e) => setOutgoingName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>
          </div>

          {/* Incoming Officer Name (Optional) */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Relieving / Incoming Officer (Optional)
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="e.g. Officer Pedro Santos (or leave open)"
                value={incomingName}
                onChange={(e) => setIncomingName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>
          </div>

          {/* Briefing Notes */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Shift Summary & General Observations <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Peaceful shift overall. 2 routine patrols conducted along Zone 1 to Zone 4. All outpost personnel present."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue"
            />
          </div>

          {/* Pending Items & Follow-ups */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">
              Pending Endorsements / Action Items
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Case #2026-042 complainant returning at 15:00 for mediation. Patrol vehicle 2 scheduled for tire check."
              value={pendingItems}
              onChange={(e) => setPendingItems(e.target.value)}
              className="w-full px-4 py-3 bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
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
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-taguig-blue hover:bg-taguig-navy text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-taguig-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{loading ? 'Submitting...' : 'Post Handover Note'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
