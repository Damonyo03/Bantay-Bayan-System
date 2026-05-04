
import { supabase } from '../lib/supabaseClient';
import { DispatchLog, AssetRequest, CCTVRequest } from '../types';

export const resourceService = {
    // Dispatch & Logistics
    updateDispatchStatus: async (logId: string, updates: Partial<DispatchLog>) => {
        const { data, error } = await supabase.from('dispatch_logs').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', logId).select().single();
        if (error) throw error;

        // Auto-update incident status logic
        if (data) {
            if (updates.status === 'On Scene') {
                await supabase.from('incidents').update({ status: 'Dispatched' }).eq('id', data.incident_id);
            }
            if (updates.status === 'Clear') {
                const { data: incident } = await supabase.from('incidents').select('type').eq('id', data.incident_id).single();
                if (incident && incident.type === 'Logistics') {
                    await supabase.from('incidents').update({ status: 'Closed' }).eq('id', data.incident_id);
                }
            }
        }
        return data;
    },

    logVehicleDispatch: async (loggerId: string, vehicle: string, officers: string, purpose: string, location: string) => {
        const caseNum = `LOG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: incident, error: incError } = await supabase
            .from('incidents')
            .insert({
                case_number: caseNum,
                type: 'Logistics',
                narrative: purpose,
                location: location,
                status: 'Dispatched',
                officer_id: loggerId,
                is_restricted_entry: false
            })
            .select().single();

        if (incError) throw incError;

        const { error: logError } = await supabase.from('dispatch_logs').insert({
            incident_id: incident.id,
            unit_name: `${vehicle} - ${officers}`,
            status: 'En Route',
            updated_at: new Date().toISOString()
        });

        if (logError) throw logError;
        return incident;
    },

    getDispatchHistory: async () => {
        const { data, error } = await supabase.from('dispatch_logs').select(`*, incidents (type, narrative, location)`).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    // Assets
    getAssetRequests: async (): Promise<AssetRequest[]> => {
        const { data, error } = await supabase.from('asset_requests').select(`*, profiles:logged_by (full_name)`).order('created_at', { ascending: false });
        if (error) throw error;
        return data.map((req: any) => ({ ...req, logger_name: req.profiles?.full_name || 'System' }));
    },

    createAssetRequest: async (requestData: any) => {
        const { data, error } = await supabase.from('asset_requests').insert(requestData).select().single();
        if (error) throw error;
        return data;
    },

    updateAssetRequestStatus: async (id: string, status: string, photoUrl?: string) => {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'Released' && photoUrl) updates.release_photo_url = photoUrl;
        if (status === 'Returned' && photoUrl) updates.return_photo_url = photoUrl;

        const { data, error } = await supabase.from('asset_requests').update(updates).eq('id', id).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Update failed.");
        return data[0];
    },

    uploadAssetPhoto: async (requestId: string, file: File, type: 'release' | 'return'): Promise<string> => {
        if (file.size > 5 * 1024 * 1024) throw new Error("File too large (Max 5MB).");

        const fileExt = file.name.split('.').pop();
        const fileName = `${requestId}_${type}_${new Date().getTime()}.${fileExt}`;
        const filePath = `asset-conditions/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('assets')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) {
            // Fallback to identity-docs if assets bucket doesn't exist yet
            const { error: fallbackError } = await supabase.storage
                .from('identity-docs')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });
            
            if (fallbackError) throw new Error("Upload failed: " + uploadError.message);
            
            const { data } = supabase.storage.from('identity-docs').getPublicUrl(filePath);
            return data.publicUrl;
        }

        const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
        return data.publicUrl;
    },

    // CCTV
    createCCTVRequest: async (requestData: any) => {
        const caseNum = `CCTV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data, error } = await supabase.from('cctv_requests').insert({ ...requestData, request_number: caseNum }).select().single();
        if (error) throw error;
        return data;
    },

    getCCTVRequests: async (): Promise<CCTVRequest[]> => {
        const { data, error } = await supabase.from('cctv_requests').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }
};
