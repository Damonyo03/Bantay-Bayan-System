import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Clock, LogOut, ShieldAlert, ArrowLeft } from 'lucide-react';

const PendingApproval: React.FC = () => {
    const { user, logout } = useAuth();
    const { theme } = useTheme();

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] bg-taguig-blue/10 dark:bg-taguig-blue/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[800px] h-[800px] bg-taguig-red/5 dark:bg-taguig-gold/5 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border border-white dark:border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-premium relative z-10 transition-colors duration-500 text-center">
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl text-amber-500 dark:text-amber-400 mb-6 animate-pulse">
                        <Clock size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Approval Pending</h1>
                    <p className="text-taguig-blue dark:text-taguig-gold text-[10px] font-black uppercase tracking-[0.2em] mt-2">Account Under Review</p>
                </div>

                <div className="space-y-4 mb-8">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Hello, <span className="font-bold text-slate-900 dark:text-white">{user?.full_name || 'User'}</span>! 
                        Your account registration is currently being reviewed by our barangay administrators.
                    </p>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl flex items-start space-x-3 text-left">
                        <ShieldAlert size={20} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">What happens next?</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                Please wait while we verify your submitted identity document. 
                                Once the admin approves your account, we will send an email notification to <strong>{user?.email}</strong>. 
                                You will then have full access to the application.
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl shadow-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center space-x-2"
                >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
};

export default PendingApproval;
