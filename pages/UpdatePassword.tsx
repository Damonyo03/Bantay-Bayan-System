
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { authService } from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import { Lock, ShieldCheck, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';

const UpdatePassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const { showToast } = useToast();
    const navigate = useNavigate();

    // MFA State
    const [stepUpCode, setStepUpCode] = useState('');
    const [showStepUpModal, setShowStepUpModal] = useState(false);
    const [stepUpLoading, setStepUpLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let hasInitialized = false;

        const processSession = async (session: any) => {
            if (session && isMounted) {
                console.log("Recovery session established");
                hasInitialized = true;
                setIsInitializing(false);
                setAuthError(null);
            }
        };

        // 1. Listen for Supabase's automatic detection (Recovery link landing)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;
            console.log("Auth Event:", event);
            
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                await processSession(session);
            }
        });

        // 2. Manual check for cases where onAuthStateChange doesn't fire immediately
        // or for HashRouter "double hash" issues (#/path#tokens)
        const checkManualSession = async () => {
            if (!isMounted || hasInitialized) return;

            const hash = window.location.hash;
            if (hash.includes('access_token=')) {
                // Fragment might be after our path fragment in HashRouter
                // Example: #/update-password#access_token=...
                const hashParts = hash.split('#');
                const fragment = hashParts.find(p => p.startsWith('access_token=') || p.includes('&access_token='));
                
                if (fragment) {
                    const params = new URLSearchParams(fragment);
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken && refreshToken) {
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                        });
                        if (!error && data.session) {
                            await processSession(data.session);
                            // Clean up the hash to avoid re-triggering
                            window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/update-password');
                        } else if (error) {
                            setAuthError("Failed to authenticate with the provided link.");
                        }
                    }
                }
            }

            // Also check current session immediately in case it's already established
            const { data: { session } } = await authService.getSession();
            if (session && isMounted && !hasInitialized) {
                await processSession(session);
            }
        };

        checkManualSession();

        // 3. Robust timeout - if after 5 seconds we still aren't initialized, 
        // give the user a way to try manually or show an error
        const timer = setTimeout(() => {
            if (isMounted && !hasInitialized) {
                setIsInitializing(false);
                // We don't throw an error yet, we let them see if they can submit anyway 
                // (highly unlikely it works but better than a hang)
                // Actually, let's signal that the session might be missing.
            }
        }, 5000);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;
        
        if (password.length < 8) {
            showToast("Password must be at least 8 characters.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showToast("Passwords do not match.", "error");
            return;
        }

        const pwdRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!pwdRegex.test(password)) {
            showToast("Password too weak. Use 1 uppercase, 1 number, and 1 special character.", "error");
            return;
        }

        setLoading(true);
        try {
            // Check for AAL2 if MFA is enabled
            const { currentLevel, nextLevel } = await authService.getAssuranceLevel();
            if (nextLevel === 'aal2' && currentLevel === 'aal1') {
                setShowStepUpModal(true);
                setLoading(false);
                return;
            }

            await authService.updatePassword(password);
            showToast("Access key updated successfully.", "success");
            navigate('/login');
        } catch (error: any) {
            showToast(error.message || "Failed to update password.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyStepUp = async () => {
        if (!stepUpCode || stepUpCode.length < 6) return;
        setStepUpLoading(true);
        try {
            await authService.challengeMFA(stepUpCode);
            await handleUpdate({ preventDefault: () => {} } as any);
            setShowStepUpModal(false);
        } catch (error: any) {
            showToast("Invalid authentication code.", "error");
        } finally {
            setStepUpLoading(false);
        }
    };

    if (isInitializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center space-y-4">
                    <RefreshCw className="w-10 h-10 text-taguig-blue animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verifying Authorization Token...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
            {/* Aesthetic Background Elements */}
            <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-taguig-blue/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-taguig-gold/5 rounded-full blur-[100px]" />

            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-2xl relative z-10 animate-fade-in">
                <div className="flex flex-col items-center mb-10 text-center">
                    <div className="p-4 bg-taguig-blue/10 dark:bg-taguig-blue/5 rounded-2xl text-taguig-blue mb-6">
                        <ShieldCheck size={36} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Access Recovery</h1>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2 italic">Secure Terminal Override</p>
                </div>

                {authError ? (
                    <div className="space-y-6">
                        <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-[2rem] text-center">
                            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                            <p className="text-sm font-bold text-red-600 dark:text-red-400">{authError}</p>
                            <p className="text-xs text-red-500/70 mt-2">The link may have expired or was already used.</p>
                        </div>
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]"
                        >
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">New Security Key</label>
                                <div className="relative group">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-taguig-blue transition-colors" size={20} />
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4.5 pl-14 pr-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Confirm Security Key</label>
                                <div className="relative group">
                                    <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-taguig-blue transition-colors" size={20} />
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4.5 pl-14 pr-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all font-password"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-taguig-blue text-white font-black py-5 rounded-2xl shadow-xl shadow-taguig-blue/20 hover:bg-taguig-navy transition-all disabled:opacity-70 flex items-center justify-center space-x-3 group"
                        >
                            <span className="uppercase tracking-[0.2em] text-xs font-black italic">{loading ? 'Updating...' : 'Authorize Terminal Overwrite'}</span>
                            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>
                )}
            </div>

            {/* MFA Modal (Step-up auth if enabled) */}
            {showStepUpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-sm shadow-2xl overflow-hidden relative border border-white/10">
                        <div className="p-10">
                            <div className="flex flex-col items-center mb-8 text-center">
                                <div className="bg-purple-100 dark:bg-purple-900/20 p-4 rounded-full mb-4">
                                    <Lock size={32} className="text-purple-600" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Critical Verification</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic">MFA Step-up Required</p>
                            </div>

                            <div className="space-y-6">
                                <input
                                    type="text"
                                    maxLength={6}
                                    autoFocus
                                    value={stepUpCode}
                                    onChange={e => setStepUpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-5 text-center text-4xl font-mono tracking-[0.5em] text-slate-900 dark:text-white focus:ring-4 focus:ring-purple-500/10 outline-none"
                                    placeholder="000000"
                                />

                                <button
                                    onClick={handleVerifyStepUp}
                                    disabled={stepUpLoading || stepUpCode.length < 6}
                                    className="w-full bg-purple-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all flex items-center justify-center space-x-2"
                                >
                                    {stepUpLoading ? "Verifying..." : "Confirm Update"}
                                </button>
                                
                                <button 
                                    onClick={() => setShowStepUpModal(false)}
                                    className="w-full text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600"
                                >
                                    Abort Operation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UpdatePassword;
