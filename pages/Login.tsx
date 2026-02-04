import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, User, AlertTriangle } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 12) {
        setError('Security Policy: Password must be at least 12 characters.');
        return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 to-gray-900/10 pointer-events-none" />
      
      <div className="w-full max-w-md login-bg rounded-[2rem] p-8 sm:p-12 shadow-2xl border border-white/40 relative z-10 animate-fade-in-up">
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

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 ml-1">Secure Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/70 border border-gray-200 rounded-xl py-3 pl-11 pr-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                placeholder="Min. 12 characters"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white font-semibold py-4 rounded-xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying Credentials...' : 'Access System'}
          </button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
                Restricted System. Unauthorized access is punishable by law (Barangay Ordinance No. 2023-05).
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;