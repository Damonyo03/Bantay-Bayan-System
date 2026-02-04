
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';
import { Settings as SettingsIcon, User, Lock, Mail, CreditCard, Save } from 'lucide-react';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [badgeNumber, setBadgeNumber] = useState(user?.badge_number || '');

  // Security Form State
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setProfileLoading(true);
      try {
          await supabaseService.updateProfile(user.id, {
              full_name: fullName,
              badge_number: badgeNumber
          });
          showToast("Profile updated successfully", "success");
      } catch (error: any) {
          showToast(error.message || "Failed to update profile", "error");
      } finally {
          setProfileLoading(false);
      }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!confirm("Are you sure you want to change your login credentials?")) return;
      
      setSecurityLoading(true);
      try {
          const updates: any = {};
          if (email !== user?.email) updates.email = email;
          if (password) updates.password = password;

          if (Object.keys(updates).length === 0) {
              showToast("No changes detected", "info");
              return;
          }

          await supabaseService.updateUserCredentials(updates);
          showToast("Credentials updated. You may need to login again.", "success");
          setPassword(''); // Clear password field
      } catch (error: any) {
          showToast(error.message || "Failed to update credentials", "error");
      } finally {
          setSecurityLoading(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center">
            <SettingsIcon className="mr-3 text-gray-700" />
            Account Settings
        </h1>
        <p className="text-gray-500 mt-2">Manage your personal profile and security preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* PROFILE SECTION */}
          <div className="glass-panel p-8 rounded-[2rem] shadow-xl border border-white/60">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <User className="mr-2 text-blue-600" size={24} />
                  Public Profile
              </h2>
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Full Name</label>
                      <div className="relative">
                          <User className="absolute left-3 top-3 text-gray-400" size={18} />
                          <input 
                              type="text"
                              value={fullName}
                              onChange={e => setFullName(e.target.value)}
                              className="w-full bg-white/50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500/20 outline-none"
                              placeholder="Officer Name"
                          />
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Badge ID</label>
                      <div className="relative">
                          <CreditCard className="absolute left-3 top-3 text-gray-400" size={18} />
                          <input 
                              type="text"
                              value={badgeNumber}
                              onChange={e => setBadgeNumber(e.target.value)}
                              className="w-full bg-white/50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500/20 outline-none"
                              placeholder="BB-202X-XXX"
                          />
                      </div>
                  </div>
                  <div className="pt-4">
                      <button 
                          type="submit"
                          disabled={profileLoading}
                          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2"
                      >
                          {profileLoading ? <span>Saving...</span> : (
                             <>
                                <Save size={18} />
                                <span>Save Profile</span>
                             </>
                          )}
                      </button>
                  </div>
              </form>
          </div>

          {/* SECURITY SECTION */}
          <div className="glass-panel p-8 rounded-[2rem] shadow-xl border border-white/60">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <Lock className="mr-2 text-red-600" size={24} />
                  Security & Login
              </h2>
              <form onSubmit={handleUpdateSecurity} className="space-y-5">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Email Address</label>
                      <div className="relative">
                          <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                          <input 
                              type="email"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              className="w-full bg-white/50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-red-500/20 outline-none"
                          />
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">New Password</label>
                      <div className="relative">
                          <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                          <input 
                              type="password"
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              className="w-full bg-white/50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-red-500/20 outline-none"
                              placeholder="Leave blank to keep current"
                              minLength={8}
                          />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 ml-1">Must be at least 8 characters long.</p>
                  </div>
                  <div className="pt-4">
                      <button 
                          type="submit"
                          disabled={securityLoading}
                          className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black shadow-lg transition-all flex items-center justify-center space-x-2"
                      >
                           {securityLoading ? <span>Updating...</span> : (
                             <>
                                <Save size={18} />
                                <span>Update Credentials</span>
                             </>
                          )}
                      </button>
                  </div>
              </form>
          </div>

      </div>
    </div>
  );
};

export default Settings;
