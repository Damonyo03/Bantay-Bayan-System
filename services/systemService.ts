
import { supabase } from '../lib/supabaseClient';
import { AuditLog } from '../types';

export const systemService = {
    getAuditLogs: async (): Promise<AuditLog[]> => {
        const { data, error } = await supabase.from('audit_logs').select(`*, profiles:performed_by (full_name)`).order('created_at', { ascending: false }).limit(100);
        if (error) throw error;
        return data.map((log: any) => ({ ...log, performer_name: log.profiles?.full_name || 'System' }));
    },

    getFullSystemBackup: async () => {
        const [incidents, parties, assets, cctv, logs, schedules] = await Promise.all([
            supabase.from('incidents').select('*'),
            supabase.from('incident_parties').select('*'),
            supabase.from('asset_requests').select('*'),
            supabase.from('cctv_requests').select('*'),
            supabase.from('dispatch_logs').select('*'),
            supabase.from('personnel_schedules').select('*'),
        ]);

        if (incidents.error) throw incidents.error;
        if (parties.error) throw parties.error;
        if (assets.error) throw assets.error;
        if (cctv.error) throw cctv.error;

        const timestamp = new Date().toISOString();

        return {
            meta: {
                exported_at: timestamp,
                version: '1.0',
                system: 'Bantay Bayan'
            },
            data: {
                incidents: incidents.data,
                incident_parties: parties.data,
                asset_requests: assets.data,
                cctv_requests: cctv.data,
                dispatch_logs: logs.data,
                personnel_schedules: schedules.data
            }
        };
    },

    resetSystemData: async () => {
        const { data, error } = await supabase.rpc('admin_reset_system_data');
        if (error) {
            if (error.code === 'PGRST202') {
                throw new Error("Missing Database Function: Please run 'fix_reset_final.sql' in the Supabase SQL Editor to enable this feature.");
            }
            throw error;
        }
        return data;
    }
};
