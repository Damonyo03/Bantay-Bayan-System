
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';
import { Settings as SettingsIcon, User, Lock, Mail, CreditCard, Save, Smartphone, Check, ShieldAlert, Trash2, QrCode } from 'lucide-react';

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

  // MFA State
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  useEffect(() => {
    loadMFAFactors();
  }, []);

  const loadMFAFactors = async () => {
      try {
          const factors = await supabaseService.listMFAFactors();
          setMfaFactors(factors);
      } catch (e) {
          console.error("Failed to load MFA factors", e);
      }
  };

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

  // --- MFA HANDLERS ---
  const startEnrollment = async () => {
      setMfaEnrolling(true);
      try {
          const data = await supabaseService.enrollMFA();
          setFactorId(data.id);
          setQrCode(data.totp.qr_code);
      } catch (error: any) {
          showToast("Failed to start enrollment: " + error.message, 'error');
          setMfaEnrolling(false);
      }
  };

  const verifyEnrollment = async () => {
      try {
          await supabaseService.verifyMFA(factorId, verifyCode);
          showToast("2FA Enabled Successfully", "success");
          setMfaEnrolling(false);
          setQrCode('');
          setVerifyCode('');
          loadMFAFactors();
      } catch (error: any) {
          showToast("Invalid code: " + error.message, "error");
      }
  };

  const unenrollFactor = async (id: string) => {
      if (!confirm("Are you sure you want to disable 2FA? This reduces your account security.")) return;
      try {
          await supabaseService.unenrollMFA(id);
          showToast("2FA Disabled", "info");
          loadMFAFactors();
      } catch (error: any) {
          showToast(error.message, "error");
      }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
      <header className="mb-8">
        {/* UPDATED TO WHITE TEXT */}
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
            <SettingsIcon className="mr-3 text-slate-200" />
            Account Settings
        </h1>
        <p className="text-slate-300 mt-2">Manage your personal profile and security preferences.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
          
          {/* PROFILE SECTION */}
          <div className="glass-panel p-8 rounded-[2rem] shadow-xl border border-white/60">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                  <User className="mr-2 text-blue-600" size={24} />
                  Public Profile
              </h2>
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  </div>
                  <div className="pt-4 flex justify-end">
                      <button 
                          type="submit"
                          disabled={profileLoading}
                          className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center space-x-2"
                      >
                          {profileLoading ? <span>Saving...</span> : (
                             <>
                                <Save size={18} />
                                <span>Save Changes</span>
                             </>
                          )}
                      </button>
                  </div>
              </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* MFA / 2FA SECTION */}
            <div className="glass-panel p-8 rounded-[2rem] shadow-xl border border-white/60">
                  <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                      <Smartphone className="mr-2 text-purple-600" size={24} />
                      Two-Factor Authentication
                  </h2>
                  
                  <div className="space-y-6">
                      <p className="text-sm text-gray-500 leading-relaxed">
                          Secure your account by requiring a code from your authenticator app (Google Authenticator, Authy, etc.) when logging in on new devices.
                      </p>

                      {mfaFactors.length > 0 ? (
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2 text-green-800 font-bold">
                                      <Check size={20} />
                                      <span>2FA Enabled</span>
                                  </div>
                                  <button 
                                    onClick={() => unenrollFactor(mfaFactors[0].id)}
                                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Disable 2FA"
                                  >
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                              <p className="text-xs text-green-700">Your account is protected.</p>
                          </div>
                      ) : (
                          !mfaEnrolling && (
                              <button 
                                  onClick={startEnrollment}
                                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center space-x-2 text-gray-500 font-bold hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                              >
                                  <QrCode size={20} />
                                  <span>Setup 2FA Now</span>
                              </button>
                          )
                      )}

                      {/* Enrollment UI */}
                      {mfaEnrolling && (
                          <div className="space-y-4 animate-fade-in border-t border-gray-100 pt-4">
                              <div className="flex flex-col items-center">
                                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Scan with Authenticator App</p>
                                  {/* Render SVG QR Code */}
                                  <div className="bg-white p-2 rounded-lg border border-gray-200 mb-4">
                                      <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Verify Code</label>
                                  <div className="flex space-x-2">
                                      <input 
                                          type="text"
                                          placeholder="000000"
                                          maxLength={6}
                                          className="flex-1 bg-white/50 border border-gray-200 rounded-xl py-3 px-4 outline-none text-center font-mono tracking-widest text-lg"
                                          value={verifyCode}
                                          onChange={e => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                                      />
                                      <button 
                                          onClick={verifyEnrollment}
                                          className="bg-purple-600 text-white font-bold px-6 rounded-xl hover:bg-purple-700"
                                      >
                                          Verify
                                      </button>
                                  </div>
                              </div>
                              <button 
                                onClick={() => setMfaEnrolling(false)}
                                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-2"
                              >
                                  Cancel Setup
                              </button>
                          </div>
                      )}
                  </div>
            </div>

            {/* PASSWORD SECTION */}
            <div className="glass-panel p-8 rounded-[2rem] shadow-xl border border-white/60">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                    <Lock className="mr-2 text-red-600" size={24} />
                    Credentials
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
                                    <ShieldAlert size={18} />
                                    <span>Update Credentials</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            
          </div>
      </div>
    </div>
  );
};

export default Settings;
