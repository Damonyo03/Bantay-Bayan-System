import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LucideIcon, Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    icon?: LucideIcon;
    children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon: Icon, children }) => {
    const { user } = useAuth();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <>
            <header className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-6 border-b border-slate-200 dark:border-white/10 pb-8 mb-10 relative">
                <div className="flex-1 flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center space-x-3">
                            {Icon && <Icon className="w-6 h-6 md:w-10 md:h-10 text-taguig-navy dark:text-white shrink-0" />}
                            <h1 className="text-2xl md:text-5xl font-black text-taguig-navy dark:text-white tracking-tight font-display uppercase italic leading-none">
                                {title}
                            </h1>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mt-2 md:mt-4 text-[10px] md:text-lg font-bold max-w-2xl opacity-90 leading-relaxed font-sans">
                            {subtitle}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full xl:w-auto mt-4 md:mt-0">
                    {children && <div className="w-full xl:w-auto">{children}</div>}

                    <div className="hidden md:flex items-center space-x-4 bg-white dark:bg-slate-900 px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm w-full md:w-auto shrink-0 transition-all hover:shadow-md group">
                        <div className="w-12 h-12 rounded-full bg-taguig-navy text-white flex items-center justify-center font-black text-xl shadow-lg shadow-taguig-navy/20 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="animate-fade-in">{user?.full_name.charAt(0)}</span>
                            )}
                        </div>
                        <div className="overflow-hidden min-w-[140px]">
                            <p className="text-base font-black text-slate-800 dark:text-white leading-none truncate mb-1.5 tracking-tight uppercase italic">
                                {user?.full_name}
                            </p>
                            <p className="text-[10px] text-taguig-navy dark:text-taguig-gold font-black uppercase tracking-[0.2em] leading-none">
                                {user?.badge_number || user?.role?.replace('_', ' ')}
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Drawer Removed - Handled by DashboardLayout */}
        </>
    );
};

export default PageHeader;
