
import React from 'react';
import { LayoutDashboard, FileText, Shield, Users, LogOut, History, FileClock, Globe, Package, Settings } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const isActive = (path: string) => location.pathname.startsWith(path);

  // Base items for everyone
  const navItems = [
    { icon: LayoutDashboard, label: t.dashboard, path: '/' },
    { icon: FileText, label: t.blotter, path: '/report' },
    { icon: Package, label: t.resources, path: '/resources' },
  ];

  // Admin/Supervisor only items
  if (user?.role === 'supervisor') {
      navItems.push({ icon: Users, label: t.personnel, path: '/users' });
      navItems.push({ icon: FileClock, label: t.auditLogs, path: '/audit-logs' });
      navItems.push({ icon: Settings, label: 'Settings', path: '/settings' }); // Added Settings
  }

  return (
    <div className="w-20 md:w-64 glass-sidebar h-screen fixed left-0 top-0 flex flex-col p-4 z-40 transition-all">
      {/* Branding */}
      <div className="flex items-center justify-center md:justify-start space-x-3 mb-10 px-2 mt-4">
        <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-900/50">
           <Shield className="text-white w-6 h-6" />
        </div>
        <div className="hidden md:block">
            <span className="block font-bold text-white text-lg tracking-tight leading-none">Bantay Bayan</span>
            <span className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Internal System</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group ${
              (item.path === '/' ? location.pathname === '/' : isActive(item.path))
                ? 'bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/5'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${
                 (item.path === '/' ? location.pathname === '/' : isActive(item.path)) 
                 ? 'text-blue-400' 
                 : 'text-gray-400 group-hover:text-white'}`}>
                <item.icon size={20} />
            </div>
            <span className="hidden md:block font-medium text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer Area */}
      <div className="mt-auto space-y-4 pt-6 border-t border-white/10">
         
         {/* Language Toggle */}
         <div className="flex items-center justify-center md:justify-start px-2">
            <button 
                onClick={() => setLanguage(language === 'en' ? 'fil' : 'en')}
                className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full justify-center md:justify-start"
            >
                <Globe size={14} />
                <span className="hidden md:inline">{language === 'en' ? 'English' : 'Filipino'}</span>
                <span className="ml-auto opacity-50 hidden md:inline">{language.toUpperCase()}</span>
            </button>
         </div>

         <div className="hidden md:flex items-center space-x-3 px-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                {user?.full_name.charAt(0)}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
         </div>

         <button 
            onClick={logout}
            className="w-full flex items-center space-x-3 p-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all group"
        >
            <div className="p-1.5 rounded-lg">
                <LogOut size={20} />
            </div>
            <span className="hidden md:block font-medium text-sm">{t.signOut}</span>
         </button>
      </div>
    </div>
  );
};

export default Sidebar;
