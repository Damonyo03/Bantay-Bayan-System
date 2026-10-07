import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogbookEntry } from '../../types';
import { logbookService } from '../../services/logbookService';
import { logbookExportService } from '../../services/logbookExportService';
import {
  X,
  FileDown,
  Printer,
  FileSpreadsheet,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  FileText,
  Sparkles,
} from 'lucide-react';

interface ExportLogbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  currentEntries?: LogbookEntry[];
}

export const ExportLogbookModal: React.FC<ExportLogbookModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
  currentEntries = [],
}) => {
  const { user } = useAuth();
  const defaultOfficer = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [exportType, setExportType] = useState<'daily_print' | 'range_pdf' | 'csv'>('daily_print');
  const [dateStart, setDateStart] = useState(defaultDate || getTodayStr());
  const [dateEnd, setDateEnd] = useState(defaultDate || getTodayStr());
  const [officerName, setOfficerName] = useState(defaultOfficer);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (defaultDate) {
      setDateStart(defaultDate);
      setDateEnd(defaultDate);
    }
  }, [defaultDate]);

  if (!isOpen) return null;

  const handleExport = async (mode: 'download' | 'print' = 'download') => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Fetch entries for specified date range
      let exportData: LogbookEntry[] = [];

      if (dateStart === dateEnd && defaultDate === dateStart && currentEntries.length > 0) {
        exportData = currentEntries;
      } else {
        exportData = await logbookService.getEntriesByDate(dateStart);
        // If range is multiple days, we can query dates
        if (dateStart !== dateEnd) {
          // Additional days query if needed
          const cur = new Date(`${dateStart}T12:00:00`);
          const end = new Date(`${dateEnd}T12:00:00`);
          const allEntries: LogbookEntry[] = [...exportData];

          cur.setDate(cur.getDate() + 1);
          while (cur <= end) {
            const year = cur.getFullYear();
            const month = String(cur.getMonth() + 1).padStart(2, '0');
            const day = String(cur.getDate()).padStart(2, '0');
            const dStr = `${year}-${month}-${day}`;
            const nextData = await logbookService.getEntriesByDate(dStr);
            allEntries.push(...nextData);
            cur.setDate(cur.getDate() + 1);
          }
          exportData = allEntries;
        }
      }

      // 2. Perform requested format export
      if (exportType === 'daily_print') {
        await logbookExportService.generateDailyLogPdf({
          dateStart,
          entries: exportData,
          officerName: officerName.trim(),
          mode: 'print',
        });
        setSuccessMsg('Daily Logbook sent to print/preview successfully.');
      } else if (exportType === 'range_pdf') {
        await logbookExportService.exportDateRangePdf({
          dateStart,
          dateEnd,
          entries: exportData,
          officerName: officerName.trim(),
          mode: mode,
        });
        setSuccessMsg('Logbook PDF report downloaded successfully.');
      } else if (exportType === 'csv') {
        await logbookExportService.exportCsv({
          dateStart,
          dateEnd,
          entries: exportData,
        });
        setSuccessMsg('Logbook CSV data exported successfully.');
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err.message || 'Failed to export logbook records.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-taguig-blue/10 dark:bg-taguig-gold/20 text-taguig-blue dark:text-taguig-gold">
              <FileDown size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                Official Ledger Export
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                Export & Print Logbook
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Export Format Chooser Cards */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Choose Export Format
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Daily Printable Log */}
              <div
                onClick={() => setExportType('daily_print')}
                className={`cursor-pointer p-3 rounded-2xl border text-center transition-all ${
                  exportType === 'daily_print'
                    ? 'border-taguig-blue bg-taguig-blue/10 dark:bg-taguig-gold/10 ring-2 ring-taguig-blue text-taguig-blue dark:text-taguig-gold'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Printer size={22} className="mx-auto mb-1.5" />
                <div className="text-xs font-black">Daily Printout</div>
                <div className="text-[10px] opacity-75">With Signatures</div>
              </div>

              {/* PDF Report Range */}
              <div
                onClick={() => setExportType('range_pdf')}
                className={`cursor-pointer p-3 rounded-2xl border text-center transition-all ${
                  exportType === 'range_pdf'
                    ? 'border-taguig-blue bg-taguig-blue/10 dark:bg-taguig-gold/10 ring-2 ring-taguig-blue text-taguig-blue dark:text-taguig-gold'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                }`}
              >
                <FileText size={22} className="mx-auto mb-1.5" />
                <div className="text-xs font-black">PDF Report</div>
                <div className="text-[10px] opacity-75">Date Range Log</div>
              </div>

              {/* CSV */}
              <div
                onClick={() => setExportType('csv')}
                className={`cursor-pointer p-3 rounded-2xl border text-center transition-all ${
                  exportType === 'csv'
                    ? 'border-taguig-blue bg-taguig-blue/10 dark:bg-taguig-gold/10 ring-2 ring-taguig-blue text-taguig-blue dark:text-taguig-gold'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                }`}
              >
                <FileSpreadsheet size={22} className="mx-auto mb-1.5" />
                <div className="text-xs font-black">CSV Data</div>
                <div className="text-[10px] opacity-75">Excel / Sheets</div>
              </div>
            </div>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              {exportType === 'daily_print' ? 'Select Day' : 'Select Date Range'}
            </label>
            {exportType === 'daily_print' ? (
              <div className="relative">
                <Calendar
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => {
                    setDateStart(e.target.value);
                    setDateEnd(e.target.value);
                  }}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="relative">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">From</span>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
                  />
                </div>
                <div className="relative">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">To</span>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Prepared / Duty Officer Name */}
          {exportType !== 'csv' && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Duty Officer Name (for Signature Line)
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="e.g. Officer Juan Dela Cruz"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
                />
              </div>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
              <Sparkles size={12} className="text-taguig-blue" />
              <span>Automated Audit Ledger</span>
            </div>
            <div>Every export or print action will automatically be logged in the immutable system logbook.</div>
          </div>
        </div>

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

          {exportType === 'daily_print' ? (
            <button
              onClick={() => handleExport('print')}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Printer size={16} />
              <span>{loading ? 'Preparing Printout...' : 'Print Daily Log'}</span>
            </button>
          ) : exportType === 'range_pdf' ? (
            <button
              onClick={() => handleExport('download')}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-taguig-blue hover:bg-taguig-navy text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-taguig-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <FileDown size={16} />
              <span>{loading ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>
          ) : (
            <button
              onClick={() => handleExport('download')}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              <span>{loading ? 'Exporting CSV...' : 'Download CSV'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
