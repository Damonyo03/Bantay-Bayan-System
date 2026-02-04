
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabaseService } from '../services/supabaseService';
import { Shield, Lock, User, AlertTriangle, ArrowRight, Smartphone, X, Mail } from 'lucide-react';

const Login: React.FC = () => {
  const { login, verifyLoginMFA } = useAuth();
  const [view, setView] = useState<'login' | 'mfa' | 'forgot'>('login');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // MFA State
  const [mfaCode, setMfaCode] = useState('');
  
  // Forgot Password State
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- HANDLERS ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result === 'mfa_required') {
          setView('mfa');
      }
      // If success, App.tsx router will handle the redirect based on user presence
    } catch (err: any) {
      setError(err.message || 'Failed to login');
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
          // Success handled by AuthContext updating user
      } catch (err: any) {
          setError(err.message || 'Invalid code');
          setIsLoading(false);
      }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);
      try {
          await supabaseService.resetPasswordForEmail(resetEmail);
          setResetSent(true);
      } catch (err: any) {
          setError(err.message || "Failed to send reset email");
      } finally {
          setIsLoading(false);
      }
  };

  // --- RENDERERS ---

  if (view === 'mfa') {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 to-gray-900/10 pointer-events-none" />
            <div className="w-full max-w-md login-bg rounded-[2rem] p-8 sm:p-12 shadow-2xl border border-white/40 relative z-10 animate-fade-in">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-blue-100 p-4 rounded-full shadow-inner mb-4">
                        <Smartphone className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h2>
                    <p className="text-gray-500 text-sm mt-1 text-center">
                        Enter the 6-digit code from your authenticator app to continue.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 text-red-700 text-sm">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleMfaVerify} className="space-y-6">
                    <div>
                         <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Authentication Code</label>
                         <input
                            type="text"
                            maxLength={6}
                            autoFocus
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full bg-white/70 border border-gray-200 rounded-xl py-4 px-4 text-center text-2xl font-mono tracking-[0.5em] text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-300"
                            placeholder="000000"
                         />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || mfaCode.length < 6}
                        className="w-full bg-slate-900 text-white font-semibold py-4 rounded-xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Verifying...' : 'Verify Login'}
                    </button>
                    <button 
                        type="button"
                        onClick={() => setView('login')}
                        className="w-full text-sm text-slate-500 hover:text-slate-800 py-2"
                    >
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 to-gray-900/10 pointer-events-none" />
      
      {/* Login Card */}
      <div className="w-full max-w-md login-bg rounded-[2rem] p-8 sm:p-12 shadow-2xl border border-white/40 relative z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-blue-700 to-slate-800 p-4 rounded-2xl shadow-lg mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight text-center">Bantay Bayan Internal</h1>
          <p className="text-gray-500 text-sm mt-1 text-center">Authorized Personnel Only</p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 text-red-700 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Official Email</label>
            <div className="relative">
              <User className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/70 border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                placeholder="officer@bantaybayan.gov.ph"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 ml-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Secure Password</label>
                <button 
                    type="button" 
                    onClick={() => setView('forgot')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                    Forgot?
                </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/70 border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                placeholder="Password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white font-semibold py-4 rounded-xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? <span>Verifying...</span> : (
                <>
                    <span>Access System</span>
                    <ArrowRight size={18} />
                </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
                Restricted System. Unauthorized access is punishable by law (Barangay Ordinance No. 2023-05).
            </p>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {view === 'forgot' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
                  <button onClick={() => setView('login')} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                      <X size={18} className="text-gray-600" />
                  </button>
                  
                  <div className="p-8">
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Reset Password</h3>
                      {!resetSent ? (
                        <>
                            <p className="text-sm text-gray-500 mb-6">Enter your official email address. We'll send you a link to create a new password.</p>
                            
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                                        <input 
                                            required
                                            type="email"
                                            className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
                                            value={resetEmail}
                                            onChange={e => setResetEmail(e.target.value)}
                                            placeholder="name@bantaybayan.gov.ph"
                                        />
                                    </div>
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg"
                                >
                                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>
                        </>
                      ) : (
                          <div className="text-center py-6">
                              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                                  <Mail size={32} />
                              </div>
                              <h4 className="font-bold text-gray-800 mb-2">Check your inbox</h4>
                              <p className="text-sm text-gray-500 mb-6">We've sent a password reset link to <span className="font-semibold text-gray-700">{resetEmail}</span>.</p>
                              <button 
                                onClick={() => setView('login')}
                                className="text-blue-600 font-bold text-sm hover:underline"
                              >
                                  Back to Login
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
