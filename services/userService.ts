
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseKey } from '../lib/supabaseClient';
import { UserProfile, PersonnelSchedule } from '../types';

export const userService = {
    getCurrentUserProfile: async (): Promise<UserProfile | null> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        return data as UserProfile;
    },

    getUsers: async (): Promise<UserProfile[]> => {
        const { data, error } = await supabase.from('profiles').select('*').order('full_name');
        if (error) throw error;
        return data as UserProfile[];
    },

    updateUserStatus: async (id: string, status: 'active' | 'inactive' | 'rejected') => {
        const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
        if (error) throw error;
    },

    deleteUser: async (id: string) => {
        const { error } = await supabase.rpc('delete_user_by_id', { user_uuid: id });
        if (error) throw error;
    },

    checkUsernameExists: async (username: string): Promise<boolean> => {
        const { data, error } = await supabase.from('profiles').select('username').eq('username', username);
        if (error) return false;
        return data && data.length > 0;
    },

    createUser: async (email: string, username: string, password: string, fullName: string, role: string) => {
        const tempClient = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });

        const { data, error } = await tempClient.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName, username: username, role: role, status: 'inactive' }
            }
        });

        if (error) throw error;

        if (data.user) {
            const { error: insertError } = await supabase.from('profiles').insert({
                id: data.user.id,
                email: email,
                username: username,
                full_name: fullName,
                role: role,
                status: 'inactive'
            });
            if (insertError && !insertError.message.includes('duplicate key')) console.warn(insertError.message);
        }
    },

    registerUser: async (email: string, username: string, password: string, fullName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName, username: username, role: 'field_operator', status: 'inactive' }
            }
        });
        if (error) throw error;
        return data;
    },

    updateProfile: async (id: string, updates: Partial<UserProfile>) => {
        const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Update failed. Permission denied.");
    },

    uploadAvatar: async (userId: string, file: File): Promise<string> => {
        if (file.size > 2 * 1024 * 1024) throw new Error("File too large (Max 2MB).");

        const timestamp = new Date().getTime();
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/${timestamp}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) throw new Error("Upload failed: " + uploadError.message);

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        return data.publicUrl;
    },

    // Schedules
    getSchedules: async (startDate: string, endDate: string): Promise<PersonnelSchedule[]> => {
        const { data, error } = await supabase.from('personnel_schedules').select('*').gte('date', startDate).lte('date', endDate);
        if (error) throw error;
        return data as PersonnelSchedule[];
    },

    upsertSchedule: async (schedule: Partial<PersonnelSchedule>) => {
        const { data, error } = await supabase.from('personnel_schedules').upsert(schedule, { onConflict: 'user_id,date' }).select().single();
        if (error) throw error;
        return data;
    },

    saveBatchSchedules: async (schedules: Partial<PersonnelSchedule>[]) => {
        if (schedules.length === 0) return;
        const { error } = await supabase.from('personnel_schedules').upsert(schedules, { onConflict: 'user_id,date' });
        if (error) throw new Error("Bulk save failed.");
    }
};
