import React, { useState, useEffect } from 'react';
import { reminderService, DEFAULT_ALERT_SETTINGS } from '../../services/reminderService';
import { SystemAlertSetting } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import {
  Bell,
  Save,
  Clock,
  Video,
  Car,
  FileText,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

export const AlertSettingsPanel: React.FC = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<Record<string, number>>({
    cctv_retention_warning_days: 7,
    vehicle_trip_timeout_hours: 4,
    blotter_inactive_days: 7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await reminderService.getAlertSettings();
        const map: Record<string, number> = {};
        data.forEach((s) => {
          map[s.key] = s.value_numeric;
        });
        setSettings((prev) => ({ ...prev, ...map }));
      } catch (err) {
        console.error('Failed to load alert settings:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleChange = (key: string, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      for (const [key, val] of Object.entries(settings)) {
        await reminderService.updateAlertSetting(key, val);
      }
      showToast('Alert & reminder thresholds updated successfully', 'success');
    } catch (err: any) {
      console.error('Failed to save alert settings:', err);
      showToast('Failed to save alert settings: ' + (err.message || 'Error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    const defs: Record<string, number> = {};
    Object.entries(DEFAULT_ALERT_SETTINGS).forEach(([k, v]) => {
      defs[k] = v.value;
    });
    setSettings(defs);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Operational Alert & Reminder Thresholds
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure when in-app warning banners trigger for unhandled cases, trips, and footage retention.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center space-x-1 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CCTV Footage Retention Warning */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-3">
            <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
              <Video size={16} />
              <span>CCTV Retention Warning</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Triggers reminder when a pending CCTV request reaches N days old before camera storage overwrite.
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="60"
                value={settings.cctv_retention_warning_days || 7}
                onChange={(e) =>
                  handleChange('cctv_retention_warning_days', parseInt(e.target.value) || 1)
                }
                className="w-24 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">days</span>
            </div>
          </div>

          {/* Vehicle Trip Timeout */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-3">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
              <Car size={16} />
              <span>Trip Update Timeout</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Triggers reminder when a patrol unit has had no waypoint arrival or departure recorded for N hours.
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="24"
                value={settings.vehicle_trip_timeout_hours || 4}
                onChange={(e) =>
                  handleChange('vehicle_trip_timeout_hours', parseInt(e.target.value) || 1)
                }
                className="w-24 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">hours</span>
            </div>
          </div>

          {/* Inactive Blotter Threshold */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-3">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 font-bold text-xs">
              <FileText size={16} />
              <span>Inactive Blotter Case</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Triggers reminder when an active blotter case has had no recorded action or status update for N days.
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="90"
                value={settings.blotter_inactive_days || 7}
                onChange={(e) =>
                  handleChange('blotter_inactive_days', parseInt(e.target.value) || 1)
                }
                className="w-24 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">days</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-white/5">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-2xl bg-taguig-blue hover:bg-taguig-navy text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-taguig-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Threshold Settings'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
