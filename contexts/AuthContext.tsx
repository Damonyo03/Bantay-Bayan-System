
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<'success' | 'mfa_required'>;
  verifyLoginMFA: (code: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  
  // Permission Helpers
  isSupremeAdmin: () => boolean;
  isHighLevelAdmin: () => boolean;
  canEditRole: (targetUserRole?: string) => boolean;
  canEditProfile: (targetUserRole?: string) => boolean;
  canDeleteData: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial Load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        let profile = await authService.getCurrentUserProfile();

        if (profile && authUser) {
          // Auto-verify: If user is 'inactive' (unverified) but email is confirmed, 
          // upgrade them to 'pending' so they reflect in the admin queue.
          if (profile.status === 'inactive' && authUser.email_confirmed_at) {
            try {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ status: 'pending' })
                .eq('id', profile.id);
              
              if (!updateError) {
                profile.status = 'pending';
              }
            } catch (err) {
              console.error("Auto-verification update failed:", err);
            }
          }

          // Allow 'active' and 'pending' users to maintain a session
          // 'pending' users will be handled by the UI (e.g. redirected or shown a restricted view)
          if (profile.status === 'active' || profile.status === 'pending') {
            setUser(profile);
          } else {
            // Rejected or Deactivated
            await authService.logout();
            setUser(null);
          }
        } else {
          setUser(profile);
        }
      } catch (error) {
        console.error("Auth initialization failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 2. Real-time Profile Subscription
  // This ensures that if the avatar or details are updated (even in another tab), 
  // the state updates immediately in this session.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile_changes:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          // Automatically update local state with new DB data
          console.log("Real-time profile update:", payload.new);
          setUser(payload.new as UserProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const login = async (email: string, password: string): Promise<'success' | 'mfa_required'> => {
    try {
      const { user, mfaRequired } = await authService.login(email, password);

      if (user.status === 'inactive') {
        // If they managed to log in, it means they are verified in Auth.
        // We update their status to 'pending' now.
        try {
          await supabase.from('profiles').update({ status: 'pending' }).eq('id', user.id);
          user.status = 'pending';
        } catch (err) {
          console.error("Failed to upgrade status during login", err);
        }
      }

      if (user.status === 'rejected') {
        await authService.logout();
        throw new Error("Your application has been rejected. Please contact the barangay office for more information.");
      }

      if (user.status === 'deactivated') {
        await authService.logout();
        throw new Error("Your account has been deactivated. Please contact the administrator.");
      }

      // We set the user temporarily so we can display their name during 2FA challenge
      // But until MFA is verified, Supabase session is technically AAL1 (limited)
      setUser(user);
      return mfaRequired ? 'mfa_required' : 'success';
    } catch (error) {
      throw error;
    }
  };

  const verifyLoginMFA = async (code: string) => {
    await authService.challengeMFA(code);
    // Refresh profile to ensure full session validity
    const profile = await authService.getCurrentUserProfile();
    setUser(profile);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const profile = await authService.getCurrentUserProfile();
      if (profile) {
        setUser(profile);
      }
    } catch (error) {
      console.error("Failed to refresh user profile", error);
    }
  };

  // --- Permission Helpers ---
  const isSupremeAdmin = () => {
    return user?.role === 'barangay_captain' || user?.role === 'developer';
  };

  const isHighLevelAdmin = () => {
    return user?.role === 'barangay_captain' || user?.role === 'developer' || user?.role === 'barangay_secretary' || user?.role === 'barangay_kagawad';
  };

  const canEditRole = (targetUserRole?: string) => {
    if (!user) return false;
    // Only Developer and Captain can edit roles
    if (user.role === 'developer') return true;
    if (user.role === 'barangay_captain') {
       // Captain can edit everyone except Developer
       return targetUserRole !== 'developer';
    }
    return false; // Other roles cannot edit roles
  };

  const canEditProfile = (targetUserRole?: string) => {
    if (!user) return false;
    if (user.role === 'developer') return true;
    if (user.role === 'barangay_captain') {
       // Captain can edit everyone except Developer
       return targetUserRole !== 'developer';
    }
    // Secretary and Kagawad can edit common profiles but NOT supreme ones
    if (user.role === 'barangay_secretary' || user.role === 'barangay_kagawad') {
       return targetUserRole !== 'developer' && targetUserRole !== 'barangay_captain';
    }
    return false;
  };

  const canDeleteData = () => {
    return isHighLevelAdmin(); // Only Captain, Secretary, Kagawad can delete
  };

  return (
    <AuthContext.Provider value={{ 
      user, login, verifyLoginMFA, logout, isLoading, refreshUser,
      isSupremeAdmin, isHighLevelAdmin, canEditRole, canEditProfile, canDeleteData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
