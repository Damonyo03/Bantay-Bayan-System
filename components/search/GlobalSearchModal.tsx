import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchService } from '../../services/searchService';
import { GroupedSearchResults, GlobalSearchResult } from '../../types';
import {
  Search,
  X,
  FileText,
  BookOpen,
  Video,
  Car,
  ChevronRight,
  Clock,
  MapPin,
  User,
  ArrowRight,
  CornerDownLeft,
  Sparkles,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedSearchResults>({
    blotters: [],
    logbook: [],
    cctv: [],
    vehicles: [],
    totalCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setResults({ blotters: [], logbook: [], cctv: [], vehicles: [], totalCount: 0 });
    }
  }, [isOpen]);

  // Global keydown shortcut (Ctrl+K / Cmd+K / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced Search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ blotters: [], logbook: [], cctv: [], vehicles: [], totalCount: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const data = await searchService.search(query);
        setResults(data);
      } catch (err) {
        console.error('Global search query error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  if (!isOpen) return null;

  const handleSelectResult = (item: GlobalSearchResult) => {
    onClose();
    navigate(item.url_path);
  };

  const renderResultSection = (
    title: string,
    icon: React.ReactNode,
    items: GlobalSearchResult[],
    badgeColor: string
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2 px-3 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {icon}
          <span>
            {title} ({items.length})
          </span>
        </div>
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={`${item.type}_${item.id}`}
              onClick={() => handleSelectResult(item)}
              className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-taguig-blue/10 dark:hover:bg-taguig-gold/10 border border-slate-200/60 dark:border-white/5 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="space-y-0.5 min-w-0 flex-1 pr-3">
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-taguig-blue dark:group-hover:text-taguig-gold">
                    {item.title}
                  </h4>
                  {item.status && (
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeColor}`}
                    >
                      {item.status}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {item.subtitle}
                </p>
                {item.details && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 italic">
                    {item.details}
                  </p>
                )}
              </div>
              <ChevronRight
                size={16}
                className="text-slate-400 group-hover:text-taguig-blue group-hover:translate-x-0.5 transition-all shrink-0"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center space-x-3 bg-slate-50/50 dark:bg-slate-800/30">
          <Search size={20} className="text-taguig-blue dark:text-taguig-gold shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search blotters, logbook, CCTV requests, vehicles, plate #..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300"
          >
            ESC
          </button>
        </div>

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <div className="w-6 h-6 border-2 border-taguig-blue border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold uppercase tracking-wider">Searching Database...</p>
            </div>
          ) : query.trim() && results.totalCount === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-1">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No matching records found
              </p>
              <p className="text-[11px] text-slate-500">
                Try searching by case number, incident type, officer name, or vehicle plate.
              </p>
            </div>
          ) : !query.trim() ? (
            <div className="py-8 text-center text-slate-400 space-y-3">
              <Sparkles size={28} className="mx-auto text-taguig-blue opacity-50" />
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Global Unified Search
                </h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
                  Instantly find blotter records, CCTV requests, patrol units, and operations ledger entries.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {renderResultSection(
                'Blotters & Incidents',
                <FileText size={14} />,
                results.blotters,
                'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
              )}

              {renderResultSection(
                'Operations Logbook',
                <BookOpen size={14} />,
                results.logbook,
                'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
              )}

              {renderResultSection(
                'CCTV Requests',
                <Video size={14} />,
                results.cctv,
                'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
              )}

              {renderResultSection(
                'Vehicles & Trips',
                <Car size={14} />,
                results.vehicles,
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/40 px-4 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center space-x-3">
            <span>Navigation:</span>
            <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">
              ↑↓ Navigate
            </span>
            <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">
              ↵ Select
            </span>
          </div>
          {results.totalCount > 0 && (
            <span className="font-bold text-slate-600 dark:text-slate-300">
              {results.totalCount} result{results.totalCount === 1 ? '' : 's'} found
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
