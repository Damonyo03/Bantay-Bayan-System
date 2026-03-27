import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased selection:bg-taguig-navy/20 selection:text-taguig-navy">
            
            {/* Mobile Top Navigation (Sticky) */}
            <div className="md:hidden sticky top-0 left-0 right-0 z-[70] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-4 h-16 flex items-center justify-between shadow-sm">
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
                        {/* Avatar will be handled by PageHeader or we can add a small one here */}
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
            <div className="md:pl-64 flex flex-col min-h-screen min-w-0">
                <main className="flex-1 p-4 md:p-8 lg:p-10 transition-all duration-300 min-w-0 overflow-x-hidden">
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
