
import React, { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { UserProfile, PersonnelSchedule, ShiftType, DutyStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabaseClient';
import { Users, Shield, UserCheck, UserX, Plus, X, Lock, User, Mail, Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertTriangle, Fingerprint, Clock, RefreshCw } from 'lucide-react';

// Helper to get YYYY-MM-DD in local time
const getLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const UserManagement: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'personnel' | 'pending' | 'roster'>('personnel');
  
  // Roster State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<PersonnelSchedule[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  
  // Today's schedule for status checks
  const [todaySchedule, setTodaySchedule] = useState<PersonnelSchedule[]>([]);

  // Edit Schedule Modal
  const [editingSchedule, setEditingSchedule] = useState<{userId: string, date: Date, name: string} | null>(null);
  const [newShift, setNewShift] = useState<ShiftType>('1st');
  const [newStatus, setNewStatus] = useState<DutyStatus>('On Duty');

  // Modal State (Create User)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
      email: '',
      username: '',
      password: '',
      fullName: '',
      role: 'field_operator',
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchTodaySchedule();
    
    const interval = setInterval(fetchTodaySchedule, 60000);

    // REALTIME: Listen for profile changes (Insertions = New Registrations)
    const channel = supabase
        .channel('users_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
            fetchUsers();
            if (payload.eventType === 'INSERT') {
                const newProfile = payload.new as UserProfile;
                if (newProfile.status === 'inactive') {
                    showToast(`New registration: ${newProfile.full_name}`, "info");
                }
            }
        })
        .subscribe();

    return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
      if (activeTab === 'roster') {
          fetchSchedules();
      }
  }, [activeTab, currentDate]);

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

  const fetchTodaySchedule = async () => {
      try {
          const todayStr = getLocalDateStr(new Date());
          const data = await supabaseService.getSchedules(todayStr, todayStr);
          setTodaySchedule(data);
      } catch (e) {
          console.error("Failed to fetch today's schedule", e);
      }
  };

  const getUserLiveStatus = (userId: string) => {
      const today = new Date();
      const todayStr = getLocalDateStr(today);
      const userSchedule = todaySchedule.find(s => s.user_id === userId && s.date === todayStr);

      if (!userSchedule) return { label: 'Off Duty', color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' };

      if (userSchedule.status !== 'On Duty' && userSchedule.status !== 'Road Clearing') {
          if (userSchedule.status === 'Leave') return { label: 'On Leave', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' };
          if (userSchedule.status === 'Day Off') return { label: 'Day Off', color: 'text-slate-500', bg: 'bg-gray-100 dark:bg-slate-800' };
          return { label: userSchedule.status, color: 'text-slate-500', bg: 'bg-gray-100 dark:bg-slate-800' };
      }

      const currentHour = today.getHours();
      let isOnShift = false;
      if (userSchedule.shift === '1st' && (currentHour >= 0 && currentHour < 8)) isOnShift = true;
      if (userSchedule.shift === '2nd' && (currentHour >= 8 && currentHour < 16)) isOnShift = true;
      if (userSchedule.shift === '3rd' && (currentHour >= 16 && currentHour <= 23)) isOnShift = true;

      if (isOnShift) {
          return { 
              label: userSchedule.status === 'Road Clearing' ? 'Road Clearing' : 'On Duty', 
              color: userSchedule.status === 'Road Clearing' ? 'text-yellow-700 dark:text-yellow-400' : 'text-green-600 dark:text-green-400', 
              bg: userSchedule.status === 'Road Clearing' ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-green-100 dark:bg-green-900/20' 
          };
      } else {
          return { label: 'Off Shift', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' };
      }
  };

  // --- ROSTER LOGIC ---
  const getWeekRange = (date: Date) => {
      const start = new Date(date);
      const day = start.getDay(); 
      const diff = start.getDate() - (day === 0 ? 6 : day - 1);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end };
  };

  const fetchSchedules = async () => {
      setRosterLoading(true);
      setRosterError(null);
      const { start, end } = getWeekRange(currentDate);
      try {
          const startStr = getLocalDateStr(start);
          const endStr = getLocalDateStr(end);
          const data = await supabaseService.getSchedules(startStr, endStr);
          setSchedules(data);
      } catch (error: any) {
          console.error(error);
          setRosterError(error.message || "Unknown error");
          if (error.code === 'PGRST205' || error.message?.includes('personnel_schedules')) {
             showToast("Table 'personnel_schedules' missing. Run schema.sql!", "error");
          } else {
             showToast("Failed to load schedules", "error");
          }
      } finally {
          setRosterLoading(false);
      }
  };

  const getScheduleForCell = (userId: string, dayOffset: number) => {
      const { start } = getWeekRange(currentDate);
      const cellDate = new Date(start);
      cellDate.setDate(cellDate.getDate() + dayOffset);
      const dateStr = getLocalDateStr(cellDate);
      return schedules.find(s => s.user_id === userId && s.date === dateStr);
  };

  const handleCellClick = (userId: string, dayOffset: number) => {
      const { start } = getWeekRange(currentDate);
      const cellDate = new Date(start);
      cellDate.setDate(cellDate.getDate() + dayOffset);
      
      const targetUser = users.find(u => u.id === userId);
      const existing = getScheduleForCell(userId, dayOffset);

      setEditingSchedule({
          userId,
          date: cellDate,
          name: targetUser?.full_name || 'Unknown'
      });
      setNewShift(existing?.shift || '1st');
      setNewStatus(existing?.status || 'On Duty');
  };

  const handleSaveSchedule = async () => {
      if (!editingSchedule) return;
      if (editingSchedule.date.getDay() === 6 && newStatus === 'Day Off') { 
          showToast("Saturday cannot be a Day Off.", "error");
          return;
      }

      try {
          const dateStr = getLocalDateStr(editingSchedule.date);
          await supabaseService.upsertSchedule({
              user_id: editingSchedule.userId,
              date: dateStr,
              shift: newShift,
              status: newStatus
          });
          showToast("Schedule updated", "success");
          setEditingSchedule(null);
          fetchSchedules();
          fetchTodaySchedule();
      } catch (error) {
          showToast("Failed to save schedule", "error");
      }
  };

  const changeWeek = (direction: 'prev' | 'next') => {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      setCurrentDate(newDate);
  };

  const formatDateShort = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // --- USER MANAGEMENT LOGIC ---

  const validatePassword = (pwd: string) => {
      const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      return regex.test(pwd);
  };

  const handleOpenModal = () => {
      setNewUser({
          email: '',
          username: '',
          password: '',
          fullName: '',
          role: 'field_operator',
      });
      setIsModalOpen(true);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      try {
        await supabaseService.updateUserStatus(id, newStatus);
        showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}.`, "success");
      } catch (error) {
        showToast("Failed to update status", "error");
      }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Basic Validation
      if (!validatePassword(newUser.password)) {
          showToast("Password must be 8+ chars with Uppercase, Number, Special Char.", "error");
          return;
      }

      setIsCreating(true);
      try {
          // Check username availability locally first to save a network call/error
          const exists = users.some(u => u.username === newUser.username || u.email === newUser.email);
          if (exists) {
              throw new Error("Username or Email is already in use (checked local cache).");
          }

          // Check against DB via service if RLS allows
          const isTaken = await supabaseService.checkUsernameExists(newUser.username);
          if (isTaken) {
              throw new Error("Username is already taken.");
          }

          await supabaseService.createUser(
              newUser.email,
              newUser.username,
              newUser.password,
              newUser.fullName,
              newUser.role
          );
          
          showToast("Account created successfully. User is Pending approval.", "success");
          
          // Reset and switch to Pending tab
          setIsModalOpen(false);
          setNewUser({ email: '', username: '', password: '', fullName: '', role: 'field_operator' });
          
          // Force refresh (though realtime should handle it)
          await fetchUsers();
          setActiveTab('pending'); 
          
      } catch (error: any) {
          console.error(error);
          alert("Registration Error: " + (error.message || "Database error. User might already exist."));
      } finally {
          setIsCreating(false);
      }
  }

  const currentWeekRange = getWeekRange(currentDate);
  const pendingUsers = users.filter(u => u.status === 'inactive');
  const displayedUsers = activeTab === 'personnel' ? users.filter(u => u.status === 'active') : pendingUsers;

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
                <Shield className="mr-3 text-blue-600 dark:text-blue-500" />
                {t.managePersonnel}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2 font-medium">{t.manageAccess}</p>
        </div>
        <div className="flex space-x-2">
            <button 
                onClick={() => setActiveTab('personnel')}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    activeTab === 'personnel' 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/10'
                }`}
            >
                Directory
            </button>
            <button 
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center ${
                    activeTab === 'pending' 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/10'
                }`}
            >
                <span>Pending</span>
                {pendingUsers.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-[10px] rounded-full animate-pulse shadow-sm">{pendingUsers.length}</span>
                )}
            </button>
            <button 
                onClick={() => setActiveTab('roster')}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center ${
                    activeTab === 'roster' 
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/10'
                }`}
            >
                <CalendarIcon size={16} className="mr-2" />
                Duty Roster
            </button>
        </div>
      </header>

      {activeTab === 'personnel' || activeTab === 'pending' ? (
          /* --- PERSONNEL DIRECTORY / PENDING TAB --- */
          <>
          {activeTab === 'personnel' && (
            <div className="flex justify-end gap-2">
                    <button 
                        onClick={fetchUsers}
                        className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                        title="Refresh List"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button 
                        onClick={handleOpenModal}
                        className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-transform shadow-xl flex items-center justify-center space-x-2"
                    >
                        <Plus size={18} />
                        <span>{t.addPersonnel}</span>
                    </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div></div>
          ) : (
            <>
            {displayedUsers.length === 0 ? (
                <div className="glass-panel rounded-3xl p-12 text-center border-dashed border-2 border-gray-300 dark:border-gray-700">
                    <div className="bg-gray-100 dark:bg-slate-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <Users size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No {activeTab === 'pending' ? 'Pending Requests' : 'Personnel Found'}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                        {activeTab === 'pending' ? "All pending registrations have been reviewed." : "Start by adding a new personnel account."}
                    </p>
                </div>
            ) : (
                <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-white/50 dark:border-white/10 animate-fade-in">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                        <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-700">
                            <th className="p-6 font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">{t.officer}</th>
                            <th className="p-6 font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">{t.role}</th>
                            <th className="p-6 font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">{t.badgeId}</th>
                            <th className="p-6 font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Current Status</th>
                            <th className="p-6 font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Account</th>
                            <th className="p-6 font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider text-right">{t.actions}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {displayedUsers.map((user, index) => {
                            const liveStatus = getUserLiveStatus(user.id);
                            return (
                            <tr key={user.id} className={`transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/20 ${index % 2 === 0 ? 'bg-white/60 dark:bg-white/5' : 'bg-slate-50/60 dark:bg-transparent'}`}>
                            <td className="p-6">
                                <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-slate-700 dark:text-white font-bold flex-shrink-0 border border-slate-200 dark:border-slate-600">
                                    {user.full_name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white text-base">{user.full_name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{user.username ? `@${user.username}` : user.email}</div>
                                </div>
                                </div>
                            </td>
                            <td className="p-6">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                    user.role === 'supervisor' 
                                    ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' 
                                    : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                }`}>
                                    {user.role === 'supervisor' ? 'Official' : 'Field Operator'}
                                </span>
                            </td>
                            <td className="p-6 text-slate-700 dark:text-slate-300 font-mono text-sm font-bold">{user.badge_number || '---'}</td>
                            <td className="p-6">
                                {user.status === 'active' ? (
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border border-transparent ${liveStatus.bg} ${liveStatus.color}`}>
                                        <Clock size={12} className="mr-1.5" />
                                        {liveStatus.label}
                                    </div>
                                ) : (
                                    <span className="text-xs font-bold text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-800 flex items-center w-fit">
                                        <AlertTriangle size={12} className="mr-1.5"/>
                                        Pending Review
                                    </span>
                                )}
                            </td>
                            <td className="p-6">
                                <div className="flex items-center text-sm">
                                    {user.status === 'active' ? (
                                        <span className="flex items-center text-green-700 dark:text-green-400 font-bold">
                                            <UserCheck size={16} className="mr-1.5" /> Active
                                        </span>
                                    ) : (
                                        <span className="flex items-center text-slate-500 dark:text-slate-400 font-bold">
                                            <UserX size={16} className="mr-1.5" /> Inactive
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="p-6 text-right">
                                <button 
                                    onClick={() => handleToggleStatus(user.id, user.status)}
                                    className={`text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center ml-auto ${
                                        user.status === 'active' 
                                        ? 'bg-white dark:bg-slate-800 text-red-600 border border-gray-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30' 
                                        : 'bg-green-600 text-white hover:bg-green-700 shadow-green-500/30 hover:scale-105'
                                    }`}
                                >
                                    {user.status === 'active' ? 'Deactivate' : 'Approve & Activate'}
                                </button>
                            </td>
                            </tr>
                        )})}
                        </tbody>
                    </table>
                  </div>
                </div>
            )}
            </>
          )}
          </>
      ) : (
          /* --- DUTY ROSTER TAB --- */
          <div className="animate-fade-in">
              <div className="glass-panel p-6 rounded-3xl border border-white/50 dark:border-white/10 shadow-xl overflow-hidden min-h-[500px]">
                  {/* Calendar Header */}
                  <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                      <div className="flex items-center space-x-4 bg-gray-100 dark:bg-slate-700 rounded-full p-1">
                          <button onClick={() => changeWeek('prev')} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-full shadow-sm transition-all"><ChevronLeft size={20} className="text-slate-600 dark:text-white"/></button>
                          <h2 className="text-sm font-bold text-slate-800 dark:text-white px-2 min-w-[140px] text-center">
                              {formatDateShort(currentWeekRange.start)} - {formatDateShort(currentWeekRange.end)}
                          </h2>
                          <button onClick={() => changeWeek('next')} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-full shadow-sm transition-all"><ChevronRight size={20} className="text-slate-600 dark:text-white"/></button>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
                          <div className="flex items-center"><span className="w-3 h-3 bg-indigo-100 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 rounded mr-2"></span>1st (12-8)</div>
                          <div className="flex items-center"><span className="w-3 h-3 bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded mr-2"></span>2nd (8-4)</div>
                          <div className="flex items-center"><span className="w-3 h-3 bg-purple-100 dark:bg-purple-900 border border-purple-200 dark:border-purple-800 rounded mr-2"></span>3rd (4-12)</div>
                      </div>
                  </div>

                  {rosterLoading ? (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mb-4"></div>
                          <p>Loading schedule...</p>
                      </div>
                  ) : rosterError ? (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-red-50/50 rounded-2xl border border-red-100 mx-4 my-4">
                          <div className="bg-red-100 p-3 rounded-full mb-3">
                              <AlertTriangle className="w-8 h-8 text-red-500" />
                          </div>
                          <p className="font-bold text-red-700 mb-1">Error Loading Schedule</p>
                          <p className="text-xs mb-4 text-center px-4">{rosterError}</p>
                      </div>
                  ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full border-collapse">
                          <thead>
                              <tr>
                                  <th className="p-4 text-left min-w-[150px] bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-xs sticky left-0 z-10 border-r border-gray-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Personnel</th>
                                  {Array.from({length: 7}).map((_, i) => {
                                      const d = new Date(currentWeekRange.start);
                                      d.setDate(d.getDate() + i);
                                      const isSat = d.getDay() === 6;
                                      return (
                                          <th key={i} className={`p-4 min-w-[120px] border-l border-gray-100 dark:border-slate-700 font-bold uppercase text-xs text-center ${isSat ? 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-500' : 'bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                              <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                              <div className="text-lg">{d.getDate()}</div>
                                              {isSat && <div className="text-[10px] mt-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded px-1 inline-block">Road Clearing</div>}
                                          </th>
                                      );
                                  })}
                              </tr>
                          </thead>
                          <tbody>
                              {users.filter(u => u.status === 'active').map((user) => (
                                  <tr key={user.id} className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white/95 dark:bg-slate-900/95 border-r border-gray-100 dark:border-slate-700">
                                          <div className="truncate w-32">{user.full_name}</div>
                                      </td>
                                      {Array.from({length: 7}).map((_, i) => {
                                          const schedule = getScheduleForCell(user.id, i);
                                          let cellClass = "bg-white dark:bg-slate-900";
                                          let textClass = "text-slate-400 dark:text-slate-600";
                                          let label = "-";

                                          if (schedule) {
                                              if (schedule.status === 'Day Off') {
                                                  cellClass = "bg-gray-100 dark:bg-slate-800";
                                                  textClass = "text-slate-500 dark:text-slate-400 font-bold";
                                                  label = "Day Off";
                                              } else if (schedule.status === 'Leave') {
                                                  cellClass = "bg-red-50 dark:bg-red-900/20";
                                                  textClass = "text-red-700 dark:text-red-400 font-bold";
                                                  label = "On Leave";
                                              } else if (schedule.status === 'Road Clearing') {
                                                  cellClass = "bg-yellow-100 dark:bg-yellow-900/20";
                                                  textClass = "text-yellow-800 dark:text-yellow-400 font-bold";
                                                  label = "Road Clearing";
                                              } else {
                                                  if (schedule.shift === '1st') cellClass = "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800";
                                                  if (schedule.shift === '2nd') cellClass = "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800";
                                                  if (schedule.shift === '3rd') cellClass = "bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800";
                                                  textClass = "text-slate-900 dark:text-slate-200 font-bold";
                                                  label = `${schedule.shift} Shift`;
                                              }
                                          }

                                          return (
                                              <td 
                                                key={i} 
                                                onClick={() => handleCellClick(user.id, i)}
                                                className={`p-2 border-l border-gray-100 dark:border-slate-700 cursor-pointer transition-colors hover:opacity-80`}
                                              >
                                                  <div className={`w-full h-12 rounded-lg flex items-center justify-center text-xs border border-transparent ${cellClass} ${textClass}`}>
                                                      {label}
                                                  </div>
                                              </td>
                                          );
                                      })}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                    </div>
                  )}
              </div>
          </div>
      )}

      {/* CREATE USER MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
                 <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">{t.createAccount}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-200 dark:bg-slate-700 rounded-full hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300">
                        <X size={18} />
                    </button>
                 </div>
                 <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                    {/* Form fields same as before... */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.fullName}</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                required
                                type="text"
                                className="w-full bg-gray-100 dark:bg-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white font-semibold"
                                value={newUser.fullName}
                                onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                                placeholder="e.g., Juan Dela Cruz"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Username</label>
                            <div className="relative">
                                <Fingerprint className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input 
                                    required
                                    type="text"
                                    className="w-full bg-gray-100 dark:bg-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white font-semibold"
                                    value={newUser.username}
                                    onChange={e => setNewUser({...newUser, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                                    placeholder="jdelacruz"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.role}</label>
                            <select 
                                className="w-full bg-gray-100 dark:bg-slate-700 rounded-xl py-3 px-4 outline-none text-slate-800 dark:text-white font-semibold"
                                value={newUser.role}
                                onChange={e => setNewUser({...newUser, role: e.target.value})}
                            >
                                <option value="field_operator">Field Operator</option>
                                <option value="supervisor">Supervisor / Official</option>
                            </select>
                         </div>
                    </div>
                    <hr className="border-gray-100 dark:border-slate-700" />
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.email}</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                required
                                type="email"
                                className="w-full bg-gray-100 dark:bg-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white font-semibold"
                                value={newUser.email}
                                onChange={e => setNewUser({...newUser, email: e.target.value})}
                                placeholder="official@bantaybayan.gov.ph"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t.password}</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                                required
                                type="password"
                                className="w-full bg-gray-100 dark:bg-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                                value={newUser.password}
                                onChange={e => setNewUser({...newUser, password: e.target.value})}
                                placeholder="Min. 8 characters, 1 Upper, 1 Special"
                                minLength={8}
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 ml-1 flex items-center">
                            <Shield size={10} className="mr-1 text-blue-500" />
                            Requires: 8+ Chars, Uppercase, Number, Special Char
                        </p>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit"
                            disabled={isCreating}
                            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg"
                        >
                            {isCreating ? 'Creating Account...' : t.create}
                        </button>
                    </div>
                 </form>
             </div>
          </div>
      )}

      {/* Editing Modal omitted for brevity, same as before */}
      {editingSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl animate-slide-up p-6">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{editingSchedule.name}</h3>
                 <p className="text-sm text-slate-500 mb-6">{editingSchedule.date.toDateString()}</p>
                 
                 <div className="space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Duty Status</label>
                         <select 
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as DutyStatus)}
                            className="w-full bg-gray-100 dark:bg-slate-700 rounded-xl py-3 px-4 font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                         >
                             <option value="On Duty">On Duty</option>
                             <option value="Road Clearing">Road Clearing</option>
                             {editingSchedule.date.getDay() !== 6 && (
                                <option value="Day Off">Day Off</option>
                             )}
                             <option value="Leave">On Leave</option>
                         </select>
                     </div>
                     
                     {(newStatus === 'On Duty' || newStatus === 'Road Clearing') && (
                         <div className="animate-fade-in">
                             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Shift Assignment</label>
                             <div className="grid grid-cols-1 gap-2">
                                 <button 
                                    onClick={() => setNewShift('1st')}
                                    className={`py-2 px-3 rounded-lg text-sm font-bold border transition-colors ${newShift === '1st' ? 'bg-indigo-100 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-300'}`}
                                 >
                                     1st Shift (12am - 8am)
                                 </button>
                                 <button 
                                    onClick={() => setNewShift('2nd')}
                                    className={`py-2 px-3 rounded-lg text-sm font-bold border transition-colors ${newShift === '2nd' ? 'bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-300'}`}
                                 >
                                     2nd Shift (8am - 4pm)
                                 </button>
                                 <button 
                                    onClick={() => setNewShift('3rd')}
                                    className={`py-2 px-3 rounded-lg text-sm font-bold border transition-colors ${newShift === '3rd' ? 'bg-purple-100 dark:bg-purple-900 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300' : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-300'}`}
                                 >
                                     3rd Shift (4pm - 12am)
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>

                 <div className="flex space-x-3 mt-8">
                     <button 
                        onClick={() => setEditingSchedule(null)}
                        className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600"
                     >
                         Cancel
                     </button>
                     <button 
                        onClick={handleSaveSchedule}
                        className="flex-1 py-3 bg-slate-900 dark:bg-blue-600 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
                     >
                         Save
                     </button>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default UserManagement;
