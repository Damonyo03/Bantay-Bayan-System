
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
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
    ChevronDown,
    FileCheck
} from 'lucide-react';

import { Link } from 'react-router-dom';

const Login: React.FC = () => {
    const { login, verifyLoginMFA } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { t } = useLanguage();
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
        role: '' as UserRole | '',
        area: '',
        otherArea: '',
        address: '',
        contactInfo: ''
    });
    const [regStep, setRegStep] = useState<1 | 2 | 3>(1);

    const [showRegPassword, setShowRegPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [regSuccess, setRegSuccess] = useState(false);
    const [idFile, setIdFile] = useState<File | null>(null);
    const [idPreview, setIdPreview] = useState<string | null>(null);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline'>('checking');

    // Check DB Connection on mount
    React.useEffect(() => {
        const checkConnection = async () => {
            try {
                // Try a simple ping to a public table or just check session
                const { error } = await supabase.from('profiles').select('id').limit(1);
                if (error && error.code !== 'PGRST116') { // PGRST116 is just "no rows", which is fine
                    console.error("DB Connection Error:", error);
                    setDbStatus('offline');
                } else {
                    setDbStatus('online');
                }
            } catch (err) {
                console.error("DB Check Failed:", err);
                setDbStatus('offline');
            }
        };
        checkConnection();
    }, []);

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
                let { data } = await supabase.from('profiles').select('email').eq('email', input).maybeSingle();
                if (!data) {
                    const { data: appData } = await supabase.from('registration_applications').select('email').eq('email', input).maybeSingle();
                    data = appData;
                }
                if (!data) throw new Error("No account found with this email.");
                emailToUse = data.email;
            } else {
                let { data } = await supabase.from('profiles').select('email').eq('username', input).maybeSingle();
                if (!data) {
                    const { data: appData } = await supabase.from('registration_applications').select('email').eq('username', input).maybeSingle();
                    data = appData;
                }
                if (!data) throw new Error("No account found with this username.");
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
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(regForm.email)) {
            setError("Please enter a valid and existing email address.");
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
                regForm.role as string,
                idFile || undefined,
                {
                    area: regForm.area === 'OTHERS' ? regForm.otherArea : regForm.area,
                    address: regForm.address,
                    contactInfo: regForm.contactInfo
                }
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
            <ViewContainer title="Security Check" subtitle="Two-Factor Authentication" icon={Fingerprint} dbStatus={dbStatus}>
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
                        {isLoading ? 'Verifying...' : t.signIn}
                    </button>
                    <button type="button" onClick={() => setView('login')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Back to Credentials</button>
                </form>
            </ViewContainer>
        );
    }

    if (view === 'register') {
        const AREAS = ['VICINITY', 'CENTENNIAL', 'DREAMLAND', 'JAILSIDE', 'BANLIC', 'GOLF', 'KATIPUNAN', 'OTHERS'];

        return (
            <ViewContainer title={t.joinSystem} subtitle={`Step ${regStep} of 3`} icon={UserPlus} dbStatus={dbStatus}>
                {regSuccess ? (
                    <div className="text-center space-y-6 py-4 animate-slide-up">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
                            <CheckCircle size={40} />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic">Application Submitted</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium px-4">
                                Thank you for signing up! We've sent a confirmation link to <strong>{regForm.email}</strong>.
                            </p>
                            <div className="p-4 bg-taguig-blue/5 dark:bg-taguig-gold/5 rounded-2xl border border-taguig-blue/10">
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">What's Next?</p>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1 uppercase">
                                    Once you confirm your email, our administrators will review your application. You will receive another email once your account is approved or rejected.
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setView('login')} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]">Return to Login</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {error && <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium transition-all">{error}</div>}
                        
                        {/* Step 1: Role Selection */}
                        {regStep === 1 && (
                            <div className="space-y-6 animate-slide-up">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">What role are you applying for?</label>
                                    <div className="grid grid-cols-1 gap-4">
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setRegForm({ ...regForm, role: 'resident' });
                                                setRegStep(2);
                                            }}
                                            className={`p-6 rounded-3xl border-2 text-left transition-all flex items-center justify-between group ${regForm.role === 'resident' ? 'border-taguig-blue bg-taguig-blue/5' : 'border-slate-100 dark:border-white/5 hover:border-taguig-blue/30'}`}
                                        >
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white uppercase italic">Regular Citizen</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verified Resident of Northside Terminal</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-taguig-blue group-hover:text-white transition-all">
                                                <User size={20} />
                                            </div>
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setRegForm({ ...regForm, role: 'bantay_bayan' });
                                                setRegStep(2);
                                            }}
                                            className={`p-6 rounded-3xl border-2 text-left transition-all flex items-center justify-between group ${regForm.role === 'bantay_bayan' ? 'border-taguig-blue bg-taguig-blue/5' : 'border-slate-100 dark:border-white/5 hover:border-taguig-blue/30'}`}
                                        >
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white uppercase italic">Bantay Bayan</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Security & Peacekeeping Officer</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-taguig-blue group-hover:text-white transition-all">
                                                <Shield size={20} />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                                <button onClick={() => setView('login')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 py-2">Cancel Registration</button>
                            </div>
                        )}

                        {/* Step 2: Personal Information */}
                        {regStep === 2 && (
                            <div className="space-y-4 animate-slide-up">
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

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={regForm.email}
                                        onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                        placeholder="juan@email.com"
                                    />
                                </div>

                                {regForm.role === 'resident' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Area / Vicinity</label>
                                            <div className="relative group">
                                                <select 
                                                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all appearance-none cursor-pointer"
                                                    value={regForm.area}
                                                    onChange={e => setRegForm({ ...regForm, area: e.target.value })}
                                                    required
                                                >
                                                    <option value="" disabled className="dark:bg-slate-900">Select Area</option>
                                                    {AREAS.map(a => (
                                                        <option key={a} value={a} className="dark:bg-slate-900">{a}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-taguig-blue transition-colors" size={18} />
                                            </div>
                                        </div>

                                        {regForm.area === 'OTHERS' && (
                                            <div className="space-y-2 animate-slide-up">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Please specify Area</label>
                                                <input
                                                    required
                                                    value={regForm.otherArea}
                                                    onChange={e => setRegForm({ ...regForm, otherArea: e.target.value })}
                                                    className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                                    placeholder="Specify your location"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Address</label>
                                            <textarea
                                                required
                                                value={regForm.address}
                                                onChange={e => setRegForm({ ...regForm, address: e.target.value })}
                                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all min-h-[100px]"
                                                placeholder="Street, Block, Lot, etc."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Information</label>
                                            <input
                                                required
                                                value={regForm.contactInfo}
                                                onChange={e => setRegForm({ ...regForm, contactInfo: e.target.value })}
                                                className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                                placeholder="Phone or Mobile Number"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button onClick={() => setRegStep(1)} className="py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Back</button>
                                    <button 
                                        onClick={() => {
                                            if (!regForm.fullName || !regForm.email) {
                                                setError("Please fill in required fields.");
                                                return;
                                            }
                                            if (regForm.role === 'resident' && (!regForm.area || !regForm.address || !regForm.contactInfo)) {
                                                setError("Please fill in all citizen details.");
                                                return;
                                            }
                                            setError('');
                                            setRegStep(3);
                                        }} 
                                        className="bg-taguig-blue text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]"
                                    >
                                        Next Step
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Account Credentials & ID */}
                        {regStep === 3 && (
                            <form onSubmit={handleRegister} className="space-y-5 animate-slide-up">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.username}</label>
                                    <input
                                        required
                                        value={regForm.username}
                                        onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                                        className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                        placeholder="Choose a username"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.password}</label>
                                    <div className="relative">
                                        <input
                                            type={showRegPassword ? "text" : "password"}
                                            required
                                            value={regForm.password}
                                            onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                                            className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 pr-12 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                            placeholder="Create password"
                                        />
                                        <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-taguig-blue transition-colors">
                                            {showRegPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            value={regForm.confirmPassword}
                                            onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                                            className="w-full bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-5 pr-12 text-slate-900 dark:text-white font-semibold outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all"
                                            placeholder="Repeat password"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-taguig-blue transition-colors">
                                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valid ID Document</label>
                                    {!idPreview ? (
                                        <label className="flex flex-col items-center justify-center w-full h-32 bg-slate-100 dark:bg-black/20 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer hover:bg-slate-200 transition-all">
                                            <FileCheck className="text-slate-400 mb-2" size={24} />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Click to upload ID photo</p>
                                            <input type="file" className="hidden" accept="image/*" required onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setIdFile(file);
                                                    setIdPreview(URL.createObjectURL(file));
                                                }
                                            }} />
                                        </label>
                                    ) : (
                                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-32 group">
                                            <img src={idPreview} alt="ID Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                <button type="button" onClick={() => { setIdFile(null); setIdPreview(null); }} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors">
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    <button type="button" onClick={() => setRegStep(2)} className="py-4 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Back</button>
                                    <button 
                                        type="submit"
                                        disabled={isLoading}
                                        className="bg-taguig-blue text-white font-black py-4 rounded-2xl shadow-xl shadow-taguig-blue/20 hover:bg-taguig-navy transition-all uppercase tracking-widest text-[10px]"
                                    >
                                        {isLoading ? 'Processing...' : 'Complete Signup'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </ViewContainer>
        );
    }

    if (view === 'forgot') {
        return (
            <ViewContainer title="Access Recovery" subtitle="Identify Account" icon={Search} dbStatus={dbStatus}>
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
        <ViewContainer title="Bantay Bayan" subtitle="Post Proper Northside Terminal" dbStatus={dbStatus}>
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
                                placeholder={t.username + " or " + t.email}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.password}</label>
                            <button type="button" onClick={() => setView('forgot')} className="text-[10px] font-black text-taguig-blue hover:underline uppercase tracking-widest">{t.forgotPassword}</button>
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
                    <span className="uppercase tracking-[0.2em] text-xs">{isLoading ? 'Authenticating...' : t.login}</span>
                    {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                </button>

                <div className="pt-4">
                    <button
                        onClick={() => setView('register')}
                        className="w-full py-4 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-center space-x-2"
                    >
                        <UserPlus size={16} />
                        <span>REGISTER / SIGN-UP</span>
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

const ViewContainer: React.FC<{ children: React.ReactNode, title: string, subtitle?: string, icon?: any, dbStatus: 'checking' | 'online' | 'offline' }> = ({ children, title, subtitle, icon: Icon, dbStatus }) => {
    const { theme, toggleTheme } = useTheme();
    
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
            <Background />
            <div className="w-full max-w-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-white dark:border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-premium relative z-10 transition-colors duration-500">
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
                    
                    {/* DB Status Indicator */}
                    <div className="mt-4 flex items-center space-x-2 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10 transition-all">
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                            dbStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                            dbStatus === 'offline' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                            'bg-slate-400'
                        }`} />
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            {dbStatus === 'online' ? 'System Online' : dbStatus === 'offline' ? 'System Offline' : 'Verifying Link...'}
                        </span>
                    </div>
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