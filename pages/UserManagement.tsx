
import React, { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { UserProfile } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, Shield, UserCheck, UserX, Plus, X, Lock, User, Mail, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';

const UserManagement: React.FC = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
      email: '',
      password: '',
      fullName: '',
      role: 'field_operator',
      badgeNumber: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await supabaseService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const generateBadgeNumber = () => {
      const year = new Date().getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000); // 4 digit random
      return `BB-${year}-${random}`;
  };

  const handleOpenModal = () => {
      setNewUser({
          email: '',
          password: '',
          fullName: '',
          role: 'field_operator',
          badgeNumber: generateBadgeNumber() // Auto-generate on open
      });
      setIsModalOpen(true);
  };

  const handleRegenerateBadge = () => {
      setNewUser(prev => ({ ...prev, badgeNumber: generateBadgeNumber() }));
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      try {
        await supabaseService.updateUserStatus(id, newStatus);
        fetchUsers();
      } catch (error) {
        alert("Failed to update status");
      }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsCreating(true);
      try {
          await supabaseService.createUser(
              newUser.email,
              newUser.password,
              newUser.fullName,
              newUser.role,
              newUser.badgeNumber
          );
          alert("Account created successfully. Note: You may need to relogin as the session might have switched.");
          setIsModalOpen(false);
          fetchUsers();
      } catch (error: any) {
          alert("Error creating account: " + (error.message || "Unknown error"));
      } finally {
          setIsCreating(false);
      }
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center">
                <Shield className="mr-3 text-blue-700" />
                {t.managePersonnel}
            </h1>
            <p className="text-gray-500 mt-2">{t.manageAccess}</p>
        </div>
        <button 
            onClick={handleOpenModal}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-xl flex items-center space-x-2"
        >
            <Plus size={18} />
            <span>{t.addPersonnel}</span>
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>
      ) : (
        <>
        {users.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center border-dashed border-2 border-gray-300">
                <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Users size={32} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-700">No Personnel Found</h3>
                <p className="text-gray-500 mt-2 max-w-md mx-auto">The database appears to be empty. Start by adding a new personnel account using the button above.</p>
                <button 
                    onClick={handleOpenModal}
                    className="mt-6 text-blue-600 font-bold hover:underline"
                >
                    Create First User
                </button>
            </div>
        ) : (
            <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-white/50">
            <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                    <th className="p-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">{t.officer}</th>
                    <th className="p-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">{t.role}</th>
                    <th className="p-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">{t.badgeId}</th>
                    <th className="p-6 font-semibold text-gray-600 text-sm uppercase tracking-wider">{t.status}</th>
                    <th className="p-6 font-semibold text-gray-600 text-sm uppercase tracking-wider text-right">{t.actions}</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                    <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-6">
                        <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold">
                            {user.full_name.charAt(0)}
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900">{user.full_name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                        </div>
                    </td>
                    <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                            user.role === 'supervisor' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                            {user.role === 'supervisor' ? 'Official' : 'Field Operator'}
                        </span>
                    </td>
                    <td className="p-6 text-gray-600 font-mono text-sm">{user.badge_number}</td>
                    <td className="p-6">
                        <div className="flex items-center text-sm">
                            {user.status === 'active' ? (
                                <span className="flex items-center text-green-600 font-medium">
                                    <UserCheck size={16} className="mr-1.5" /> Active
                                </span>
                            ) : (
                                <span className="flex items-center text-gray-400 font-medium">
                                    <UserX size={16} className="mr-1.5" /> Inactive
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="p-6 text-right">
                        <button 
                            onClick={() => handleToggleStatus(user.id, user.status)}
                            className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
                                user.status === 'active' 
                                ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                        >
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}
        </>
      )}

      {/* CREATE USER MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
             <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
                 <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">{t.createAccount}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
                        <X size={18} />
                    </button>
                 </div>
                 <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.fullName}</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                required
                                type="text"
                                className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={newUser.fullName}
                                onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                                placeholder="e.g., Juan Dela Cruz"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.badgeId} (Auto-Generated)</label>
                        <div className="relative flex items-center">
                            <CreditCard className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                required
                                type="text"
                                className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-12 outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-600 font-mono font-bold"
                                value={newUser.badgeNumber}
                                readOnly
                            />
                            <button 
                                type="button"
                                onClick={handleRegenerateBadge}
                                className="absolute right-2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Regenerate Badge Number"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.role}</label>
                            <select 
                                className="w-full bg-gray-100 rounded-xl py-3 px-4 outline-none"
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value})}
                            >
                                <option value="field_operator">Field Operator</option>
                                <option value="supervisor">Supervisor / Official</option>
                            </select>
                         </div>
                    </div>
                    <hr className="border-gray-100" />
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.email}</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                required
                                type="email"
                                className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={newUser.email}
                                onChange={e => setNewUser({...newUser, email: e.target.value})}
                                placeholder="official@bantaybayan.gov.ph"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t.password}</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input 
                                required
                                type="password"
                                className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={newUser.password}
                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                placeholder="Min. 8 characters"
                                minLength={8}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit"
                            disabled={isCreating}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg"
                        >
                            {isCreating ? 'Creating...' : t.create}
                        </button>
                    </div>
                 </form>
             </div>
          </div>
      )}
    </div>
  );
};

export default UserManagement;
