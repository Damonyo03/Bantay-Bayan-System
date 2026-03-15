
import React from 'react';
import { LayoutDashboard, FileText, Shield, Users, LogOut, FileClock, Globe, Package, Settings, Archive, AlertOctagon, Video, Moon, Sun, FileDown } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout, isHighLevelAdmin } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => location.pathname.startsWith(path);

  // Define permissions for roles
  const role = user?.role || 'guest';
  const isGuest = role === 'guest';
  const isResident = role === 'resident';
  const isBantayBayan = role === 'bantay_bayan';
  const isSupervisor = role === 'supervisor';
  const isStaff = isBantayBayan || isSupervisor || isHighLevelAdmin();

  const navItems = [
    { icon: LayoutDashboard, label: t.dashboard, path: '/', visible: !isGuest && !isResident },
    { icon: Globe, label: 'Landing Page', path: '/landing', visible: true }, // Hypothetical landing page or home
    { icon: FileText, label: t.blotter, path: '/report', visible: !isGuest },
    { icon: Video, label: 'CCTV Request', path: '/cctv-request', visible: !isGuest },
    { icon: Package, label: t.resources, path: '/resources', visible: !isGuest },
    { icon: Archive, label: t.archives, path: '/archives', visible: isStaff },
    { icon: AlertOctagon, label: t.restrictedList, path: '/restricted', visible: true },
    {
      icon: Users,
      label: isHighLevelAdmin() || isSupervisor ? t.personnel : 'Duty Roster',
      path: '/users',
      visible: isStaff || isResident
    },
    { icon: FileDown, label: 'Printable Forms', path: '/download-forms', visible: true },
    { icon: FileClock, label: t.auditLogs, path: '/audit-logs', visible: isHighLevelAdmin() },
    { icon: Settings, label: 'Settings', path: '/settings', visible: !isGuest },
  ].filter(item => item.visible);

  // --- DESKTOP SIDEBAR ---
  const DesktopSidebar = (
    <div className="hidden md:flex w-64 glass-sidebar h-screen fixed left-0 top-0 flex-col p-4 z-40">
      {/* Branding */}
      <div className="mb-8 px-1 mt-4">
        <div className="flex items-center justify-center mb-4 space-x-2">
          <img src="/taguig_seal.png" alt="Taguig Seal" className="w-10 h-10 object-contain filter drop-shadow-md" />
          <img src="/brgy_seal.png" alt="Brgy Seal" className="w-10 h-10 object-contain filter drop-shadow-md" />
          <img src="/logo.png" alt="Bantay Bayan Logo" className="w-12 h-12 object-contain filter drop-shadow-md" />
        </div>
        <div className="text-center">
          <span className="block font-bold text-taguig-blue dark:text-white text-[15px] tracking-tight leading-tight uppercase font-display">City of Taguig</span>
          <span className="text-[9px] text-taguig-red dark:text-taguig-gold font-black tracking-[0.15em] uppercase">Post Proper Northside</span>
        </div>
      </div>


      {/* Nav Links */}
      <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${(item.path === '/' ? location.pathname === '/' : isActive(item.path))
              ? 'nav-active text-white shadow-premium'
              : 'text-slate-600 dark:text-gray-400 hover:bg-taguig-blue/5 dark:hover:bg-white/5 hover:text-taguig-blue dark:hover:text-white'
              }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${(item.path === '/' ? location.pathname === '/' : isActive(item.path))
              ? 'text-white'
              : 'text-slate-400 dark:text-gray-400 group-hover:text-taguig-blue'}`}>
              <item.icon size={20} />
            </div>
            <span className="font-bold text-sm whitespace-nowrap tracking-tight">{item.label}</span>
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
          <div className="relative w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden">
            {user?.avatar_url ? (
              /* Key forces re-render when URL changes (timestamp update) */
              <img key={user.avatar_url} src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600 dark:text-white">
                {user?.full_name.charAt(0)}
              </div>
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-black text-slate-800 dark:text-white truncate tracking-tight">{user?.full_name}</p>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate uppercase tracking-widest">{user?.role?.replace('_', ' ')}</p>
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
      <nav className="flex items-center justify-between px-1 overflow-x-auto no-scrollbar py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center p-2 min-w-[70px] rounded-xl transition-all active:scale-95 ${(item.path === '/' ? location.pathname === '/' : isActive(item.path))
              ? 'text-taguig-blue bg-taguig-blue/5'
              : 'text-slate-500 dark:text-slate-400'
              }`}
          >
            <item.icon size={22} strokeWidth={2} />
            <span className="text-[10px] font-bold mt-1 truncate max-w-[60px]">{item.label}</span>
          </Link>
        ))}

        {/* Mobile Settings/Logout Combined */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center p-2 min-w-[64px] rounded-xl text-slate-400 hover:text-blue-500 active:scale-95"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          <span className="text-[10px] font-medium mt-1">Theme</span>
        </button>

        <button
          onClick={logout}
          className="flex flex-col items-center justify-center p-2 min-w-[64px] rounded-xl text-slate-400 hover:text-red-500 active:scale-95"
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
