import React, { useState } from 'react';
import { LogbookEntry } from '../../types';
import { logbookService } from '../../services/logbookService';
import { useToast } from '../../contexts/ToastContext';
import { X, Edit3, Save, ShieldAlert, Loader2, Info } from 'lucide-react';

interface AddCorrectionModalProps {
  isOpen: boolean;
  entry: LogbookEntry | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddCorrectionModal: React.FC<AddCorrectionModalProps> = ({
  isOpen,
  entry,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correctionTitle, setCorrectionTitle] = useState('');
  const [correctionDescription, setCorrectionDescription] = useState('');

  if (!isOpen || !entry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!correctionDescription.trim()) {
      showToast('Please provide details for the correction.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalTitle =
        correctionTitle.trim() || `Correction to: ${entry.title}`;

      await logbookService.addCorrection(
        entry,
        finalTitle,
        correctionDescription.trim()
      );

      showToast('Correction note recorded successfully.', 'success');
      setCorrectionTitle('');
      setCorrectionDescription('');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to add correction:', err);
      showToast(
        'Failed to record correction: ' + (err.message || 'Unknown error'),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/10 bg-amber-50/50 dark:bg-amber-500/10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 rounded-xl text-amber-700 dark:text-amber-300">
              <Edit3 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Add Correction Note
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Append-only amendment to Entry #{entry.id.slice(0, 8)}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Target Entry Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Info size={13} /> Original Entry Snapshot
              </span>
              <span>{new Date(entry.created_at).toLocaleTimeString()}</span>
            </div>
            <p className="font-bold text-slate-900 dark:text-white text-sm">{entry.title}</p>
            <p className="text-slate-600 dark:text-slate-300 line-clamp-2">{entry.description}</p>
            <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Recorded by: <strong className="text-slate-700 dark:text-slate-200">{entry.reporter_name}</strong> ({entry.reporter_role})
            </div>
          </div>

          {/* Correction Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Correction Subject
            </label>
            <input
              type="text"
              placeholder={`e.g. Amended details for: ${entry.title}`}
              value={correctionTitle}
              onChange={(e) => setCorrectionTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Correction Narrative */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Correction Narrative / Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="State the specific correction, clarification, or amended facts clearly..."
              value={correctionDescription}
              onChange={(e) => setCorrectionDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
            />
          </div>

          {/* Ledger Rule Alert */}
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20 flex items-start space-x-2 text-xs text-amber-800 dark:text-amber-300">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <p>
              In compliance with audit standards, the original log is preserved unchanged. This note will appear alongside it as an official amendment.
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
              className="flex items-center space-x-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Record Correction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
