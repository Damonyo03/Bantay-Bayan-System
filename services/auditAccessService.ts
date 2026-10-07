import { supabase } from '../lib/supabaseClient';
import { AuditAccessLog, AuditAccessAction } from '../types';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface RecordAccessParams {
  action: AuditAccessAction;
  record_type: string;
  record_id: string | number;
}

export interface AccessLogFilter {
  user_id?: string;
  action?: string;
  record_type?: string;
  date_start?: string;
  date_end?: string;
  search_query?: string;
}

/**
 * Global audit service function to track sensitive data access.
 * Complies with Data Privacy Act: records only non-sensitive references (type & id).
 * Fails silently so it NEVER blocks UI rendering, exports, or application flows.
 */
export const recordAccess = async (params: RecordAccessParams): Promise<void> => {
  try {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const { data: authData } = await supabase.auth.getUser();

    await supabase.from('audit_access_log').insert({
      user_id: authData?.user?.id || null,
      action: params.action,
      record_type: params.record_type,
      record_id: String(params.record_id),
      user_agent: userAgent,
    });
  } catch (err) {
    // Fail silently: logging failure must NEVER impact user experience
    console.debug('Silent access log notice:', err);
  }
};

export const auditAccessService = {
  recordAccess,

  /**
   * Fetch access audit records for admin review
   */
  getAccessLogs: async (filters?: AccessLogFilter, limit = 100): Promise<AuditAccessLog[]> => {
    let query = supabase
      .from('audit_access_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (filters?.action && filters.action !== 'All') {
      query = query.eq('action', filters.action);
    }

    if (filters?.record_type && filters.record_type !== 'All') {
      query = query.eq('record_type', filters.record_type);
    }

    if (filters?.user_id && filters.user_id !== 'All') {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters?.date_start) {
      query = query.gte('timestamp', new Date(`${filters.date_start}T00:00:00`).toISOString());
    }

    if (filters?.date_end) {
      query = query.lte('timestamp', new Date(`${filters.date_end}T23:59:59.999`).toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch user profiles to enrich logs with user names / roles
    const userIds = Array.from(new Set((data || []).map((l: any) => l.user_id).filter(Boolean)));
    const profileMap = new Map<string, { name: string; email: string; role: string }>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', userIds);

      (profiles || []).forEach((p: any) => {
        profileMap.set(p.id, {
          name: p.full_name || p.email || 'Officer',
          email: p.email || '',
          role: p.role || 'staff',
        });
      });
    }

    let logs = (data || []).map((log: any) => {
      const profile = log.user_id ? profileMap.get(log.user_id) : null;
      return {
        ...log,
        user_name: profile?.name || 'System / Unauthenticated',
        user_email: profile?.email || '',
        user_role: profile?.role || 'staff',
      } as AuditAccessLog;
    });

    if (filters?.search_query && filters.search_query.trim() !== '') {
      const q = filters.search_query.toLowerCase().trim();
      logs = logs.filter(
        (l) =>
          l.record_id.toLowerCase().includes(q) ||
          l.record_type.toLowerCase().includes(q) ||
          (l.user_name && l.user_name.toLowerCase().includes(q)) ||
          (l.user_email && l.user_email.toLowerCase().includes(q))
      );
    }

    return logs;
  },

  /**
   * Export audit access trail to CSV
   */
  exportCsv: async (logs: AuditAccessLog[]): Promise<void> => {
    const headers = [
      'Log ID',
      'Timestamp (ISO)',
      'Date',
      'Time',
      'User / Officer',
      'User Email',
      'User Role',
      'Action',
      'Record Type',
      'Record Reference ID',
      'User Agent',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = logs.map((l) => {
      const d = new Date(l.timestamp);
      return [
        escapeCsv(l.id),
        escapeCsv(l.timestamp),
        escapeCsv(d.toLocaleDateString('en-CA')),
        escapeCsv(d.toLocaleTimeString('en-GB')),
        escapeCsv(l.user_name || 'System'),
        escapeCsv(l.user_email || ''),
        escapeCsv(l.user_role || ''),
        escapeCsv(l.action),
        escapeCsv(l.record_type),
        escapeCsv(l.record_id),
        escapeCsv(l.user_agent || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const fileName = `Audit_Access_Trail_${new Date().toISOString().slice(0, 10)}.csv`;

    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = btoa(unescape(encodeURIComponent(csvContent)));
        if ((window as any).AndroidBlobDownloader?.downloadBlob) {
          (window as any).AndroidBlobDownloader.downloadBlob(base64Data, fileName);
        } else {
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
        }
      } catch (err) {
        console.error('Failed to save native audit CSV:', err);
      }
    } else {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },
};
