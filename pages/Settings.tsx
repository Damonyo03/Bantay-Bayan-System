
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { systemService } from '../services/systemService';
import { useToast } from '../contexts/ToastContext';
import { Settings as SettingsIcon, User, Lock, Mail, CreditCard, Save, Smartphone, Check, ShieldAlert, Trash2, QrCode, Camera as CameraIcon, Database, Download, AlertTriangle, FileJson } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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
    const [oldPassword, setOldPassword] = useState('');
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

    // Step-up Auth State
    const [showStepUpModal, setShowStepUpModal] = useState(false);
    const [stepUpCode, setStepUpCode] = useState('');
    const [stepUpLoading, setStepUpLoading] = useState(false);
    const [pendingUpdates, setPendingUpdates] = useState<any>(null);


    useEffect(() => {
        if (user) {
            loadMFAFactors();
        }
    }, [user]);

    // Effect 1: Sync Form Data (Text) only when User object changes explicitly
    useEffect(() => {
        if (user) {
            setFullName((prev: string) => (prev === '' || prev === user.full_name) ? user.full_name || '' : prev);
            setBadgeNumber((prev: string) => (prev === '' || prev === user.badge_number) ? user.badge_number || '' : prev);
            setEmail((prev: string) => (prev === '' || prev === user.email) ? user.email || '' : prev);
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
            const factors = await authService.listMFAFactors();
            setMfaFactors(factors || []);
        } catch (e) {
            console.error("Failed to load MFA factors", e);
        }
    };

    const handlePhotoAction = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                const image = await Camera.getPhoto({
                    quality: 90,
                    allowEditing: true,
                    resultType: CameraResultType.Uri,
                    source: CameraSource.Prompt // Asks User: Camera or Photos?
                });

                if (image.webPath) {
                    setImagePreview(image.webPath);
                    // Convert Uri to File-like object for upload
                    const response = await fetch(image.webPath);
                    const blob = await response.blob();
                    const file = new File([blob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    setSelectedFile(file);
                }
            } catch (error) {
                console.log('User cancelled or camera error', error);
            }
        } else {
            fileInputRef.current?.click();
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
                avatarUrl = await userService.uploadAvatar(user.id, selectedFile);
            }

            // 2. Update profile (Badge ID is read-only, so we don't send it)
            await userService.updateProfile(user.id, {
                full_name: fullName.trim(),
                avatar_url: avatarUrl // Saves new timestamped URL to DB
            });

            // 3. Refresh Context
            await refreshUser();

            setSelectedFile(null); // Clear selection after success
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input

            showToast("Profile updated successfully", "success");
        } catch (error: any) {
            console.error("Update profile error:", error);
            showToast(error.message || "Failed to update profile", "error");
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

        if (!oldPassword) {
            showToast("Please enter your current password to verify changes.", "error");
            return;
        }

        if (!confirm("Are you sure you want to change your login credentials?")) return;

        setSecurityLoading(true);
        try {
            // 1. Verify Old Password First
            await authService.verifyPassword(oldPassword);

            // 2. Check for AAL2 if MFA is enabled
            const { currentLevel, nextLevel } = await authService.getAssuranceLevel();
            if (nextLevel === 'aal2' && currentLevel === 'aal1') {
                setPendingUpdates(updates);
                setShowStepUpModal(true);
                return;
            }

            // 3. Update Credentials
            await authService.updateUserCredentials(updates);
            await refreshUser();
            showToast("Credentials updated successfully.", "success");
            setPassword('');
            setOldPassword('');
        } catch (error: any) {
            showToast(error.message || "Failed to update credentials", "error");
        } finally {
            setSecurityLoading(false);
        }
    };

    const handleVerifyStepUp = async () => {
        if (!stepUpCode || stepUpCode.length < 6) return;
        setStepUpLoading(true);
        try {
            await authService.challengeMFA(stepUpCode);
            // After successful challenge, the session is now AAL2
            if (pendingUpdates) {
                await authService.updateUserCredentials(pendingUpdates);
                await refreshUser();
                showToast("Credentials updated successfully.", "success");
            }
            setShowStepUpModal(false);
            setStepUpCode('');
            setPendingUpdates(null);
            setPassword('');
            setOldPassword('');
        } catch (error: any) {
            showToast("Invalid code: " + error.message, "error");
        } finally {
            setStepUpLoading(false);
            setSecurityLoading(false);
        }
    };


    // --- MFA HANDLERS ---
    const startEnrollment = async () => {
        setMfaEnrolling(true);
        try {
            const data = await authService.enrollMFA();
            setFactorId(data.id);
            setQrCode(data.totp.qr_code);
        } catch (error: any) {
            showToast("Failed to start enrollment: " + error.message, 'error');
            setMfaEnrolling(false);
        }
    };

    const verifyEnrollment = async () => {
        try {
            await authService.verifyMFA(factorId, verifyCode);
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
            await authService.unenrollMFA(id);
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
            const backupData = await systemService.getFullSystemBackup();
            const jsonString = JSON.stringify(backupData, null, 2);
            const filename = `bantay_bayan_backup_${new Date().toISOString().slice(0, 10)}.json`;

            if (Capacitor.getPlatform() === 'android') {
                try {
                    // 1. Request Runtime Storage Permissions
                    const permissions = await Filesystem.requestPermissions();
                    if (permissions.publicStorage !== 'granted') {
                        window.alert("Storage permission denied. Cannot save backup.");
                        return; // Stop execution
                    }

                    // 2. Safe Saving to Documents Directory
                    await Filesystem.writeFile({
                        path: filename,
                        data: jsonString,
                        directory: Directory.Documents,
                        encoding: Encoding.UTF8,
                        recursive: true
                    });

                    // Alert user of success since there's no share sheet
                    window.alert(`Success! Backup saved to Documents folder as "${filename}".`);
                } catch (error: any) {
                    console.error("Android File Write Error:", error);
                    // 3. Prevent total app crash via alert fallback
                    window.alert(`Exception occurred while saving backup: ${error.message || 'Unknown error'}`);
                    return; // Stop execution so it doesn't show success toast
                }
            } else if (Capacitor.isNativePlatform()) {
                // iOS Fallback (Cache + Share)
                const saveResult = await Filesystem.writeFile({
                    path: filename,
                    data: jsonString,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8,
                    recursive: true
                });

                await Share.share({
                    title: filename,
                    text: 'Bantay-Bayan System Backup',
                    files: [saveResult.uri],
                    dialogTitle: 'Save Backup File'
                });
            } else {
                // Web Fallback: Create Blob and Download
                const blob = new Blob([jsonString], { type: "application/json" });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            setBackupDownloaded(true);
            showToast("Backup generated successfully.", "success");
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
            const result = await systemService.resetSystemData();
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
            <PageHeader
                title="Personal Settings"
                subtitle={`Your account details • ${user?.full_name}`}
                icon={SettingsIcon}
            />

            <div className="grid grid-cols-1 gap-8">

                {/* PROFILE SECTION */}
                <div className="card-premium p-10 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-taguig-navy"></div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic mb-8 flex items-center">
                        <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg mr-4">
                            <User className="text-taguig-navy dark:text-taguig-gold" size={24} />
                        </div>
                        Public Profile
                    </h2>
                    <form onSubmit={handleUpdateProfile} className="space-y-8">

                        {/* AVATAR UPLOAD */}
                        <div className="flex flex-col items-center">
                            <div className="relative group cursor-pointer" onClick={handlePhotoAction}>
                                <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg bg-slate-50 dark:bg-white/5 relative">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" key={imagePreview} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <User size={80} />
                                        </div>
                                    )}
                                    {profileLoading && (
                                        <div className="absolute inset-0 bg-taguig-navy/40 backdrop-blur-sm flex items-center justify-center">
                                            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-taguig-navy/0 group-hover:bg-taguig-navy/20 transition-all flex items-center justify-center">
                                        <CameraIcon size={32} className="text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all" />
                                    </div>
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-taguig-navy text-white p-4 rounded-2xl shadow-xl border-4 border-white dark:border-slate-900 transition-transform group-hover:scale-110">
                                    <CameraIcon size={20} />
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-[0.2em] mt-6">Change Official Portrait</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label htmlFor="fullName" className="text-[10px] font-black text-slate-400 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 mb-2 block">Full Name</label>
                                <div className="relative">
                                    <input
                                        id="fullName"
                                        type="text"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-taguig-navy/10 outline-none text-slate-800 dark:text-white transition-all font-bold placeholder:text-slate-400"
                                        placeholder="Officer Name"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="badgeNumber" className="text-[10px] font-black text-slate-400 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 mb-2 block">Badge Number</label>
                                <div className="relative">
                                    <input
                                        id="badgeNumber"
                                        readOnly
                                        type="text"
                                        value={badgeNumber}
                                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 outline-none text-slate-400 dark:text-slate-500 font-black tracking-widest transition-all cursor-not-allowed uppercase"
                                        placeholder="BB-202X-XXX"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={profileLoading}
                                className="px-10 py-5 bg-taguig-navy text-white rounded-[2rem] font-black uppercase tracking-widest text-sm hover:bg-taguig-blue hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-taguig-navy/20 flex items-center space-x-3"
                            >
                                {profileLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Saving Changes...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        <span>Update Profile</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* MFA / 2FA SECTION */}
                    <div className="card-premium p-10 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-taguig-gold"></div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic mb-8 flex items-center">
                            <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg mr-4">
                                <Smartphone className="text-taguig-navy dark:text-taguig-gold" size={24} />
                            </div>
                            Identity Security
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
                                        className="w-full py-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem] flex flex-col items-center justify-center space-y-4 text-slate-400 font-black uppercase tracking-widest hover:border-taguig-gold hover:text-taguig-gold hover:bg-taguig-gold/5 transition-all group"
                                    >
                                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl group-hover:bg-taguig-gold/10 transition-colors">
                                            <QrCode size={32} />
                                        </div>
                                        <span className="text-xs">Setup Multi-Factor Auth</span>
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
                                        <label htmlFor="verifyCode" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Verify Code</label>
                                        <div className="flex space-x-2">
                                            <input
                                                id="verifyCode"
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
                    <div className="card-premium p-10 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-taguig-red"></div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic mb-8 flex items-center">
                            <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg mr-4">
                                <Lock className="text-taguig-red" size={24} />
                            </div>
                            Access Credentials
                        </h2>
                        <form onSubmit={handleUpdateSecurity} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-taguig-red/10 outline-none text-slate-800 dark:text-white font-medium"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="oldPassword" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">Current Password (Required)</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 text-taguig-red" size={18} />
                                    <input
                                        id="oldPassword"
                                        type="password"
                                        required
                                        value={oldPassword}
                                        onChange={e => setOldPassword(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-taguig-red/30 dark:border-taguig-red/20 rounded-xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-taguig-red/10 outline-none text-slate-800 dark:text-white font-medium"
                                        placeholder="Verify current password"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="newPassword" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 ml-1">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                    <input
                                        id="newPassword"
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-taguig-red/10 outline-none text-slate-800 dark:text-white font-medium"
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
                                    className="w-full bg-taguig-navy text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-taguig-red hover:shadow-taguig-red/20 transition-all shadow-xl flex items-center justify-center space-x-3 border border-white/10"
                                >
                                    {securityLoading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Verifying...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ShieldAlert size={20} />
                                            <span>Update Security</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                </div>

                {/* ADMIN DATA MANAGEMENT (Developer / Captain Only) */}
                {(user?.role === 'developer' || user?.role === 'barangay_captain') && (
                    <div className="card-premium p-10 rounded-[2.5rem] shadow-sm border border-taguig-red/20 bg-taguig-red/[0.01] dark:bg-taguig-red/[0.03] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-taguig-red"></div>
                        <h2 className="text-xl font-black text-taguig-red uppercase tracking-tight italic mb-2 flex items-center">
                            <div className="p-2 bg-taguig-red/10 rounded-lg mr-4">
                                <Database size={24} />
                            </div>
                            System Data Governance
                        </h2>
                        <p className="text-[10px] text-taguig-red/60 font-black uppercase tracking-[0.2em] mb-10">
                            Authorized Personnel Only • Destructive Actions
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
                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2 transition-colors ${backupDownloaded
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

            {/* Step-up MFA Modal */}
            {showStepUpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden relative border border-white/20">
                        <div className="p-8">
                            <div className="flex flex-col items-center mb-6">
                                <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full mb-4">
                                    <ShieldAlert className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Verify Identity</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
                                    A second factor is required to update sensitive account information.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="stepUpCode" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 text-center">Enter 6-digit Code</label>
                                    <input
                                        id="stepUpCode"
                                        type="text"
                                        autoFocus
                                        maxLength={6}
                                        value={stepUpCode}
                                        onChange={e => setStepUpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 text-center text-3xl font-mono tracking-[0.5em] text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 outline-none"
                                        placeholder="000000"
                                    />
                                </div>

                                <button
                                    onClick={handleVerifyStepUp}
                                    disabled={stepUpLoading || stepUpCode.length < 6}
                                    className="w-full bg-purple-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all disabled:opacity-50"
                                >
                                    {stepUpLoading ? "Verifying..." : "Confirm & Update"}
                                </button>
                                <button
                                    onClick={() => { setShowStepUpModal(false); setSecurityLoading(false); setStepUpCode(''); }}
                                    className="w-full text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
};

export default Settings;
