
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../contexts/ThemeContext';
import { UserProfile, UserRole } from '../types';
import { 
    Shield, 
    Lock, 
    User, 
    AlertTriangle, 
    ArrowRight, 
    Smartphone, 
    X, 
    HelpCircle, 
    CheckCircle, 
    UserPlus, 
    Mail, 
    Fingerprint, 
    Loader2, 
    Send, 
    Search, 
    Eye, 
    EyeOff,
    ArrowLeft,
    Moon,
    Sun,
    ChevronDown
} from 'lucide-react';

import { Link } from 'react-router-dom';

const Login: React.FC = () => {
    const { login, verifyLoginMFA } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [view, setView] = useState<'login' | 'mfa' | 'forgot' | 'register'>('login');

    // Login State
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // MFA State
    const [mfaCode, setMfaCode] = useState('');

    // Forgot Password State
    const [resetIdentifier, setResetIdentifier] = useState('');
    const [foundEmail, setFoundEmail] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    // Register State
    const [regForm, setRegForm] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'guest' as UserRole
    });

    const [showRegPassword, setShowRegPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [regSuccess, setRegSuccess] = useState(false);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // --- HANDLERS ---

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const result = await login(identifier.trim(), password);
            if (result === 'mfa_required') {
                setView('mfa');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMfaVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await verifyLoginMFA(mfaCode);
        } catch (err: any) {
            setError(err.message || 'Invalid authentication code.');
            setIsLoading(false);
        }
    };

    const handleFindAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const input = resetIdentifier.trim();
        if (!input) return;
        setIsChecking(true);
        try {
            let emailToUse = '';
            if (input.includes('@')) {
                const { data, error: fetchError } = await supabase.from('profiles').select('email').eq('email', input).single();
                if (fetchError || !data) throw new Error("No account found with this email.");
                emailToUse = data.email;
            } else {
                const { data, error: fetchError } = await supabase.from('profiles').select('email').eq('username', input).single();
                if (fetchError || !data) throw new Error("No account found with this username.");
                emailToUse = data.email;
            }
            setFoundEmail(emailToUse);
        } catch (err: any) {
            setError(err.message || "Account not found.");
        } finally {
            setIsChecking(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!foundEmail) return;
        setError('');
        setIsLoading(true);
        try {
            await authService.resetPasswordForUser(foundEmail);
            setResetSent(true);
        } catch (err: any) {
            setError(err.message || "Unable to process request.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (regForm.password !== regForm.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        const pwdRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!pwdRegex.test(regForm.password)) {
            setError("Password too weak. Use 8+ chars, 1 Upper, 1 Special.");
            return;
        }
        setIsLoading(true);
        try {
            await authService.registerUser(
                regForm.email,
                regForm.username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                regForm.password,
                regForm.fullName,
                regForm.role
            );
            setRegSuccess(true);

        } catch (err: any) {
            setError(err.message || "Registration failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const closeForgotModal = () => {
        setView('login');
        setResetIdentifier('');
        setFoundEmail(null);
        setResetSent(false);
        setError('');
    };

    // --- RENDERERS ---
    // (Moved outside to prevent re-mounts on input change)

    if (view === 'mfa') {
        return (
            <ViewContainer title="Security Check" subtitle="Two-Factor Authentication" icon={Fingerprint}>
                <form onSubmit={handleMfaVerify} className="space-y-6">
                    {error && <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium">{error}</div>}
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Authentication Code</label>
                        <input
                            type="text"
                            maxLength={6}
                            autoFocus
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-5 px-4 text-center text-4xl font-mono tracking-[0.4em] text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all font-black"
                            placeholder="000000"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || mfaCode.length < 6}
                        className="w-full bg-taguig-blue text-white font-black py-4 rounded-2xl shadow-xl shadow-taguig-blue/20 hover:bg-taguig-navy transition-all disabled:opacity-50 uppercase tracking-widest text-xs"
                    >
                        {isLoading ? 'Verifying...' : 'Verify Identity'}
                    </button>
                    <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Back to Credentials</button>
                </form>
            </ViewContainer>
        );
    }

    if (view === 'register') {
        return (
            <ViewContainer title="Request Access" subtitle="Personnel Registration" icon={UserPlus}>
                {regSuccess ? (
                    <div className="text-center space-y-6 py-4 animate-slide-up">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
                            <CheckCircle size={40} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Registration Sent</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Your account is now pending administrative approval.</p>
                        </div>
                        <button onClick={() => setView('login')} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]">Return to Login</button>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-5">
                        {error && <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium transition-all">{error}</div>}
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                            <input
                                required
                                value={regForm.fullName}
                                onChange={e => setRegForm({ ...regForm, fullName: e.target.value })}
                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                placeholder="e.g. Juan S. Dela Cruz"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                                <input
                                    required
                                    value={regForm.username}
                                    onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                    placeholder="jdelacruz"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={regForm.email}
                                    onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                    placeholder="j@gov.ph"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                            <input
                                type="password"
                                required
                                value={regForm.password}
                                onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Applying as</label>
                            <div className="relative group">
                                <select 
                                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all appearance-none cursor-pointer"
                                    value={regForm.role}
                                    onChange={e => setRegForm({ ...regForm, role: e.target.value as UserRole })}
                                >
                                    <option value="guest" className="dark:bg-slate-900">Guest / Observer</option>
                                    <option value="resident" className="dark:bg-slate-900">Verified Resident</option>
                                    <option value="bantay_bayan" className="dark:bg-slate-900">Bantay Bayan Personnel</option>
                                    <option value="barangay_kagawad" className="dark:bg-slate-900">Barangay Kagawad</option>
                                    <option value="barangay_secretary" className="dark:bg-slate-900">Barangay Secretary</option>
                                    <option value="supervisor" className="dark:bg-slate-900">System Supervisor</option>
                                    <option value="barangay_captain" className="dark:bg-slate-900">Barangay Captain</option>
                                </select>
                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-taguig-blue transition-colors" size={18} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Identity Key</label>
                            <input
                                type="password"
                                required
                                value={regForm.confirmPassword}
                                onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                placeholder="Re-enter security key"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-taguig-blue text-white font-black py-4 rounded-2xl shadow-xl shadow-taguig-blue/20 hover:bg-taguig-navy transition-all uppercase tracking-widest text-[10px] mt-4"
                        >
                            {isLoading ? 'Processing...' : 'Submit Credentials'}
                        </button>
                    </form>
                )}
            </ViewContainer>
        );
    }

    if (view === 'forgot') {
        return (
            <ViewContainer title="Access Recovery" subtitle="Identify Account" icon={Search}>
                {!resetSent ? (
                    <form onSubmit={handleFindAccount} className="space-y-6">
                        {error && <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium">{error}</div>}
                        {!foundEmail ? (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium px-1">Enter your username or email to begin recovery.</p>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Identifier</label>
                                    <input
                                        required
                                        autoFocus
                                        value={resetIdentifier}
                                        onChange={e => setResetIdentifier(e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                        placeholder="Username or Email"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isChecking || !resetIdentifier}
                                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2"
                                >
                                    {isChecking ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                    <span>Locate Account</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-slide-up">
                                <div className="p-6 bg-taguig-blue/5 dark:bg-taguig-gold/5 rounded-[2rem] border border-taguig-blue/10 flex flex-col items-center text-center">
                                    <Mail className="text-taguig-blue dark:text-taguig-gold mb-3" size={24} />
                                    <p className="text-sm font-black text-slate-900 dark:text-white break-all">{foundEmail}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Found linked account</p>
                                </div>
                                <div className="space-y-3">
                                    <button
                                        onClick={handleForgotPassword}
                                        disabled={isLoading}
                                        className="w-full bg-taguig-blue text-white font-black py-4 rounded-2xl shadow-xl shadow-taguig-blue/20 hover:bg-taguig-navy transition-all uppercase tracking-widest text-[10px]"
                                    >
                                        {isLoading ? 'Sending...' : 'Request Reset Link'}
                                    </button>
                                    <button onClick={() => setFoundEmail(null)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Not your account? Search again</button>
                                </div>
                            </div>
                        )}
                    </form>
                ) : (
                    <div className="text-center space-y-6 py-4 animate-slide-up">
                        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                            <Mail size={32} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Check Your Inbox</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Security instructions have been sent to {foundEmail}</p>
                        </div>
                        <button onClick={closeForgotModal} className="w-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]">Back to Sign In</button>
                    </div>
                )}
            </ViewContainer>
        );
    }

    return (
        <ViewContainer title="Bantay Bayan" subtitle="Post Proper Northside Terminal">
            <form onSubmit={handleLogin} className="space-y-6">
                {error && <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium transition-all">{error}</div>}
                
                <div className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Terminal Credential</label>
                        <div className="relative group">
                            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-taguig-blue transition-colors" size={20} />
                            <input
                                required
                                value={identifier}
                                onChange={e => setIdentifier(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4.5 pl-14 pr-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                placeholder="Username or Email"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Security Key</label>
                            <button type="button" onClick={() => setView('forgot')} className="text-[10px] font-black text-taguig-blue hover:underline uppercase tracking-widest">Forgot?</button>
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-taguig-blue transition-colors" size={20} />
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4.5 pl-14 pr-14 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all font-password"
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-taguig-blue">
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-4 bg-taguig-blue text-white font-black py-5 rounded-2xl shadow-xl shadow-taguig-blue/20 hover:bg-taguig-navy hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center space-x-3 group"
                >
                    <span className="uppercase tracking-[0.2em] text-xs">{isLoading ? 'Authenticating...' : 'Establish Connection'}</span>
                    {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                </button>

                <div className="pt-4">
                    <button
                        onClick={() => setView('register')}
                        className="w-full py-4 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-center space-x-2"
                    >
                        <UserPlus size={16} />
                        <span>Request Personnel Membership</span>
                    </button>
                </div>
            </form>
        </ViewContainer>
    );
};

export default Login;

// --- SHARED UI COMPONENTS (Defined outside to prevent unmounts) ---

const Background: React.FC = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] bg-taguig-blue/10 dark:bg-taguig-blue/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[800px] h-[800px] bg-taguig-red/5 dark:bg-taguig-gold/5 rounded-full blur-[120px]" />
    </div>
);

const ViewContainer: React.FC<{ children: React.ReactNode, title: string, subtitle?: string, icon?: any }> = ({ children, title, subtitle, icon: Icon }) => {
    const { theme, toggleTheme } = useTheme();
    
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
            <Background />
            <div className="w-full max-w-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-white dark:border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-premium relative z-10 animate-fade-in transition-colors duration-500">
                <div className="flex flex-col items-center mb-10 text-center">
                    {Icon ? (
                        <div className="p-4 bg-taguig-blue/10 dark:bg-taguig-gold/10 rounded-2xl text-taguig-blue dark:text-taguig-gold mb-6 animate-pulse">
                            <Icon size={32} />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center space-x-3 mb-8">
                            <img src="/taguig_seal.png" alt="Taguig Seal" className="w-16 h-16 object-contain" />
                            <img src="/brgy_seal.png" alt="Brgy Seal" className="w-16 h-16 object-contain" />
                            <img src="/logo.png" alt="Bantay Bayan Logo" className="w-20 h-20 object-contain" />
                        </div>
                    )}
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">{title}</h1>
                    {subtitle && <p className="text-taguig-blue dark:text-taguig-gold text-[10px] font-black uppercase tracking-[0.2em] mt-2">{subtitle}</p>}
                </div>
                {children}
                
                <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <Link to="/" className="text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-taguig-blue uppercase tracking-widest flex items-center space-x-2 transition-colors">
                        <ArrowLeft size={14} />
                        <span>Public Portal</span>
                    </Link>
                    <button onClick={toggleTheme} className="text-slate-400 dark:text-slate-500 hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
};