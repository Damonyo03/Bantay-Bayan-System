import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Shield, 
  Users, 
  LogOut, 
  FileClock, 
  Globe, 
  Package, 
  Settings, 
  Archive, 
  AlertOctagon, 
  Video, 
  Moon, 
  Sun, 
  FileDown,
  X
} from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  onClose?: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose, className = "" }) => {
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
    { icon: LayoutDashboard, label: t.dashboard, path: '/dashboard', visible: !isGuest && !isResident },
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

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 p-4 transition-all duration-300 ${className}`}>
      {/* Mobile Close Button */}
      {onClose && (
        <button 
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
        >
          <X size={24} />
        </button>
      )}

      {/* Branding */}
      <div className="mb-8 px-1 mt-4">
        <div className="flex items-center justify-center mb-4 space-x-2">
          <img src="/taguig_seal.png" alt="Taguig Seal" className="w-10 h-10 object-contain filter drop-shadow-md" />
          <img src="/brgy_seal.png" alt="Brgy Seal" className="w-10 h-10 object-contain filter drop-shadow-md" />
          <img src="/logo.png" alt="Bantay Bayan Logo" className="w-12 h-12 object-contain filter drop-shadow-md" />
        </div>
        <div className="text-center">
          <span className="block font-black text-taguig-navy dark:text-white text-[15px] tracking-tight leading-tight uppercase font-display">City of Taguig</span>
          <span className="text-[9px] text-taguig-red dark:text-taguig-gold font-black tracking-[0.15em] uppercase">Post Proper Northside</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 group ${(item.path === '/' ? location.pathname === '/' : isActive(item.path))
              ? 'bg-taguig-navy text-white shadow-lg shadow-taguig-navy/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-taguig-navy dark:hover:text-white'
              }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${(item.path === '/' ? location.pathname === '/' : isActive(item.path))
              ? 'text-white'
              : 'text-slate-400 dark:text-slate-400 group-hover:text-taguig-navy'}`}>
              <item.icon size={20} />
            </div>
            <span className="font-bold text-sm whitespace-nowrap tracking-tight">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer Area */}
      <div className="mt-auto space-y-3 pt-6 border-t border-slate-200 dark:border-white/10">
        {/* User Info */}
        <div className="flex items-center space-x-3 px-3 mb-4">
          <div className="relative w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-200 dark:border-white/10">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-black text-slate-500 dark:text-white">
                {user?.full_name.charAt(0)}
              </div>
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-black text-slate-800 dark:text-white truncate tracking-tight">{user?.full_name}</p>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate uppercase tracking-widest">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="grid grid-cols-2 gap-2 px-2">
          <button
            onClick={toggleTheme}
            className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 rounded-xl transition-all"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span className="text-[9px] font-black uppercase mt-1">Theme</span>
          </button>
          <button
            onClick={() => setLanguage(language === 'en' ? 'fil' : 'en')}
            className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 rounded-xl transition-all"
          >
            <Globe size={18} />
            <span className="text-[9px] font-black uppercase mt-1">{language.toUpperCase()}</span>
          </button>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 p-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all group"
        >
          <div className="p-1.5 rounded-lg">
            <LogOut size={20} />
          </div>
          <span className="font-bold text-sm uppercase tracking-wider">{t.signOut}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
