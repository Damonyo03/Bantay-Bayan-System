
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';
import { Settings as SettingsIcon, User, Lock, Mail, CreditCard, Save, Smartphone, Check, ShieldAlert, Trash2, QrCode, Camera, Database, Download, AlertTriangle, FileJson } from 'lucide-react';

const Settings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  
  const [profileLoading, setProfileLoading] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [badgeNumber, setBadgeNumber] = useState(user?.badge_number || '');
  
  const [imagePreview, setImagePreview] = useState<string | null>(user?.avatar_url || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security Form State
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');

  // MFA State
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  // Data Management State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (user) {
        loadMFAFactors();
    }
  }, [user]);

  // Effect 1: Sync Form Data (Text) only when User object changes explicitly
  useEffect(() => {
      if (user) {
          setFullName(prev => (prev === '' || prev === user.full_name) ? user.full_name || '' : prev);
          setBadgeNumber(prev => (prev === '' || prev === user.badge_number) ? user.badge_number || '' : prev);
          setEmail(prev => (prev === '' || prev === user.email) ? user.email || '' : prev);
      }
  }, [user]);

  // Effect 2: Handle Image Preview Logic
  useEffect(() => {
      if (selectedFile) {
          // If local file selected, show it
          const reader = new FileReader();
          reader.onloadend = () => {
              setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(selectedFile);
      } else if (user?.avatar_url) {
          // If no local file selected, rely on the URL from the DB.
          // The URL saved in DB now includes ?t=timestamp (from supabaseService), so it auto-busts cache.
          setImagePreview(user.avatar_url);
      } else {
          setImagePreview(null);
      }
  }, [user, selectedFile]);

  const loadMFAFactors = async () => {
      try {
          const factors = await supabaseService.listMFAFactors();
          setMfaFactors(factors || []);
      } catch (e) {
          console.error("Failed to load MFA factors", e);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 2 * 1024 * 1024) { // 2MB limit
              showToast("Image size must be less than 2MB", "error");
              return;
          }
          setSelectedFile(file);
          // Preview is handled by Effect 2
      }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      if (!fullName.trim()) {
          showToast("Full Name cannot be empty.", "error");
          return;
      }

      setProfileLoading(true);
      try {
          let avatarUrl = user.avatar_url;

          // 1. Upload new image if selected
          if (selectedFile) {
              // This returns URL with ?t=...
              avatarUrl = await supabaseService.uploadAvatar(user.id, selectedFile);
          }

          // 2. Update profile
          // Send null if badgeNumber is empty string to avoid unique constraint violation on empty strings
          const badgePayload = badgeNumber.trim() === '' ? null : badgeNumber.trim();

          await supabaseService.updateProfile(user.id, {
              full_name: fullName.trim(),
              badge_number: badgePayload as string, 
              avatar_url: avatarUrl // Saves new timestamped URL to DB
          });

          // 3. Refresh Context
          await refreshUser();
          
          setSelectedFile(null); // Clear selection after success
          if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input

          showToast("Profile updated successfully", "success");
      } catch (error: any) {
          console.error("Update profile error:", error);
          // Handle specific uniqueness error
          if (error.message?.includes('badge_number')) {
              showToast("Badge Number is already in use.", "error");
          } else {
              showToast(error.message || "Failed to update profile", "error");
          }
      } finally {
          setProfileLoading(false);
      }
  };

  const validatePassword = (pwd: string) => {
      // Min 8 chars, 1 Uppercase, 1 Number, 1 Special Char
      const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      return regex.test(pwd);
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const updates: any = {};
      if (email !== user?.email) updates.email = email;
      if (password) {
          if (!validatePassword(password)) {
              showToast("Password must be at least 8 characters, include an uppercase letter, and a special character.", "error");
              return;
          }
          updates.password = password;
      }

      if (Object.keys(updates).length === 0) {
          showToast("No changes detected", "info");
          return;
      }

      if (!confirm("Are you sure you want to change your login credentials?")) return;
      
      setSecurityLoading(true);
      try {
          await supabaseService.updateUserCredentials(updates);
          await refreshUser();
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

  // --- DATA MANAGEMENT HANDLERS ---
  const handleDownloadBackup = async () => {
      setIsBackingUp(true);
      try {
          const backupData = await supabaseService.getFullSystemBackup();
          
          // Create Blob and Download
          const jsonString = JSON.stringify(backupData, null, 2);
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = `bantay_bayan_backup_${new Date().toISOString().slice(0,10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setBackupDownloaded(true);
          showToast("Backup downloaded successfully. Save this file securely.", "success");
      } catch (error: any) {
          console.error("Backup failed", error);
          showToast("Failed to generate backup: " + error.message, "error");
      } finally {
          setIsBackingUp(false);
      }
  };

  const handleResetSystem = async () => {
      if (!backupDownloaded) {
          showToast("You must download a backup before resetting data.", "error");
          return;
      }

      const confirmPhrase = "RESET DATA";
      const input = prompt(`WARNING: This will permanently delete all incidents, logs, and requests.\nUser accounts will remain.\n\nType "${confirmPhrase}" to confirm:`);
      
      // 1. Handle Cancel button (null input)
      if (input === null) return;

      // 2. Handle Case-Insensitive and Whitespace
      if (input.trim().toUpperCase() !== confirmPhrase) {
          showToast("Reset cancelled. Incorrect phrase typed.", "error");
          return;
      }

      setResetting(true);
      try {
          const result = await supabaseService.resetSystemData();
          if (result && result.success) {
              showToast("System data cleared successfully.", "success");
              setBackupDownloaded(false); // Reset state
          } else {
              throw new Error(result?.message || "Unknown error");
          }
      } catch (error: any) {
          console.error("Reset error", error);
          showToast("Reset failed: " + error.message, "error");
      } finally {
          setResetting(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
            <SettingsIcon className="mr-3 text-slate-600 dark:text-slate-200" />
            Account Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-2">Manage your personal profile and security preferences.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
          
          {/* PROFILE SECTION */}
          <div className="glass-panel p-8 rounded-[2rem] shadow-xl border border-white/60 dark:border-white/10">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
                  <User className="mr-2 text-blue-600 dark:text-blue-400" size={24} />
                  Public Profile
              </h2>
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                  
                  {/* AVATAR UPLOAD */}
                  <div className="flex flex-col items-center">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-xl bg-slate-100 dark:bg-slate-700 relative">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" key={imagePreview} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                                        <User size={64} />
                                    </div>
                                )}
                                {profileLoading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors border-4 border-white dark:border-slate-800">
                                <Camera size={18} />
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-3 uppercase tracking-wide">Tap to Change Photo</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                className="w-full bg-white/50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white"
                                placeholder="Officer Name"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 ml-1">Badge ID</label>
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="text"
                                value={badgeNumber}
                                onChange={e => setBadgeNumber(e.target.value)}
                                className="w-full bg-white/50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white"
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
            <div className="glass-panel p-8 rounded-[2rem] shadow-xl border border-white/60 dark:border-white/10">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
                      <Smartphone className="mr-2 text-purple-600 dark:text-purple-400" size={24} />
                      Two-Factor Authentication
                  </h2>
                  
                  <div className="space-y-6">
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                          Secure your account by requiring a code from your authenticator app (Google Authenticator, Authy, etc.) when logging in on new devices.
                      </p>

                      {mfaFactors.length > 0 ? (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2 text-green-800 dark:text-green-300 font-bold">
                                      <Check size={20} />
                                      <span>2FA Enabled</span>
                                  </div>
                                  <button 
                                    onClick={() => unenrollFactor(mfaFactors[0].id)}
                                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    title="Disable 2FA"
                                  >
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                              <p className="text-xs text-green-700 dark:text-green-400">Your account is protected.</p>
                          </div>
                      ) : (
                          !mfaEnrolling && (
                              <button 
                                  onClick={startEnrollment}
                                  className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400 font-bold hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                              >
                                  <QrCode size={20} />
                                  <span>Setup 2FA Now</span>
                              </button>
                          )
                      )}

                      {/* Enrollment UI */}
                      {mfaEnrolling && (
                          <div className="space-y-4 animate-fade-in border-t border-gray-100 dark:border-slate-700 pt-4">
                              <div className="flex flex-col items-center">
                                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Scan with Authenticator App</p>
                                  {/* Render SVG QR Code */}
                                  <div className="bg-white p-2 rounded-lg border border-gray-200 mb-4">
                                      <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
                                  </div>
                              </div>
                              
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Verify Code</label>
                                  <div className="flex space-x-2">
                                      <input 
                                          type="text"
                                          placeholder="000000"
                                          maxLength={6}
                                          className="flex-1 bg-white/50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none text-center font-mono tracking-widest text-lg text-slate-800 dark:text-white"
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
                                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mt-2"
                              >
                                  Cancel Setup
                              </button>
                          </div>
                      )}
                  </div>
            </div>

            {/* PASSWORD SECTION */}
            <div className="glass-panel p-8 rounded-[2rem] shadow-xl border border-white/60 dark:border-white/10">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
                    <Lock className="mr-2 text-red-600 dark:text-red-400" size={24} />
                    Credentials
                </h2>
                <form onSubmit={handleUpdateSecurity} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-white/50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-red-500/20 outline-none text-slate-800 dark:text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-white/50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-red-500/20 outline-none text-slate-800 dark:text-white"
                                placeholder="Leave blank to keep current"
                                minLength={8}
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 ml-1">Must be at least 8 chars, 1 Uppercase, 1 Number, 1 Special.</p>
                    </div>
                    <div className="pt-4">
                        <button 
                            type="submit"
                            disabled={securityLoading}
                            className="w-full bg-gray-900 dark:bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-black dark:hover:bg-slate-600 shadow-lg transition-all flex items-center justify-center space-x-2"
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

          {/* ADMIN DATA MANAGEMENT (Supervisor Only) */}
          {user?.role === 'supervisor' && (
              <div className="glass-panel p-8 rounded-[2rem] shadow-xl border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10">
                  <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2 flex items-center">
                      <Database className="mr-2" size={24} />
                      System Data Management
                  </h2>
                  <p className="text-sm text-red-600 dark:text-red-300 mb-6">
                      Advanced controls for system maintenance. Proceed with caution.
                  </p>

                  <div className="space-y-6">
                      
                      {/* Step 1: Archive */}
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-red-100 dark:border-red-900/30">
                          <div>
                              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Step 1: Archive Data</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Download a full JSON backup of Incidents, Logs, Requests, and Schedules.</p>
                          </div>
                          <button 
                            onClick={handleDownloadBackup}
                            disabled={isBackingUp}
                            className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-bold flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                          >
                              {isBackingUp ? (
                                  <span className="animate-pulse">Archiving...</span>
                              ) : (
                                  <>
                                    <Download size={16} />
                                    <span>Download Backup</span>
                                  </>
                              )}
                          </button>
                      </div>

                      {/* Step 2: Reset */}
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-red-100 dark:border-red-900/30">
                          <div>
                              <h3 className="font-bold text-red-700 dark:text-red-400 text-sm flex items-center">
                                  <AlertTriangle size={14} className="mr-1" />
                                  Step 2: Reset System
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Permanently delete all transactional data (Incidents, Assets, Logs). User accounts are preserved.</p>
                          </div>
                          <button 
                            onClick={handleResetSystem}
                            disabled={!backupDownloaded || resetting}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors ${
                                backupDownloaded 
                                ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/20 shadow-lg' 
                                : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                            }`}
                          >
                              {resetting ? (
                                  <span>Resetting...</span>
                              ) : (
                                  <>
                                    <Trash2 size={16} />
                                    <span>Clear Database</span>
                                  </>
                              )}
                          </button>
                      </div>
                      
                      {!backupDownloaded && (
                          <p className="text-[10px] text-center text-slate-400 italic">
                              * You must download a backup archive before the Reset option becomes available.
                          </p>
                      )}
                  </div>
              </div>
          )}

      </div>
    </div>
  );
};

export default Settings;
