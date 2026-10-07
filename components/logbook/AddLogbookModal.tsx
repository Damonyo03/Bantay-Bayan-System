import React, { useState } from 'react';
import { LogbookCategory, LogEventParams } from '../../types';
import { logbookService } from '../../services/logbookService';
import { useToast } from '../../contexts/ToastContext';
import { X, Save, ShieldAlert, Loader2, BookOpen } from 'lucide-react';

interface AddLogbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES: { value: LogbookCategory; label: string }[] = [
  { value: 'other', label: 'General / Observation' },
  { value: 'vehicle', label: 'Vehicle / Mobile Patrol' },
  { value: 'blotter', label: 'Blotter Related' },
  { value: 'incident', label: 'Incident / Disturbance' },
  { value: 'cctv_request', label: 'CCTV Inspection' },
  { value: 'asset', label: 'Equipment Movement' },
  { value: 'queue', label: 'Public Assistance' },
  { value: 'handover', label: 'Shift Turn-over Note' },
];

export const AddLogbookModal: React.FC<AddLogbookModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    category: LogbookCategory;
    title: string;
    description: string;
    reference_type: string;
    reference_id: string;
  }>({
    category: 'other',
    title: '',
    description: '',
    reference_type: '',
    reference_id: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      showToast('Please provide both a title and description.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: LogEventParams = {
        category: formData.category,
        action: 'MANUAL_ENTRY',
        title: formData.title.trim(),
        description: formData.description.trim(),
        reference_type: formData.reference_type.trim() || null,
        reference_id: formData.reference_id.trim() || null,
        metadata: {
          source: 'manual_web_form',
          timestamp_local: new Date().toISOString(),
        },
      };

      await logbookService.logEvent(payload);
      showToast('Logbook entry recorded successfully.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save logbook entry:', err);
      showToast('Failed to record logbook entry: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-taguig-blue/10 dark:bg-taguig-gold/10 rounded-xl text-taguig-blue dark:text-taguig-gold">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                New Logbook Entry
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Post Proper Northside Operations Ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as LogbookCategory })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-taguig-blue focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Title / Activity <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Roving Patrol Commenced at Zone 3"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-taguig-blue focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Details & Narrative <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Provide a factual summary of the activity, observations, personnel involved, or incident details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-taguig-blue focus:outline-none resize-none"
            />
          </div>

          {/* Reference Info (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Reference Type (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Blotter / Vehicle / CCTV"
                value={formData.reference_type}
                onChange={(e) => setFormData({ ...formData, reference_type: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-taguig-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Reference ID / Case # (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. BB-2026-9041"
                value={formData.reference_id}
                onChange={(e) => setFormData({ ...formData, reference_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-taguig-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Immutable notice */}
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200/70 dark:border-amber-500/20 flex items-start space-x-2 text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <p>
              <strong>Tamper-Proof Notice:</strong> Logbook entries cannot be edited or deleted once submitted. Necessary adjustments must be added as formal correction notes.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-6 py-2.5 bg-taguig-blue hover:bg-taguig-navy text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Record Entry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
