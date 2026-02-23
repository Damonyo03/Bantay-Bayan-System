
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  Shield, 
  History, 
  Package, 
  AlertTriangle,
  Camera,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Command Center' },
    { to: '/report', icon: <FileText size={20} />, label: 'Incident Report' },
    { to: '/cctv-request', icon: <Camera size={20} />, label: 'CCTV Request' },
    { to: '/resources', icon: <Package size={20} />, label: 'Resource Tracking' },
    { to: '/archives', icon: <History size={20} />, label: 'Resolved Cases' },
    { to: '/restricted', icon: <AlertTriangle size={20} />, label: 'Restricted Persons' },
    { to: '/users', icon: <Users size={20} />, label: 'Personnel' },
    { to: '/guidelines', icon: <BookOpen size={20} />, label: 'Guidelines' },
    { to: '/settings', icon: <SettingsIcon size={20} />, label: 'Settings' },
  ];

  if (user?.role === 'supervisor') {
    navItems.splice(8, 0, { to: '/audit-logs', icon: <Shield size={20} />, label: 'Audit Logs' });
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white hidden md:flex flex-col border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Shield size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Bantay Bayan</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wider">Northside Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user?.role?.replace('_', ' ') || 'Personnel'}</p>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
