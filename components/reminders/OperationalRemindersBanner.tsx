import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reminderService } from '../../services/reminderService';
import { OperationalReminder } from '../../types';
import {
  AlertTriangle,
  Clock,
  Video,
  Car,
  FileText,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BellRing,
  ExternalLink,
} from 'lucide-react';

export const OperationalRemindersBanner: React.FC = () => {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<OperationalReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fetchReminders = useCallback(async () => {
    try {
      const data = await reminderService.getOperationalReminders();
      setReminders(data);
    } catch (err) {
      console.error('Failed to load operational reminders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [fetchReminders]);

  if (loading || reminders.length === 0) return null;

  const urgentCount = reminders.filter((r) => r.severity === 'urgent').length;

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'cctv':
        return <Video size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />;
      case 'vehicle':
        return <Car size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'blotter':
        return <FileText size={16} className="text-red-600 dark:text-red-400 shrink-0" />;
      default:
        return <Clock size={16} className="text-slate-600 shrink-0" />;
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 dark:from-amber-500/15 dark:via-orange-500/15 dark:to-red-500/15 border border-amber-300 dark:border-amber-500/30 shadow-sm space-y-3 animate-fadeIn">
      {/* Banner Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20 animate-pulse">
            <BellRing size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                Operational Reminders & Attention Items
              </h3>
              {urgentCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                  {urgentCount} Urgent
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {reminders.length} item{reminders.length === 1 ? '' : 's'} require supervisor or desk officer follow-up.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5 transition-all"
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Reminders List */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {reminders.map((reminder) => {
            const isUrgent = reminder.severity === 'urgent';

            return (
              <div
                key={reminder.id}
                onClick={() => navigate(reminder.url_path)}
                className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between space-y-2.5 ${
                  isUrgent
                    ? 'border-red-300 dark:border-red-500/40 ring-1 ring-red-400/30'
                    : 'border-slate-200/80 dark:border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(reminder.category)}
                      <span className="font-mono text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {reminder.category}
                      </span>
                    </div>

                    {isUrgent && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center space-x-1">
                        <AlertTriangle size={11} />
                        <span>Urgent</span>
                      </span>
                    )}
                  </div>

                  <h4 className="font-black text-xs text-slate-900 dark:text-white leading-snug">
                    {reminder.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {reminder.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] font-bold text-taguig-blue dark:text-taguig-gold">
                  <span>Take Action</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
