import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { LogbookEntry, LogbookCategory } from '../types';
import { logbookService } from '../services/logbookService';
import PageHeader from '../components/PageHeader';
import { LogbookEntryCard } from '../components/logbook/LogbookEntryCard';
import { AddLogbookModal } from '../components/logbook/AddLogbookModal';
import { AddCorrectionModal } from '../components/logbook/AddCorrectionModal';
import {
  BookOpen,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Layers,
  FileCheck,
  AlertCircle,
  FileText,
  Truck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const CATEGORY_OPTIONS: { value: LogbookCategory | 'All'; label: string }[] = [
  { value: 'All', label: 'All Categories' },
  { value: 'blotter', label: 'Blotter' },
  { value: 'incident', label: 'Incident' },
  { value: 'cctv_request', label: 'CCTV Request' },
  { value: 'vehicle', label: 'Vehicle / Patrol' },
  { value: 'asset', label: 'Asset Movement' },
  { value: 'queue', label: 'Public Queue' },
  { value: 'handover', label: 'Shift Handover' },
  { value: 'correction', label: 'Corrections' },
  { value: 'other', label: 'General' },
];

export const Logbook: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Date selection state (defaults to today in local YYYY-MM-DD format)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<LogbookCategory | 'All'>('All');
  const [selectedReporter, setSelectedReporter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<LogbookEntry | null>(null);

  // Load entries
  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const data = await logbookService.getEntriesByDate(selectedDate, {
        category: selectedCategory,
        reporter: selectedReporter,
        query: searchQuery,
      });
      setEntries(data);
    } catch (err: any) {
      console.error('Failed to fetch logbook entries:', err);
      showToast('Failed to load logbook entries: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedDate, selectedCategory, selectedReporter, searchQuery]);

  // Real-time listener
  useEffect(() => {
    const channel = logbookService.subscribeToLogbook((newEntry) => {
      // Convert to local date YYYY-MM-DD
      const d = new Date(newEntry.created_at);
      const localYear = d.getFullYear();
      const localMonth = String(d.getMonth() + 1).padStart(2, '0');
      const localDay = String(d.getDate()).padStart(2, '0');
      const localEntryDay = `${localYear}-${localMonth}-${localDay}`;

      if (localEntryDay === selectedDate) {
        fetchEntries();
        showToast(`Logbook updated: ${newEntry.title}`, 'info');
      }
    });

    return () => {
      logbookService.unsubscribe(channel);
    };
  }, [selectedDate, selectedCategory, selectedReporter, searchQuery]);

  // Unique list of reporters from currently loaded entries
  const reportersList = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((e) => {
      if (e.reported_by && e.reporter_name) {
        map.set(e.reported_by, e.reporter_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [entries]);

  // Date navigation handlers
  const handlePrevDay = () => {
    const current = new Date(`${selectedDate}T12:00:00`);
    current.setDate(current.getDate() - 1);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleNextDay = () => {
    const current = new Date(`${selectedDate}T12:00:00`);
    current.setDate(current.getDate() + 1);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleSetToday = () => {
    setSelectedDate(getTodayStr());
  };

  // Group entries by hour (e.g. "14:00 - 14:59")
  const groupedEntries = useMemo(() => {
    const groups: { hourLabel: string; hour: number; items: LogbookEntry[] }[] = [];
    const hourMap = new Map<number, LogbookEntry[]>();

    entries.forEach((entry) => {
      const date = new Date(entry.created_at);
      const hour = date.getHours();
      if (!hourMap.has(hour)) {
        hourMap.set(hour, []);
      }
      hourMap.get(hour)!.push(entry);
    });

    // Sort hours descending (newest hours first)
    const sortedHours = Array.from(hourMap.keys()).sort((a, b) => b - a);

    sortedHours.forEach((hour) => {
      const nextHour = (hour + 1) % 24;
      const startStr = `${String(hour).padStart(2, '0')}:00`;
      const endStr = `${String(hour).padStart(2, '0')}:59`;
      groups.push({
        hourLabel: `${startStr} - ${endStr}`,
        hour,
        items: hourMap.get(hour) || [],
      });
    });

    return groups;
  }, [entries]);

  // Quick category summary counts
  const categoryStats = useMemo(() => {
    const blotter = entries.filter((e) => e.category === 'blotter' || e.category === 'incident').length;
    const vehicles = entries.filter((e) => e.category === 'vehicle').length;
    const assets = entries.filter((e) => e.category === 'asset').length;
    const corrections = entries.filter((e) => e.category === 'correction').length;
    return { total: entries.length, blotter, vehicles, assets, corrections };
  }, [entries]);

  const formattedDisplayDate = useMemo(() => {
    const dateObj = new Date(`${selectedDate}T12:00:00`);
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDate]);

  const isViewingToday = selectedDate === getTodayStr();

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Operations Logbook"
        subtitle="Immutable Digital Operations & Activity Ledger • Post Proper Northside"
      >
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto bg-taguig-blue hover:bg-taguig-navy text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-taguig-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
        >
          <Plus size={18} />
          <span>Manual Entry</span>
        </button>
      </PageHeader>

      {/* Stats Quick Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total</span>
            <Layers size={14} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{categoryStats.total}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-red-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Blotters</span>
            <FileText size={14} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{categoryStats.blotter}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-sky-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Patrols</span>
            <Truck size={14} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{categoryStats.vehicles}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between text-indigo-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Assets</span>
            <FileCheck size={14} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{categoryStats.assets}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Corrections</span>
            <RotateCcw size={14} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{categoryStats.corrections}</p>
        </div>
      </div>

      {/* Date Navigation & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
        {/* Date Selector Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevDay}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center space-x-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar size={16} className="text-taguig-blue dark:text-taguig-gold" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Next Day"
            >
              <ChevronRight size={18} />
            </button>

            {!isViewingToday && (
              <button
                onClick={handleSetToday}
                className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-taguig-blue dark:text-taguig-gold hover:bg-taguig-blue/10 transition-colors"
              >
                Today
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {formattedDisplayDate}
            </span>
            <button
              onClick={fetchEntries}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search narrative, case #, reporter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-taguig-blue focus:outline-none"
            />
          </div>

          {/* Category Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as LogbookCategory | 'All')}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-taguig-blue focus:outline-none"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reporter Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={selectedReporter}
              onChange={(e) => setSelectedReporter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-taguig-blue focus:outline-none"
            >
              <option value="All">All Officers</option>
              {reportersList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logbook Timeline Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-taguig-blue dark:border-taguig-gold mb-3"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Loading Logbook Entries...
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-white/10">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <BookOpen size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">
            No Entries Recorded for this Date
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            There are no operations or activities logged for {formattedDisplayDate}.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-taguig-blue hover:bg-taguig-navy text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>Create First Entry</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedEntries.map((group) => (
            <div key={group.hour} className="space-y-3">
              {/* Hour Divider Badge */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black tracking-wider">
                  <Clock size={12} />
                  <span>{group.hourLabel}</span>
                  <span className="ml-1 opacity-60">({group.items.length})</span>
                </div>
                <div className="flex-1 h-px bg-slate-200 dark:bg-white/10"></div>
              </div>

              {/* Cards under this hour */}
              <div className="grid grid-cols-1 gap-3">
                {group.items.map((entry) => (
                  <LogbookEntryCard
                    key={entry.id}
                    entry={entry}
                    onOpenCorrection={(e) => setCorrectionTarget(e)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Entry Modal */}
      <AddLogbookModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchEntries}
      />

      {/* Correction Modal */}
      <AddCorrectionModal
        isOpen={!!correctionTarget}
        entry={correctionTarget}
        onClose={() => setCorrectionTarget(null)}
        onSuccess={fetchEntries}
      />
    </div>
  );
};

export default Logbook;
