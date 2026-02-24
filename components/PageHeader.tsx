import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    icon?: LucideIcon;
    children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon: Icon, children }) => {
    const { user } = useAuth();

    return (
        <header className="flex flex-col xl:flex-row xl:justify-between xl:items-end gap-6 border-b border-taguig-blue/10 dark:border-white/10 pb-8 mb-10">
            <div className="flex-1">
                <div className="flex items-center space-x-3">
                    {Icon && <Icon className="w-8 h-8 md:w-10 md:h-10 text-taguig-blue dark:text-white shrink-0" />}
                    <h1 className="text-3xl md:text-5xl font-black text-taguig-blue dark:text-white tracking-tight font-display uppercase italic leading-none">
                        {title}
                    </h1>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-4 text-sm md:text-lg font-bold max-w-2xl opacity-90">
                    {subtitle}
                </p>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6 w-full xl:w-auto">
                {children && <div className="w-full xl:w-auto">{children}</div>}

                <div className="flex items-center space-x-4 bg-white/40 dark:bg-black/20 px-6 py-4 rounded-[1.5rem] border border-white/60 dark:border-white/5 backdrop-blur-md shadow-inner w-full md:w-auto shrink-0 transition-all hover:border-taguig-blue/30 group">
                    <div className="w-12 h-12 rounded-full bg-taguig-blue text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-taguig-blue/30 overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="animate-fade-in">{user?.full_name.charAt(0)}</span>
                        )}
                    </div>
                    <div className="overflow-hidden min-w-[140px]">
                        <p className="text-base font-black text-slate-800 dark:text-white leading-none truncate mb-1.5 tracking-tight">
                            {user?.full_name}
                        </p>
                        <p className="text-[10px] text-taguig-blue dark:text-taguig-gold font-black uppercase tracking-[0.2em] leading-none">
                            {user?.badge_number || user?.role?.replace('_', ' ')}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default PageHeader;
