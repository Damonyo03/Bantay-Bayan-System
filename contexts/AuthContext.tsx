
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { supabaseService } from '../services/supabaseService';

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<'success' | 'mfa_required'>;
  verifyLoginMFA: (code: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const profile = await supabaseService.getCurrentUserProfile();
        // Even on auto-login/refresh, check status
        if (profile && profile.status !== 'active') {
            await supabaseService.logout();
            setUser(null);
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

  return (
    <AuthContext.Provider value={{ user, login, verifyLoginMFA, logout, isLoading }}>
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
