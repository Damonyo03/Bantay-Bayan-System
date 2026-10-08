import React from 'react';
import { LogbookEntry, LogbookCategory } from '../../types';
import { 
  FileText, 
  Video, 
  Truck, 
  Package, 
  AlertCircle, 
  RotateCcw, 
  User, 
  Clock, 
  ExternalLink, 
  Edit3, 
  Link as LinkIcon,
  ShieldCheck,
  CheckCircle2,
  LucideIcon,
  WifiOff
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AttachmentGallery } from '../attachments/AttachmentGallery';
import { isFeatureEnabled } from '../../src/config/features';

interface LogbookEntryCardProps {
  entry: LogbookEntry;
  onOpenCorrection: (entry: LogbookEntry) => void;
}

const CATEGORY_META: Record<
  LogbookCategory,
  { label: string; icon: LucideIcon; colorClass: string; borderAccent: string }
> = {
  blotter: {
    label: 'Blotter',
    icon: FileText,
    colorClass: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20',
    borderAccent: 'border-l-red-500',
  },
  incident: {
    label: 'Incident',
    icon: AlertCircle,
    colorClass: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200 dark:border-orange-500/20',
    borderAccent: 'border-l-orange-500',
  },
  cctv_request: {
    label: 'CCTV Request',
    icon: Video,
    colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
    borderAccent: 'border-l-purple-500',
  },
  vehicle: {
    label: 'Vehicle / Patrol',
    icon: Truck,
    colorClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-sky-200 dark:border-sky-500/20',
    borderAccent: 'border-l-sky-500',
  },
  asset: {
    label: 'Asset / Equipment',
    icon: Package,
    colorClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
    borderAccent: 'border-l-indigo-500',
  },
  queue: {
    label: 'Public Queue',
    icon: CheckCircle2,
    colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    borderAccent: 'border-l-emerald-500',
  },
  handover: {
    label: 'Shift Handover',
    icon: RotateCcw,
    colorClass: 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 border-teal-200 dark:border-teal-500/20',
    borderAccent: 'border-l-teal-500',
  },
  correction: {
    label: 'Correction Entry',
    icon: Edit3,
    colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
    borderAccent: 'border-l-amber-500',
  },
  other: {
    label: 'General Entry',
    icon: FileText,
    colorClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    borderAccent: 'border-l-slate-400',
  },
};

export const LogbookEntryCard: React.FC<LogbookEntryCardProps> = ({ entry, onOpenCorrection }) => {
  const meta = CATEGORY_META[entry.category] || CATEGORY_META.other;
  const CategoryIcon = meta.icon;

  const entryDate = new Date(entry.created_at);
  const isEnteredOffline = !!entry.metadata?.entered_offline;
  const originalDeviceDate = entry.client_timestamp ? new Date(entry.client_timestamp) : entryDate;
  const displayTimeFormatted = originalDeviceDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const getReferenceLink = () => {
    if (!entry.reference_type || !entry.reference_id) return null;

    switch (entry.reference_type.toLowerCase()) {
      case 'incident':
      case 'blotter':
        return {
          path: '/archives',
          label: `Case #${entry.reference_id}`,
        };
      case 'cctv_request':
      case 'cctv':
        return {
          path: '/resources',
          label: `Req #${entry.reference_id}`,
        };
      case 'asset':
      case 'asset_request':
        return {
          path: '/resources',
          label: `Asset Req #${entry.reference_id}`,
        };
      case 'public_report':
        return {
          path: '/public-reports',
          label: `Public Report #${entry.reference_id}`,
        };
      default:
        return {
          path: '#',
          label: `${entry.reference_type}: ${entry.reference_id}`,
        };
    }
  };

  const refLink = getReferenceLink();

  return (
    <div
      className={`group relative bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 ${meta.borderAccent}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        {/* Category & Time */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${meta.colorClass}`}
          >
            <CategoryIcon size={13} />
            {meta.label}
          </span>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
            <Clock size={12} />
            {displayTimeFormatted}
          </span>

          {isEnteredOffline && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-500/30">
              <WifiOff size={11} />
              Entered Offline
            </span>
          )}

          {entry.corrects_entry_id && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-500/20">
              <Edit3 size={11} />
              Amends Earlier Entry
            </span>
          )}
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {refLink && (
            <Link
              to={refLink.path}
              className="inline-flex items-center gap-1 text-xs font-bold text-taguig-blue dark:text-taguig-gold hover:underline bg-taguig-blue/5 dark:bg-taguig-gold/10 px-2.5 py-1 rounded-lg transition-colors"
            >
              <LinkIcon size={12} />
              {refLink.label}
              <ExternalLink size={10} />
            </Link>
          )}

          <button
            onClick={() => onOpenCorrection(entry)}
            title="Add an append-only correction note referencing this entry"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-taguig-blue dark:hover:text-taguig-gold hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 transition-all active:scale-95"
          >
            <Edit3 size={12} />
            <span className="hidden sm:inline">Add</span> Correction
          </button>
        </div>
      </div>

      {/* Title & Description */}
      <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
        {entry.title}
      </h4>
      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mb-4">
        {entry.description}
      </p>

      {/* Metadata or Correction reference if available */}
      {entry.metadata && Object.keys(entry.metadata).length > 0 && entry.metadata.original_title && (
        <div className="mb-3 p-3 bg-amber-50/70 dark:bg-amber-500/5 rounded-xl border border-amber-200/70 dark:border-amber-500/10 text-xs text-amber-900 dark:text-amber-300">
          <span className="font-bold">Original Referenced Subject:</span> {entry.metadata.original_title}
        </div>
      )}

      {/* Photo Attachments Gallery */}
      {isFeatureEnabled('PHOTO_ATTACHMENTS') && (
        <AttachmentGallery
          entryId={entry.id}
          initialAttachments={entry.attachments}
        />
      )}

      {/* Footer: Reporter Snapshot */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-[10px]">
            {entry.reporter_name.charAt(0)}
          </div>
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-200">{entry.reporter_name}</span>
            <span className="mx-1 text-slate-300 dark:text-slate-600">•</span>
            <span className="uppercase tracking-wider text-[10px] font-semibold text-taguig-blue dark:text-taguig-gold">
              {entry.reporter_role.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <span className="text-[10px] text-slate-400 font-mono">
          ID: {entry.id.slice(0, 8)}
        </span>
      </div>
    </div>
  );
};
