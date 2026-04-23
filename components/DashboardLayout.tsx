import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // If the user is pending approval, show a restricted view
    if (user?.status === 'pending') {
        return (
            <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans antialiased">
                <main className="flex-1 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-premium border border-slate-200 dark:border-white/10 text-center animate-fade-in">
                        <div className="w-20 h-20 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600">
                            <Clock size={40} className="animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight mb-4">Application Pending</h2>
                        <p className="text-slate-600 dark:text-slate-400 font-medium mb-8">
                            Thank you for verifying your email! Your registration has been received and is now in the queue for administrator review.
                        </p>
                        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-6 mb-8 border border-slate-100 dark:border-white/5">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Next Steps</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold">
                                You will receive an email notification once your account has been approved or if further information is required.
                            </p>
                        </div>
                        <button 
                            onClick={() => logout()}
                            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                        >
                            Sign Out
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans antialiased selection:bg-taguig-gold/30 selection:text-taguig-navy">
            
            {/* Mobile Top Navigation (Sticky) */}
            <div className="md:hidden sticky top-0 left-0 right-0 z-[70] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-4 h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] flex items-center justify-between shadow-sm transform-gpu transition-all duration-300">
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-xl text-taguig-navy dark:text-white hover:bg-taguig-navy hover:text-white transition-all active:scale-95"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center space-x-2">
                        <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                        <span className="font-black text-taguig-navy dark:text-white text-xs tracking-tight uppercase leading-none">Bantay Bayan</span>
                    </div>
                </div>
                
                <div className="flex items-center space-x-2">
                    <div className="w-9 h-9 rounded-full bg-taguig-navy dark:bg-taguig-blue text-white flex items-center justify-center font-black text-sm shadow-md border-2 border-white dark:border-slate-800">
                        <SidebarTriggerAvatar />
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar Overlay/Drawer */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-[100] md:hidden animate-in fade-in duration-300">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    <div className="absolute top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-300 ease-out flex flex-col">
                        <Sidebar onClose={() => setIsSidebarOpen(false)} className="border-none" />
                    </div>
                </div>
            )}

            {/* Desktop Sidebar (Fixed) */}
            <div className="hidden md:flex flex-col w-64 fixed inset-y-0 border-r border-slate-200 dark:border-white/10 z-[60]">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div className="md:pl-64 flex-1 flex flex-col min-w-0 pb-[env(safe-area-inset-bottom)]">
                <main className="flex-1 p-4 md:p-8 lg:p-10 transition-all duration-300 min-w-0">
                    <div className="max-w-[1600px] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

// Small helper for the avatar in the trigger bar
const SidebarTriggerAvatar: React.FC = () => {
    const { user } = useAuth();
    return (
        <div className="w-full h-full flex items-center justify-center">
            {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
                <span>{user?.full_name.charAt(0)}</span>
            )}
        </div>
    );
};

export default DashboardLayout;
