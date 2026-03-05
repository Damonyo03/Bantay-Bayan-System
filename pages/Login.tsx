import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabaseClient';
// Added missing Search icon to the imports from lucide-react
import { Shield, Lock, User, AlertTriangle, ArrowRight, Smartphone, X, HelpCircle, CheckCircle, UserPlus, Mail, Fingerprint, Loader2, Send, Search, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
    const { login, verifyLoginMFA } = useAuth();
    const [view, setView] = useState<'login' | 'mfa' | 'forgot' | 'register'>('login');

    // Login State
    const [identifier, setIdentifier] = useState(''); // Can be username or email
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
        confirmPassword: ''
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
            // If success, App.tsx router will handle the redirect based on user presence
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Check your username and password.');
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
                // Input is an email
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('email', input)
                    .single();

                if (fetchError || !data) throw new Error("No account found with this email address.");
                emailToUse = data.email;
            } else {
                // Input is a username
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('email')
                    .eq('username', input)
                    .single();

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
            setError(err.message || "Unable to process request. Please contact your administrator.");
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

        // Password Complexity Check
        const pwdRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!pwdRegex.test(regForm.password)) {
            setError("Password must be 8+ chars, 1 Uppercase, 1 Number, 1 Special Char.");
            return;
        }

        setIsLoading(true);
        try {
            await authService.registerUser(
                regForm.email,
                regForm.username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                regForm.password,
                regForm.fullName
            );
            setRegSuccess(true);
        } catch (err: any) {
            setError(err.message || "Registration failed. Username or email might be taken.");
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

    if (view === 'mfa') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0f172a]">
                {/* Background Effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[100px]" />
                </div>

                <div className="w-full max-w-md bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] p-8 sm:p-12 shadow-2xl relative z-10 animate-fade-in text-white">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-blue-500/20 p-4 rounded-full border border-blue-400/30 mb-4 animate-pulse">
                            <Smartphone className="w-8 h-8 text-blue-300" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Security Check</h2>
                        <p className="text-gray-300 text-sm mt-2 text-center leading-relaxed">
                            Enter the 6-digit verification code from your authenticator app.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-start space-x-3 text-red-200 text-sm">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleMfaVerify} className="space-y-6">
                        <div>
                            <input
                                type="text"
                                maxLength={6}
                                autoFocus
                                value={mfaCode}
                                onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-black/30 border border-white/10 rounded-2xl py-5 px-4 text-center text-3xl font-mono tracking-[0.5em] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-600"
                                placeholder="000000"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || mfaCode.length < 6}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Verifying...' : 'Verify Access'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('login')}
                            className="w-full text-sm text-gray-400 hover:text-white py-2 transition-colors"
                        >
                            Back to Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- REGISTRATION MODAL ---
    if (view === 'register') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0f172a]">
                {/* Background Effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-green-600/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px]" />
                </div>

                <div className="w-full max-w-lg bg-white rounded-[2rem] p-8 sm:p-10 shadow-2xl relative z-10 animate-fade-in">
                    {regSuccess ? (
                        <div className="text-center py-10">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-green-200 shadow-xl animate-bounce">
                                <CheckCircle size={48} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">Account Created!</h2>
                            <p className="text-slate-600 mb-8 leading-relaxed px-4">
                                Your account has been successfully registered. <br />
                                <span className="font-bold text-slate-800">It is now pending approval.</span><br />
                                Please wait for an administrator to activate your access.
                            </p>
                            <button
                                onClick={() => { setView('login'); setRegSuccess(false); setRegForm({ fullName: '', username: '', email: '', password: '', confirmPassword: '' }); }}
                                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-colors"
                            >
                                Return to Login
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
                                <button onClick={() => setView('login')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                                    <X size={20} className="text-gray-600" />
                                </button>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 text-red-600 text-sm">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleRegister} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                                            value={regForm.fullName}
                                            onChange={e => setRegForm({ ...regForm, fullName: e.target.value })}
                                            placeholder="e.g. Juan Dela Cruz"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                                        <div className="relative">
                                            <Fingerprint className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                                                value={regForm.username}
                                                onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                                                placeholder="jdelacruz"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                            <input
                                                type="email"
                                                required
                                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                                                value={regForm.email}
                                                onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                                                placeholder="email@gov.ph"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-gray-100 my-2" />

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                        <input
                                            type={showRegPassword ? "text" : "password"}
                                            required
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-12 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                                            value={regForm.password}
                                            onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                                            placeholder="Min 8 chars, 1 Upper, 1 Special"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowRegPassword(!showRegPassword)}
                                            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm Password</label>
                                    <div className="relative">
                                        <CheckCircle className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-12 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                                            value={regForm.confirmPassword}
                                            onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                                            placeholder="Retype password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-lg transition-all mt-4"
                                >
                                    {isLoading ? "Registering..." : "Submit for Approval"}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // --- LOGIN VIEW ---
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-100">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] bg-taguig-blue/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[800px] h-[800px] bg-taguig-red/5 rounded-full blur-[120px]" />
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md bg-white/90 backdrop-blur-2xl border border-white rounded-[2.5rem] p-8 sm:p-12 shadow-premium relative z-10 animate-fade-in ring-1 ring-black/5">

                <div className="flex flex-col items-center mb-10">
                    <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-6 sm:mb-8 transform hover:scale-105 transition-transform duration-500 filter drop-shadow-2xl">
                        <img src="/taguig_seal.png" alt="Taguig Seal" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
                        <img src="/brgy_seal.png" alt="Brgy Seal" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
                        <img src="/logo.png" alt="Bantay Bayan Logo" className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-taguig-blue tracking-tight text-center font-display uppercase">Bantay Bayan</h1>
                    <p className="text-taguig-red text-[9px] sm:text-[11px] mt-2 text-center font-black tracking-[0.15em] sm:tracking-[0.25em] uppercase">Post Proper Northside</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-3 text-red-600 text-sm animate-fade-in">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1 group-focus-within:text-taguig-blue transition-colors">Credential Entry</label>
                        <div className="relative">
                            <User className="absolute left-4 top-4 text-slate-400 w-5 h-5 group-focus-within:text-taguig-blue transition-colors" />
                            <input
                                type="text"
                                required
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-taguig-blue/10 focus:border-taguig-blue/50 transition-all focus:bg-white"
                                placeholder="Username or Email"
                            />
                        </div>
                    </div>

                    <div className="group">
                        <div className="flex justify-between items-center mb-2 ml-1">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-taguig-blue transition-colors">Security Key</label>
                            <button
                                type="button"
                                onClick={() => setView('forgot')}
                                className="text-[10px] font-bold text-taguig-blue hover:underline uppercase tracking-wider transition-colors"
                            >
                                Recover Access
                            </button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-4 text-slate-400 w-5 h-5 group-focus-within:text-taguig-blue transition-colors" />
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-14 text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-taguig-blue/10 focus:border-taguig-blue/50 transition-all focus:bg-white"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-5 top-4 text-slate-400 hover:text-taguig-blue transition-colors focus:outline-none"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-4 bg-taguig-blue text-white font-bold py-4 rounded-2xl shadow-lg shadow-taguig-blue/20 hover:bg-taguig-navy hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                        {isLoading ? <span>Verifying...</span> : (
                            <>
                                <span className="uppercase tracking-widest text-sm">Secure Sign In</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 flex flex-col space-y-4">
                    <button
                        onClick={() => setView('register')}
                        className="w-full py-4 rounded-2xl border border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center justify-center space-x-2"
                    >
                        <UserPlus size={16} />
                        <span>Request Membership</span>
                    </button>
                </div>

                <div className="mt-8 text-center border-t border-slate-100 pt-6">
                    <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.3em]">
                        Taguig Unified Security System
                    </p>
                </div>
            </div>


            {/* FORGOT PASSWORD MODAL */}
            {view === 'forgot' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden relative">
                        <button onClick={closeForgotModal} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                            <X size={20} className="text-gray-600" />
                        </button>

                        <div className="p-8 sm:p-10">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Account Recovery</h3>

                            {!resetSent ? (
                                <>
                                    {!foundEmail ? (
                                        <>
                                            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                                                Enter your <span className="font-bold text-gray-700">Username</span> or <span className="font-bold text-gray-700">Official Email</span> to locate your account.
                                            </p>

                                            <form onSubmit={handleFindAccount} className="space-y-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Username / Email</label>
                                                    <div className="relative">
                                                        <User className="absolute left-4 top-3.5 text-slate-400" size={20} />
                                                        <input
                                                            required
                                                            autoFocus
                                                            type="text"
                                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-slate-800 font-medium"
                                                            value={resetIdentifier}
                                                            onChange={e => setResetIdentifier(e.target.value)}
                                                            placeholder="e.g. jdelacruz"
                                                        />
                                                    </div>
                                                </div>

                                                {error && (
                                                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-center">
                                                        <AlertTriangle size={14} className="mr-2 shrink-0" />
                                                        {error}
                                                    </div>
                                                )}

                                                <button
                                                    type="submit"
                                                    disabled={isChecking || !resetIdentifier}
                                                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-black shadow-lg transition-transform flex items-center justify-center space-x-2"
                                                >
                                                    {isChecking ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                                                    <span>Find My Account</span>
                                                </button>
                                            </form>
                                        </>
                                    ) : (
                                        <div className="animate-slide-up">
                                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8 text-center">
                                                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Account Found</p>
                                                <div className="flex items-center justify-center space-x-2 mb-2">
                                                    <Mail className="text-blue-500" size={20} />
                                                    <span className="text-lg font-bold text-slate-900 break-all">{foundEmail}</span>
                                                </div>
                                                <p className="text-sm text-blue-700">A reset link will be sent to this address.</p>
                                            </div>

                                            {error && (
                                                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-center animate-fade-in">
                                                    <AlertTriangle size={14} className="mr-2 shrink-0" />
                                                    {error}
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                <button
                                                    onClick={handleForgotPassword}
                                                    disabled={isLoading}
                                                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 shadow-lg flex items-center justify-center space-x-2"
                                                >
                                                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />}
                                                    <span>Send Reset Link</span>
                                                </button>
                                                <button
                                                    onClick={() => { setFoundEmail(null); setError(''); }}
                                                    className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                                                >
                                                    Not your account? Search again
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-6 animate-slide-up">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-green-200 shadow-lg">
                                        <CheckCircle size={40} />
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h4>
                                    <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                                        We have sent a secure password reset link to <br />
                                        <span className="font-bold text-slate-800">{foundEmail}</span>.
                                        Please follow the instructions in the email.
                                    </p>
                                    <button
                                        onClick={closeForgotModal}
                                        className="w-full bg-gray-100 text-gray-700 font-bold py-3.5 rounded-2xl hover:bg-gray-200 transition-colors"
                                    >
                                        Return to Login
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Login;