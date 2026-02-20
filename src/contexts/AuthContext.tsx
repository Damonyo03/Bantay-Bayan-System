
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<'success' | 'mfa_required'>;
  verifyLoginMFA: (code: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial Load & Auth State Listener
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Use getUser() for more reliable server-side validation of the session
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
            if (mounted) {
                setUser(null);
                setIsLoading(false);
            }
            return;
        }

        const profile = await supabaseService.getCurrentUserProfile();
        
        if (mounted) {
            if (profile && profile.status === 'active') {
                setUser(profile);
            } else {
                // If profile is inactive or missing, sign out
                await supabase.auth.signOut();
                setUser(null);
            }
            setIsLoading(false);
        }
      } catch (error: any) {
        console.error("Auth initialization failed:", error);
        if (mounted) {
            setUser(null);
            setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth event:", event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
                const profile = await supabaseService.getCurrentUserProfile();
                if (profile && profile.status === 'active') {
                    setUser(profile);
                } else if (profile) {
                    await supabase.auth.signOut();
                    setUser(null);
                }
            }
        } else if (event === 'SIGNED_OUT') {
            setUser(null);
        }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
      const { user, mfaRequired } = await supabaseService.login(email, password);
      
      if (user.status !== 'active') {
          await supabaseService.logout();
          throw new Error("Your account is pending approval or inactive. Contact the administrator.");
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
      await supabaseService.challengeMFA(code);
      // Refresh profile to ensure full session validity
      const profile = await supabaseService.getCurrentUserProfile();
      setUser(profile);
  };

  const logout = async () => {
    await supabaseService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
      try {
          const profile = await supabaseService.getCurrentUserProfile();
          if (profile) {
              setUser(profile);
          }
      } catch (error) {
          console.error("Failed to refresh user profile", error);
      }
  };

  return (
    <AuthContext.Provider value={{ user, login, verifyLoginMFA, logout, isLoading, refreshUser }}>
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
