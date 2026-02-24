
import { supabase } from '../lib/supabaseClient';
import { UserProfile } from '../types';

export const authService = {
    getSession: async () => {
        return await supabase.auth.getSession();
    },

    getCurrentUserProfile: async (): Promise<UserProfile | null> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return null;

        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        return data as UserProfile;
    },

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

    verifyPassword: async (password: string): Promise<void> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) throw new Error("No authenticated user found");

        const { error } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: password,
        });

        if (error) throw new Error("Incorrect old password");
    },

    updateUserCredentials: async (updates: { email?: string; password?: string }) => {
        const { error } = await supabase.auth.updateUser(updates);
        if (error) throw error;
        if (updates.email) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) await supabase.from('profiles').update({ email: updates.email }).eq('id', user.id);
        }
    },

    // MFA / 2FA
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

    getStatus: async (userId: string) => {
        const { data, error } = await supabase.from('profiles').select('status').eq('id', userId).single();
        if (error) throw error;
        return data.status;
    },

    getAssuranceLevel: async () => {
        const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw error;
        return data;
    },

    registerUser: async (email: string, username: string, password: string, fullName: string) => {

        // 1. Sign up with Supabase Auth
        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    username: username,
                }
            }
        });

        if (signUpError) throw signUpError;
        if (!data.user) throw new Error("Registration failed - no user returned");

        // Profile is handled by DB triggers/functions in this system architecture,
        // but we can ensure the username/fullname are set if needed.
        // Based on the SQL files, there's likely a trigger on auth.users.
        return data.user;
    }
};

