
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseKey } from '../lib/supabaseClient';
import { Incident, IncidentParty, DispatchLog, IncidentWithDetails, UserProfile, AuditLog, AssetRequest, AssetItem, PersonnelSchedule, CCTVRequest, ShiftType } from '../types';

export const supabaseService = {
  // --- AUTHENTICATION ---
  
  login: async (identifier: string, password: string): Promise<{ user: UserProfile, mfaRequired: boolean }> => {
    let email = identifier;

    // Allow login by Username
    if (!identifier.includes('@')) {
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', identifier)
            .single();
        
        if (profileError || !profileData) throw new Error("Invalid username or password");
        email = profileData.email;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw new Error("Invalid credentials");
    if (!authData.user) throw new Error("No user returned");

    // MFA Check
    const { data: mfaData, error: mfaCheckError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (mfaCheckError) throw new Error(mfaCheckError.message);

    if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
        return { user: profile as UserProfile, mfaRequired: true };
    }

    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
    if (profileError) throw new Error("Failed to fetch user profile");
    
    // Update Last Active
    await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', authData.user.id);

    return { user: profile as UserProfile, mfaRequired: false };
  },

  getCurrentUserProfile: async (): Promise<UserProfile | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    return data as UserProfile;
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  resetPasswordForUser: async (identifier: string) => {
    let email = identifier;
    if (!identifier.includes('@')) {
        const { data } = await supabase.from('profiles').select('email').eq('username', identifier).single();
        if (!data) return; 
        email = data.email;
    }
    const redirectTo = `${window.location.origin}/#/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  },

  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  // --- MFA / 2FA ---

  enrollMFA: async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) throw error;
    return data;
  },

  verifyMFA: async (factorId: string, code: string) => {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
      return data;
  },

  challengeMFA: async (code: string) => {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (!factors || !factors.totp || factors.totp.length === 0) throw new Error("No MFA factors found.");

      const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factors.totp[0].id, code });
      if (error) throw error;
      return data;
  },

  listMFAFactors: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data.totp;
  },

  unenrollMFA: async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
  },

  // --- USER MANAGEMENT ---

  getUsers: async (): Promise<UserProfile[]> => {
    const { data, error } = await supabase.from('profiles').select('*').order('full_name');
    if (error) throw error;
    return data as UserProfile[];
  },

  updateUserStatus: async (id: string, status: 'active' | 'inactive') => {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    if (error) throw error;
  },

  checkUsernameExists: async (username: string): Promise<boolean> => {
      const { data, error } = await supabase.from('profiles').select('username').eq('username', username);
      if (error) return false;
      return data && data.length > 0;
  },

  createUser: async (email: string, username: string, password: string, fullName: string, role: string) => {
    // Isolated client for admin creation to prevent session overwrites
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

    // Fallback: Ensure profile exists if trigger fails
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

  updateUserCredentials: async (updates: { email?: string; password?: string }) => {
    const { error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
    if (updates.email) {
       const { data: { user } } = await supabase.auth.getUser();
       if (user) await supabase.from('profiles').update({ email: updates.email }).eq('id', user.id);
    }
  },

  // --- SCHEDULES ---

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
  },

  // --- INCIDENTS & OPERATIONS ---

  getIncidents: async (): Promise<IncidentWithDetails[]> => {
    const { data, error } = await supabase
      .from('incidents')
      .select(`*, profiles:officer_id (full_name), dispatch_logs (*), incident_parties (*)`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map((inc: any) => ({
      ...inc,
      officer_name: inc.profiles?.full_name || 'Unknown Officer',
      dispatch_logs: inc.dispatch_logs || [],
      parties: inc.incident_parties || []
    }));
  },

  getIncidentsByStatus: async (statuses: string[]): Promise<IncidentWithDetails[]> => {
    const { data, error } = await supabase
      .from('incidents')
      .select(`*, profiles:officer_id (full_name), dispatch_logs (*), incident_parties (*)`)
      .in('status', statuses)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data.map((inc: any) => ({
      ...inc,
      officer_name: inc.profiles?.full_name || 'Unknown Officer',
      dispatch_logs: inc.dispatch_logs || [],
      parties: inc.incident_parties || []
    }));
  },

  updateIncident: async (id: string, updates: Partial<Incident>) => {
      const { error } = await supabase.from('incidents').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
  },

  // --- CLEAN CLEAR FUNCTION ---
  clearRestrictedStatus: async (incidentId: string) => {
      const { error } = await supabase
          .from('incidents')
          .update({ 
              is_restricted_entry: false,
              updated_at: new Date().toISOString()
          })
          .eq('id', incidentId);

      if (error) throw new Error(error.message);
      
      return { success: true };
  },

  // --- DISPATCH & LOGISTICS ---

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

  createIncidentReport: async (incidentData: Omit<Incident, 'id' | 'created_at' | 'case_number'>, partiesData: Omit<IncidentParty, 'id' | 'incident_id'>[]) => {
    const caseNum = `BB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: incident, error: incError } = await supabase.from('incidents').insert({ ...incidentData, case_number: caseNum }).select().single();

    if (incError) throw incError;

    if (partiesData.length > 0) {
      const parties = partiesData.map(p => ({ ...p, incident_id: incident.id }));
      await supabase.from('incident_parties').insert(parties);
    }

    if (incidentData.status === 'Dispatched') {
      await supabase.from('dispatch_logs').insert({
          incident_id: incident.id,
          unit_name: 'Pending Assignment',
          status: 'En Route',
          updated_at: new Date().toISOString()
      });
    }

    return incident;
  },

  getRestrictedPersons: async () => {
    const { data, error } = await supabase
      .from('incident_parties')
      .select(`*, incidents!inner (case_number, is_restricted_entry, created_at, type, narrative)`)
      .eq('incidents.is_restricted_entry', true)
      .in('role', ['Respondent', 'Suspect'])
      .order('created_at', { foreignTable: 'incidents', ascending: false });

    if (error) throw error;
    return data;
  },

  // --- ASSETS & CCTV ---

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

  updateAssetRequestStatus: async (id: string, status: string) => {
      const { data, error } = await supabase.from('asset_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Update failed.");
      return data[0];
  },

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
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase.from('audit_logs').select(`*, profiles:performed_by (full_name)`).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return data.map((log: any) => ({ ...log, performer_name: log.profiles?.full_name || 'System' }));
  }
};
