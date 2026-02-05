
import React from 'react';
import { LayoutDashboard, FileText, Shield, Users, LogOut, FileClock, Globe, Package, Settings, Archive, AlertOctagon, Video, Moon, Sun } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => location.pathname.startsWith(path);

  // Base items for everyone
  const navItems = [
    { icon: LayoutDashboard, label: t.dashboard, path: '/' },
    { icon: FileText, label: t.blotter, path: '/report' },
    { icon: Video, label: 'CCTV Request', path: '/cctv-request' },
    { icon: Package, label: t.resources, path: '/resources' },
    { icon: Archive, label: t.archives, path: '/archives' },
    { icon: AlertOctagon, label: t.restrictedList, path: '/restricted' },
    // Personnel/Roster accessible to all (Role logic inside)
    { 
        icon: Users, 
        label: user?.role === 'supervisor' ? t.personnel : 'Duty Roster', 
        path: '/users' 
    },
  ];

  // Admin/Supervisor only items
  if (user?.role === 'supervisor') {
      navItems.push({ icon: FileClock, label: t.auditLogs, path: '/audit-logs' });
  }

  // Settings for everyone (Added at the end)
  navItems.push({ icon: Settings, label: 'Settings', path: '/settings' });

  // --- DESKTOP SIDEBAR ---
  const DesktopSidebar = (
    <div className="hidden md:flex w-64 glass-sidebar h-screen fixed left-0 top-0 flex-col p-4 z-40 transition-all">
      {/* Branding */}
      <div className="flex items-center justify-start space-x-3 mb-10 px-2 mt-4">
        <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/50 flex-shrink-0">
           <Shield className="text-white w-6 h-6" />
        </div>
        <div>
            <span className="block font-bold text-slate-800 dark:text-white text-lg tracking-tight leading-none">Bantay Bayan</span>
            <span className="text-[10px] text-slate-500 dark:text-gray-400 font-medium tracking-widest uppercase">Internal System</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group ${
              (item.path === '/' ? location.pathname === '/' : isActive(item.path))
                ? 'bg-slate-900 text-white dark:bg-white/10 dark:text-white shadow-lg backdrop-blur-sm'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                 (item.path === '/' ? location.pathname === '/' : isActive(item.path)) 
                 ? 'text-blue-400' 
                 : 'text-slate-400 dark:text-gray-400 group-hover:text-inherit'}`}>
                <item.icon size={20} />
            </div>
            <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer Area */}
      <div className="mt-auto space-y-3 pt-6 border-t border-slate-200 dark:border-white/10">
         
         {/* Theme Toggle */}
         <div className="flex items-center justify-start px-2">
            <button 
                onClick={toggleTheme}
                className="flex items-center space-x-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full justify-start"
            >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
         </div>

         {/* Language Toggle */}
         <div className="flex items-center justify-start px-2">
            <button 
                onClick={() => setLanguage(language === 'en' ? 'fil' : 'en')}
                className="flex items-center space-x-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full justify-start"
            >
                <Globe size={14} />
                <span>{language === 'en' ? 'English' : 'Filipino'}</span>
                <span className="ml-auto opacity-50">{language.toUpperCase()}</span>
            </button>
         </div>

         <div className="flex items-center space-x-3 px-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-white flex-shrink-0">
                {user?.full_name.charAt(0)}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-slate-500 dark:text-gray-500 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
         </div>

         <button 
            onClick={logout}
            className="w-full flex items-center space-x-3 p-3 rounded-xl text-slate-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all group justify-start"
        >
            <div className="p-1.5 rounded-lg">
                <LogOut size={20} />
            </div>
            <span className="font-medium text-sm">{t.signOut}</span>
         </button>
      </div>
    </div>
  );

  // --- MOBILE BOTTOM NAV ---
  const MobileBottomNav = (
    <div className="md:hidden fixed bottom-0 left-0 w-full glass-panel border-t border-slate-200 dark:border-white/20 z-50 pb-safe">
      <nav className="flex items-center justify-between px-2 overflow-x-auto no-scrollbar py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center p-2 min-w-[64px] rounded-xl transition-all ${
              (item.path === '/' ? location.pathname === '/' : isActive(item.path))
                ? 'text-blue-600 bg-blue-50/50'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <item.icon size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium mt-1 truncate max-w-[60px]">{item.label}</span>
          </Link>
        ))}
        
        {/* Mobile Settings/Logout Combined */}
        <button 
            onClick={toggleTheme}
            className="flex flex-col items-center justify-center p-2 min-w-[60px] rounded-xl text-slate-400 hover:text-blue-500"
        >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span className="text-[10px] font-medium mt-1">Theme</span>
        </button>
        
        <button 
            onClick={logout}
            className="flex flex-col items-center justify-center p-2 min-w-[60px] rounded-xl text-slate-400 hover:text-red-500"
        >
            <LogOut size={20} />
            <span className="text-[10px] font-medium mt-1">Exit</span>
        </button>
      </nav>
    </div>
  );

  return (
    <>
      {DesktopSidebar}
      {MobileBottomNav}
    </>
  );
};

export default Sidebar;
