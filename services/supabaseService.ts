
import { supabase } from '../lib/supabaseClient';
import { Incident, IncidentParty, DispatchLog, IncidentWithDetails, UserProfile, AuditLog, AssetRequest, AssetItem } from '../types';

export const supabaseService = {
  // AUTH
  login: async (email: string, password: string): Promise<UserProfile> => {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("No user returned");

    // 2. Fetch User Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw new Error("Failed to fetch user profile");
    
    // Update last active
    await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', authData.user.id);

    return profile as UserProfile;
  },

  getCurrentUserProfile: async (): Promise<UserProfile | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    return data as UserProfile;
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  // USER MANAGEMENT & SETTINGS
  getUsers: async (): Promise<UserProfile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    
    if (error) throw error;
    return data as UserProfile[];
  },

  updateUserStatus: async (id: string, status: 'active' | 'inactive') => {
    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', id);
    
    if (error) throw error;
  },

  createUser: async (email: string, password: string, fullName: string, role: string, badgeNumber: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            }
        }
    });

    if (error) throw error;
    
    if (data.user) {
        await supabase.from('profiles').update({
            role: role,
            badge_number: badgeNumber
        }).eq('id', data.user.id);
    }
  },

  // Update Public Profile Data (Name, Badge)
  updateProfile: async (id: string, updates: { full_name?: string; badge_number?: string }) => {
    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);
    
    if (error) throw error;
  },

  // Update Auth Credentials (Email, Password)
  updateUserCredentials: async (updates: { email?: string; password?: string }) => {
    const { error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
    
    // If email was updated, we also update it in the profiles table for consistency
    if (updates.email) {
       const { data: { user } } = await supabase.auth.getUser();
       if (user) {
           await supabase.from('profiles').update({ email: updates.email }).eq('id', user.id);
       }
    }
  },

  // INCIDENTS
  getIncidents: async (): Promise<IncidentWithDetails[]> => {
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        profiles:officer_id (full_name),
        dispatch_logs (*),
        incident_parties (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((inc: any) => ({
      ...inc,
      officer_name: inc.profiles?.full_name || 'Unknown Officer',
      dispatch_logs: inc.dispatch_logs || [],
      parties: inc.incident_parties || []
    }));
  },

  updateIncident: async (id: string, updates: Partial<Incident>) => {
      const { error } = await supabase
        .from('incidents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
  },

  updateDispatchStatus: async (logId: string, updates: Partial<DispatchLog>) => {
    const { data, error } = await supabase
      .from('dispatch_logs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', logId)
      .select()
      .single();
    
    if (error) throw error;
    
    if (updates.status === 'On Scene' && data) {
       await supabase.from('incidents').update({ status: 'Dispatched' }).eq('id', data.incident_id);
    }
    
    return data;
  },

  // New function for Vehicle Logs
  getDispatchHistory: async () => {
      const { data, error } = await supabase
        .from('dispatch_logs')
        .select(`
            *,
            incidents (
                type,
                narrative,
                location
            )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
  },

  createIncidentReport: async (
    incidentData: Omit<Incident, 'id' | 'created_at' | 'case_number'>, 
    partiesData: Omit<IncidentParty, 'id' | 'incident_id'>[]
  ) => {
    const caseNum = `BB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: incident, error: incError } = await supabase
      .from('incidents')
      .insert({
        ...incidentData,
        case_number: caseNum
      })
      .select()
      .single();

    if (incError) throw incError;

    const newId = incident.id;

    let insertedParties = [];
    if (partiesData.length > 0) {
      const partiesToInsert = partiesData.map(p => ({
        ...p,
        incident_id: newId
      }));
      
      const { data: pData, error: partyError } = await supabase
        .from('incident_parties')
        .insert(partiesToInsert)
        .select();
        
      if (partyError) console.error("Error inserting parties", partyError);
      if (pData) insertedParties = pData;
    }

    if (incidentData.status === 'Dispatched') {
      await supabase
        .from('dispatch_logs')
        .insert({
          incident_id: newId,
          unit_name: 'Pending Assignment',
          status: 'En Route',
          updated_at: new Date().toISOString()
        });
    }

    return {
      ...incident,
      parties: insertedParties
    };
  },

  // ASSET REQUESTS (RESOURCE TRACKING)
  getAssetRequests: async (): Promise<AssetRequest[]> => {
      const { data, error } = await supabase
        .from('asset_requests')
        .select(`
            *,
            profiles:logged_by (full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((req: any) => ({
          ...req,
          logger_name: req.profiles?.full_name || 'System'
      }));
  },

  createAssetRequest: async (
      requestData: Omit<AssetRequest, 'id' | 'created_at' | 'updated_at' | 'status'>
  ) => {
      const { data, error } = await supabase
        .from('asset_requests')
        .insert(requestData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
  },

  updateAssetRequestStatus: async (id: string, status: string) => {
      // We perform a select() after update to ensure the row was actually found and updated
      // according to RLS policies.
      const { data, error } = await supabase
        .from('asset_requests')
        .update({ 
            status, 
            updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      
      // If no data returned, it means RLS filtered out the update (permission denied)
      if (!data || data.length === 0) {
          throw new Error("Update failed. You may not have permission to update this record.");
      }
      
      return data[0];
  },

  // AUDIT LOGS
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        profiles:performed_by (full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return data.map((log: any) => ({
      ...log,
      performer_name: log.profiles?.full_name || 'System / Unknown'
    }));
  }
};
