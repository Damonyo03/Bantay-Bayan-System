
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { UserProfile } from './types';
import Sidebar from './components/Sidebar';
import CommandCenter from './pages/CommandCenter';
import IncidentForm from './pages/IncidentForm';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';
import ResourceTracking from './pages/ResourceTracking';
import ResourceForm from './pages/ResourceForm';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ResolvedCases from './pages/ResolvedCases';
import RestrictedPersons from './pages/RestrictedPersons';
import CCTVRequestForm from './pages/CCTVRequestForm';
import SystemGuidelines from './pages/SystemGuidelines';
import DownloadForms from './pages/DownloadForms';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { authService } from './services/authService';
import { supabase } from './lib/supabaseClient';
import { Lock, Save } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode, check?: (user: UserProfile) => boolean }> = ({ children, check }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div></div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (check && !check(user)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

const UpdatePasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [stepUpCode, setStepUpCode] = useState('');
    const [showStepUpModal, setShowStepUpModal] = useState(false);
    const [stepUpLoading, setStepUpLoading] = useState(false);

    React.useEffect(() => {
        let isMounted = true;
        let hasInitialized = false;
        const toastShownKey = 'auth_error_shown';

        // 1. Listen for Supabase's automatic detection
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
            if (!isMounted) return;

            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                hasInitialized = true;
                setIsInitializing(false);
            }
        });

        // 2. Manual manual check for HashRouter "double hash" issue (#/path#tokens)
        const checkManualSession = async () => {
            if (!isMounted || hasInitialized) return;

            const hash = window.location.hash;
            if (hash.includes('#access_token=')) {
                const fragment = hash.split('#').pop();
                const params = new URLSearchParams(fragment || '');
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    if (!error) {
                        hasInitialized = true;
                        setIsInitializing(false);
                        // Optional: clean up the hash
                        window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/update-password');
                    }
                }
            }

            // Also check current session immediately in case it's already there
            const { data: { session } } = await authService.getSession();
            if (session && isMounted) {
                hasInitialized = true;
                setIsInitializing(false);
            }
        };

        checkManualSession();

        // 3. Fallback timeout
        const timeout = setTimeout(() => {
            if (!isMounted || hasInitialized) return;

            if (!sessionStorage.getItem(toastShownKey)) {
                showToast("Auth session missing! Please request a new reset link.", "error");
                sessionStorage.setItem(toastShownKey, 'true');
            }
            setIsInitializing(false);
        }, 8000); // 8s fallback

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
            sessionStorage.removeItem(toastShownKey);
        };
    }, []);

    const handleUpdate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!password) return;

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
            showToast("Password updated successfully", "success");
            navigate('/login');
        } catch (error: any) {
            showToast(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyStepUp = async () => {
        if (!stepUpCode || stepUpCode.length < 6) return;
        setStepUpLoading(true);
        try {
            await authService.challengeMFA(stepUpCode);
            // After successful challenge, the session is now AAL2
            await handleUpdate();
            setShowStepUpModal(false);
            setStepUpCode('');
        } catch (error: any) {
            showToast("Invalid code: " + error.message, "error");
        } finally {
            setStepUpLoading(false);
        }
    };

    if (isInitializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white/90 backdrop-blur-2xl border border-white rounded-[2.5rem] p-8 sm:p-12 shadow-premium relative animate-fade-in">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-taguig-blue/10 p-4 rounded-full mb-4">
                        <Lock className="w-8 h-8 text-taguig-blue" />
                    </div>
                    <h2 className="text-3xl font-bold text-taguig-blue font-display uppercase tracking-tight">Access Recovery</h2>
                    <p className="text-sm text-slate-500 mt-2 text-center">Set a secure new password for your account.</p>
                </div>
                <form onSubmit={handleUpdate} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">New Security Key</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-4 text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-taguig-blue/10 focus:border-taguig-blue/50 transition-all focus:bg-white"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-taguig-blue text-white font-bold py-4 rounded-2xl shadow-lg shadow-taguig-blue/20 hover:bg-taguig-navy transition-all flex items-center justify-center space-x-2"
                    >
                        {loading ? "Processing..." : "Authorize Update"}
                    </button>
                </form>
            </div>

            {showStepUpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden relative border border-white/20">
                        <div className="p-8">
                            <div className="flex flex-col items-center mb-6">
                                <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-full mb-4">
                                    <Lock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Verify Identity</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
                                    MFA is required to finalize your password update.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 text-center">Enter 6-digit Code</label>
                                    <input
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
                                    onClick={() => { setShowStepUpModal(false); setLoading(false); setStepUpCode(''); }}
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

const PrivateLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-taguig-blue/20 selection:text-taguig-blue overflow-x-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 pb-24 md:pb-8 ml-0 md:ml-64 transition-all duration-300 pt-safe">
                    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

const AppContent: React.FC = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            
            {/* Protected Routes encapsulated in PrivateLayout */}
            <Route path="/*" element={
                <ProtectedRoute>
                    <PrivateLayout>
                        <Routes>
                            <Route path="/" element={<CommandCenter />} />
                            <Route path="/report" element={<ProtectedRoute check={u => u.role !== 'guest'}><IncidentForm /></ProtectedRoute>} />
                            <Route path="/cctv-request" element={<ProtectedRoute check={u => u.role !== 'guest'}><CCTVRequestForm /></ProtectedRoute>} />
                            <Route path="/resources" element={<ProtectedRoute check={u => u.role !== 'guest' && u.role !== 'resident'}><ResourceTracking /></ProtectedRoute>} />
                            <Route path="/resources/new" element={<ProtectedRoute check={u => u.role !== 'guest' && u.role !== 'resident'}><ResourceForm /></ProtectedRoute>} />
                            <Route path="/archives" element={<ProtectedRoute check={u => ['barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan'].includes(u.role)}><ResolvedCases /></ProtectedRoute>} />
                            <Route path="/restricted" element={<RestrictedPersons />} />
                            <Route path="/users" element={<ProtectedRoute check={u => ['barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan', 'resident'].includes(u.role)}><UserManagement /></ProtectedRoute>} />
                            <Route path="/audit-logs" element={<ProtectedRoute check={u => ['barangay_captain', 'barangay_secretary', 'barangay_kagawad'].includes(u.role)}><AuditLogs /></ProtectedRoute>} />
                            <Route path="/guidelines" element={<SystemGuidelines />} />
                            <Route path="/download-forms" element={<DownloadForms />} />
                            <Route path="/settings" element={<ProtectedRoute check={u => u.role !== 'guest'}><Settings /></ProtectedRoute>} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </PrivateLayout>
                </ProtectedRoute>
            } />
        </Routes>
    );
}

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <ToastProvider>
                    <AuthProvider>
                        <Router>
                            <AppContent />
                        </Router>
                    </AuthProvider>
                </ToastProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
};

export default App;
