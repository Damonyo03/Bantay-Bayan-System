
import { supabase } from '../lib/supabaseClient';
import { Incident, IncidentParty, DispatchLog, IncidentWithDetails, UserProfile, AuditLog, AssetRequest, AssetItem, PersonnelSchedule, CCTVRequest, ShiftType } from '../types';

export const supabaseService = {
  // AUTH - CORE
  login: async (identifier: string, password: string): Promise<{ user: UserProfile, mfaRequired: boolean }> => {
    let email = identifier;

    // 1. Check if identifier is a Username (no @ symbol)
    if (!identifier.includes('@')) {
        // Query profiles to get email associated with username
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', identifier)
            .single();
        
        if (profileError || !profileData) {
            throw new Error("Invalid username or password");
        }
        email = profileData.email;
    }

    // 2. Authenticate with Supabase Auth using the resolved Email
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw new Error("Invalid credentials");
    if (!authData.user) throw new Error("No user returned");

    // 3. Check MFA Status (Assurance Level)
    const { data: mfaData, error: mfaCheckError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (mfaCheckError) throw new Error(mfaCheckError.message);

    // If nextLevel is 'aal2', it means the user has enrolled in MFA and needs to verify
    if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();
        
        return { user: profile as UserProfile, mfaRequired: true };
    }

    // 4. Fetch User Profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw new Error("Failed to fetch user profile");
    
    // Update last active
    await supabase.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', authData.user.id);

    return { user: profile as UserProfile, mfaRequired: false };
  },

  resetPasswordForUser: async (identifier: string) => {
    let email = identifier;

    // If username provided, look up the email
    if (!identifier.includes('@')) {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', identifier)
            .single();
        
        if (!profileData) {
            // Security: Don't reveal if user exists or not, just pretend to send
            return; 
        }
        email = profileData.email;
    }

    const redirectTo = `${window.location.origin}/#/update-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
    });
    if (error) throw error;
  },

  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
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

  // AUTH - MFA / 2FA
  enrollMFA: async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp'
    });
    if (error) throw error;
    return data;
  },

  verifyMFA: async (factorId: string, code: string) => {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
          factorId,
          code
      });
      if (error) throw error;
      return data;
  },

  challengeMFA: async (code: string) => {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
          factorId: (await supabase.auth.mfa.listFactors()).data?.totp[0].id!,
          code
      });
      if (error) throw error;
      return data;
  },

  listMFAFactors: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data.totp;
  },

  unenrollMFA: async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
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

  checkUsernameExists: async (username: string): Promise<boolean> => {
      // Check if username exists in profiles.
      // Note: RLS allows reading profiles for everyone (public read)
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username);
      
      if (error) return false;
      return data && data.length > 0;
  },

  // Called by Admin/Supervisor (Sets status: inactive by default now)
  createUser: async (email: string, username: string, password: string, fullName: string, role: string) => {
    // We pass username in metadata so the trigger can grab it
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                username: username,
                role: role,
                status: 'inactive' // Defaults to inactive so it goes to Pending tab
            }
        }
    });

    if (error) throw error;
  },

  // Called by Public Registration (Sets status: inactive)
  registerUser: async (email: string, username: string, password: string, fullName: string) => {
      const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
              data: {
                  full_name: fullName,
                  username: username,
                  role: 'field_operator', // Default public role
                  status: 'inactive' // Requires approval
              }
          }
      });
      if (error) throw error;
      return data;
  },

  // Updated to support avatar_url and schedule preferences
  updateProfile: async (id: string, updates: { full_name?: string; badge_number?: string; avatar_url?: string; preferred_shift?: string; preferred_day_off?: string }) => {
    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);
    
    if (error) throw error;
  },

  uploadAvatar: async (userId: string, file: File): Promise<string> => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Check if bucket exists, try to create if not (Best Effort)
      const { data: buckets } = await supabase.storage.listBuckets();
      const avatarBucket = buckets?.find(b => b.name === 'avatars');
      
      if (!avatarBucket) {
          // Attempt creation (might fail if no permissions, but worth a try)
          await supabase.storage.createBucket('avatars', { public: true }).catch(err => console.warn("Bucket creation failed, might exist or insufficient perms:", err));
      }

      // Upload
      const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

      if (uploadError) {
          if (uploadError.message.includes('bucket not found')) {
               throw new Error("Storage bucket 'avatars' missing. Please run the schema.sql script in Supabase.");
          }
          throw uploadError;
      }

      // Get Public URL
      const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

      return data.publicUrl;
  },

  updateUserCredentials: async (updates: { email?: string; password?: string }) => {
    const { error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
    
    if (updates.email) {
       const { data: { user } } = await supabase.auth.getUser();
       if (user) {
           await supabase.from('profiles').update({ email: updates.email }).eq('id', user.id);
       }
    }
  },

  // DUTY ROSTER / SCHEDULES
  getSchedules: async (startDate: string, endDate: string): Promise<PersonnelSchedule[]> => {
      const { data, error } = await supabase
          .from('personnel_schedules')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate);
      
      if (error) throw error;
      return data as PersonnelSchedule[];
  },

  upsertSchedule: async (schedule: Partial<PersonnelSchedule>) => {
      if (!schedule.user_id || !schedule.date) throw new Error("Missing required fields");

      const { data, error } = await supabase
          .from('personnel_schedules')
          .upsert(schedule, { onConflict: 'user_id, date' })
          .select()
          .single();
      
      if (error) throw error;
      return data;
  },

  // BULK AUTO-SCHEDULE GENERATOR
  generateWeeklySchedule: async (startDate: Date, endDate: Date) => {
      // 1. Fetch active users
      const { data: users, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('status', 'active');
      
      if (userError) throw userError;
      if (!users || users.length === 0) throw new Error("No active users found.");

      const schedules = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      // 2. Loop through dates
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });

          // 3. Loop through users
          for (const user of users) {
              let status = 'On Duty';
              let shift = user.preferred_shift || '1st';

              // Logic: Saturday is Mandatory Road Clearing (8am-10am -> 2nd shift bucket)
              if (dayName === 'Saturday') {
                  status = 'Road Clearing';
                  shift = '2nd'; 
              } 
              // Logic: Preferred Day Off
              else if (dayName === user.preferred_day_off) {
                  status = 'Day Off';
              }

              schedules.push({
                  user_id: user.id,
                  date: dateStr,
                  status: status,
                  shift: shift
              });
          }
      }

      // 4. Bulk Upsert
      const { error } = await supabase
          .from('personnel_schedules')
          .upsert(schedules, { onConflict: 'user_id, date' });

      if (error) throw error;
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

  getIncidentsByStatus: async (statuses: string[]): Promise<IncidentWithDetails[]> => {
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        profiles:officer_id (full_name),
        dispatch_logs (*),
        incident_parties (*)
      `)
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
      const { error } = await supabase
        .from('incidents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
  },

  updateDispatchStatus: async (logId: string, updates: Partial<DispatchLog>) => {
    // 1. Update Dispatch Log (Authenticated users can always do this via RLS)
    const { data, error } = await supabase
      .from('dispatch_logs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', logId)
      .select()
      .single();
    
    if (error) throw error;
    
    // 2. Auto-update incident status logic (Best effort - fail safe)
    if (data) {
        try {
            // If unit arrives on scene, mark incident as Dispatched
            if (updates.status === 'On Scene') {
                await supabase.from('incidents').update({ status: 'Dispatched' }).eq('id', data.incident_id);
            }
            
            // NEW: If clearing a logistics run, close the incident automatically
            if (updates.status === 'Clear') {
                const { data: incident } = await supabase
                    .from('incidents')
                    .select('type')
                    .eq('id', data.incident_id)
                    .single();
                    
                if (incident && incident.type === 'Logistics') {
                     // Attempt to close. If user is field_operator and RLS blocks, this will fail silently.
                     // We catch the error so it doesn't break the UI flow for the Dispatch Log update.
                     await supabase.from('incidents').update({ status: 'Closed' }).eq('id', data.incident_id);
                }
            }
        } catch (secondaryError) {
            console.warn("Secondary incident update failed (likely permission issue), but dispatch log was updated.", secondaryError);
        }
    }
    
    return data;
  },

  logVehicleDispatch: async (
      loggerId: string,
      vehicle: string, 
      officers: string, // joined string
      purpose: string, 
      location: string
  ) => {
      // 1. Create Incident
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
        .select()
        .single();
      
      if (incError) throw incError;

      // 2. Create Dispatch Log
      const { error: logError } = await supabase
        .from('dispatch_logs')
        .insert({
            incident_id: incident.id,
            unit_name: `${vehicle} - ${officers}`,
            status: 'En Route',
            updated_at: new Date().toISOString()
        });

      if (logError) throw logError;
      return incident;
  },

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

  getRestrictedPersons: async () => {
    const { data, error } = await supabase
      .from('incident_parties')
      .select(`
        *,
        incidents!inner (
          case_number,
          is_restricted_entry,
          created_at,
          type,
          narrative
        )
      `)
      .eq('incidents.is_restricted_entry', true)
      .in('role', ['Respondent', 'Suspect'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

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
      const { data, error } = await supabase
        .from('asset_requests')
        .update({ 
            status, 
            updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
          throw new Error("Update failed. You may not have permission to update this record.");
      }
      
      return data[0];
  },

  // CCTV REQUESTS
  createCCTVRequest: async (
      requestData: Omit<CCTVRequest, 'id' | 'created_at' | 'request_number'>
  ) => {
      const caseNum = `CCTV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data, error } = await supabase
        .from('cctv_requests')
        .insert({
            ...requestData,
            request_number: caseNum
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
  },

  getCCTVRequests: async (): Promise<CCTVRequest[]> => {
      const { data, error } = await supabase
        .from('cctv_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
  },

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
