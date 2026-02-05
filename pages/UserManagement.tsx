
import React, { useEffect, useState, useRef } from 'react';
import { supabaseService } from '../services/supabaseService';
import { UserProfile, PersonnelSchedule, ShiftType, DutyStatus } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Users, Shield, UserCheck, UserX, Plus, X, Lock, User, Mail, Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertTriangle, Fingerprint, Clock, RefreshCw, Edit, Save, Camera, Search, Filter, MoreHorizontal, Moon, Sun, Sunrise, Sunset, CalendarRange, CheckCircle } from 'lucide-react';

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
  const { user } = useAuth(); // Current logged-in user
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'personnel' | 'pending' | 'roster'>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Roster State - Initialize to start of today (midnight)
  const [currentDate, setCurrentDate] = useState(() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
  });
  const [schedules, setSchedules] = useState<PersonnelSchedule[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  
  // Today's schedule for status checks
  const [todaySchedule, setTodaySchedule] = useState<PersonnelSchedule[]>([]);

  // Edit Schedule Modal (Single Cell)
  const [editingSchedule, setEditingSchedule] = useState<{userId: string, date: Date, name: string} | null>(null);
  const [newShift, setNewShift] = useState<ShiftType>('1st');
  const [newStatus, setNewStatus] = useState<DutyStatus>('On Duty');

  // Bulk Schedule Modal State
  const [bulkUser, setBulkUser] = useState<{id: string, name: string} | null>(null);
  const [bulkConfig, setBulkConfig] = useState({
      shift: '1st' as ShiftType,
      daysOff: [] as string[] // Array of day names e.g. ['Sunday']
  });

  // Create User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
      email: '',
      username: '',
      password: '',
      fullName: '',
      role: 'field_operator',
  });
  const [isCreating, setIsCreating] = useState(false);

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFormData, setEditFormData] = useState({
      full_name: '',
      badge_number: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // 1. Set Initial Tab based on Role (Run once when user loads)
  useEffect(() => {
    if (user?.role === 'supervisor') {
        setActiveTab('personnel');
    } else {
        setActiveTab('roster');
    }
  }, [user]);

  // 2. Data Fetching & Subscriptions
  useEffect(() => {
    fetchUsers();
    fetchTodaySchedule();
    
    const interval = setInterval(fetchTodaySchedule, 60000);

    const channel = supabase
        .channel('users_management_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
            fetchUsers();
            if (payload.eventType === 'INSERT') {
                const newProfile = payload.new as UserProfile;
                if (newProfile.status === 'inactive') {
                    showToast(`New registration: ${newProfile.full_name}`, "info");
                }
            }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'personnel_schedules' }, () => {
            fetchTodaySchedule();
        })
        .subscribe();

    return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
    };
  }, []); 

  // 3. Fetch Schedules when switching to Roster or Changing Dates
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
              color: userSchedule.status === 'Road Clearing' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400', 
              bg: userSchedule.status === 'Road Clearing' ? 'bg-amber-100 dark:bg-amber-900/20' : 'bg-emerald-100 dark:bg-emerald-900/20' 
          };
      } else {
          return { label: 'Off Shift', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' };
      }
  };

  // --- ROSTER LOGIC ---
  const getWeekRange = (date: Date) => {
      // Ensure we work with a midnight-normalized start date
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      
      const day = start.getDay(); // 0 = Sunday
      // Logic: Start week on Monday
      const diff = start.getDate() - (day === 0 ? 6 : day - 1);
      
      start.setDate(diff);
      
      const end = new Date(start);
      end.setDate(end.getDate() + 6); // End on Sunday
      end.setHours(23, 59, 59, 999); // Include full end day
      
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
      // ONLY SUPERVISORS CAN EDIT
      if (user?.role !== 'supervisor') return;

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
      } catch (error) {
          showToast("Failed to save schedule", "error");
      }
  };

  // --- BULK SCHEDULE LOGIC (ADMIN ONLY) ---
  const handleOpenBulk = (u: UserProfile) => {
      // STRICT CHECK: Only supervisor can open this
      if (user?.role !== 'supervisor') {
          showToast("Unauthorized: Access Restricted to Admin.", "error");
          return;
      }
      setBulkUser({ id: u.id, name: u.full_name });
      setBulkConfig({ shift: '1st', daysOff: ['Sunday'] });
  };

  const toggleDayOff = (day: string) => {
      setBulkConfig(prev => {
          if (prev.daysOff.includes(day)) {
              return { ...prev, daysOff: prev.daysOff.filter(d => d !== day) };
          } else {
              return { ...prev, daysOff: [...prev.daysOff, day] };
          }
      });
  };

  const handleBulkApply = async () => {
      if (!bulkUser) return;
      // Double check permission before saving
      if (user?.role !== 'supervisor') return;

      setRosterLoading(true);
      try {
          const { start, end } = getWeekRange(currentDate);
          const schedulesPayload: Partial<PersonnelSchedule>[] = [];
          
          // Loop through the displayed week
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const dateStr = getLocalDateStr(d);
              const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
              
              let status = 'On Duty';
              let shift = bulkConfig.shift;

              if (bulkConfig.daysOff.includes(dayName)) {
                  status = 'Day Off';
              } else if (dayName === 'Saturday') {
                  status = 'Road Clearing'; // Override for Saturday Policy
              }

              schedulesPayload.push({
                  user_id: bulkUser.id,
                  date: dateStr,
                  status: status as DutyStatus,
                  shift: shift
              });
          }

          await supabaseService.saveBatchSchedules(schedulesPayload);
          showToast("Weekly schedule applied.", "success");
          setBulkUser(null);
          fetchSchedules();
      } catch (e: any) {
          showToast("Failed to apply schedule", "error");
      } finally {
          setRosterLoading(false);
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
        fetchUsers();
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
          const exists = users.some(u => u.username === newUser.username || u.email === newUser.email);
          if (exists) {
              throw new Error("Username or Email is already in use (checked local cache).");
          }

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
          setIsModalOpen(false);
          setNewUser({ email: '', username: '', password: '', fullName: '', role: 'field_operator' });
          setActiveTab('pending'); 
          
      } catch (error: any) {
          console.error(error);
          alert("Registration Error: " + (error.message || "Database error. User might already exist."));
      } finally {
          setIsCreating(false);
      }
  }

  // --- EDIT USER LOGIC ---
  const handleEditUser = (user: UserProfile) => {
      setEditingUser(user);
      setEditFormData({
          full_name: user.full_name,
          badge_number: user.badge_number || ''
      });
      setImagePreview(user.avatar_url || null);
      setSelectedFile(null);
      setIsEditModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 2 * 1024 * 1024) { // 2MB limit
              showToast("Image size must be less than 2MB", "error");
              return;
          }
          setSelectedFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;

      setIsSavingEdit(true);
      try {
          let avatarUrl = editingUser.avatar_url;

          if (selectedFile) {
              avatarUrl = await supabaseService.uploadAvatar(editingUser.id, selectedFile);
          }

          // Handle badge number uniqueness: convert empty string to null
          const badgePayload = editFormData.badge_number.trim() === '' ? null : editFormData.badge_number.trim();

          await supabaseService.updateProfile(editingUser.id, {
              full_name: editFormData.full_name,
              badge_number: badgePayload as string,
              avatar_url: avatarUrl
          });

          showToast("User details updated successfully", "success");
          fetchUsers();
          setIsEditModalOpen(false);
      } catch (error: any) {
          console.error("Update failed", error);
          if (error.message?.includes('badge_number')) {
              showToast("Badge Number is already in use.", "error");
          } else {
              showToast(error.message || "Failed to update profile", "error");
          }
      } finally {
          setIsSavingEdit(false);
      }
  };

  const currentWeekRange = getWeekRange(currentDate);
  const pendingUsers = users.filter(u => u.status === 'inactive');
  const activeUsers = users.filter(u => u.status === 'active');
  
  const filteredUsers = (activeTab === 'pending' ? pendingUsers : activeUsers).filter(u => {
      const q = searchQuery.toLowerCase();
      return u.full_name.toLowerCase().includes(q) || 
             u.badge_number?.toLowerCase().includes(q) || 
             u.email.toLowerCase().includes(q);
  });

  // ... (JSX is identical to previous, just wrapped with this logic)
  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
                <Shield className="mr-3 text-blue-600 dark:text-blue-500" />
                {user?.role === 'supervisor' ? t.managePersonnel : 'Duty Roster'}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2 font-medium text-sm md:text-base">
                {user?.role === 'supervisor' ? t.manageAccess : 'View personnel shifts and schedule.'}
            </p>
        </div>
        
        {user?.role === 'supervisor' && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-full xl:w-auto overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setActiveTab('personnel')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex items-center ${
                        activeTab === 'personnel' 
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Users size={16} className="mr-2"/>
                    Directory
                </button>
                <button 
                    onClick={() => setActiveTab('pending')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center whitespace-nowrap ${
                        activeTab === 'pending' 
                        ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <span>Pending</span>
                    {pendingUsers.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-[10px] rounded-full">{pendingUsers.length}</span>
                    )}
                </button>
                <button 
                    onClick={() => setActiveTab('roster')}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center whitespace-nowrap ${
                        activeTab === 'roster' 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <CalendarIcon size={16} className="mr-2" />
                    Duty Roster
                </button>
            </div>
        )}
      </header>

      {/* RENDER CONTENT BASED ON TAB */}
      
      {activeTab === 'personnel' || activeTab === 'pending' ? (
          /* --- PERSONNEL DIRECTORY / PENDING TAB --- */
          <div className="space-y-6">
            {activeTab === 'personnel' && (
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:max-w-md">
                        <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search officer name, badge, or email..." 
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={fetchUsers}
                            className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
                            title="Refresh List"
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button 
                            onClick={handleOpenModal}
                            className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-transform shadow-lg shadow-blue-500/30 flex items-center justify-center space-x-2"
                        >
                            <Plus size={18} />
                            <span>{t.addPersonnel}</span>
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div></div>
            ) : (
                <>
                {filteredUsers.length === 0 ? (
                    <div className="glass-panel rounded-3xl p-16 text-center border-dashed border-2 border-gray-300 dark:border-slate-700">
                        <div className="bg-gray-100 dark:bg-slate-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                            <Users size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Personnel Found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                            {activeTab === 'pending' ? "No pending registrations at the moment." : "Try adjusting your search criteria or add a new account."}
                        </p>
                    </div>
                ) : (
                    <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-white/50 dark:border-white/10 animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                            <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-200 dark:border-slate-700">
                                <th className="p-5 font-bold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">{t.officer}</th>
                                <th className="p-5 font-bold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">{t.role}</th>
                                <th className="p-5 font-bold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">{t.badgeId}</th>
                                <th className="p-5 font-bold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">Current Status</th>
                                <th className="p-5 font-bold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider hidden lg:table-cell">Account</th>
                                <th className="p-5 font-bold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider text-right">{t.actions}</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                            {filteredUsers.map((rowUser) => {
                                const liveStatus = getUserLiveStatus(rowUser.id);
                                return (
                                <tr key={rowUser.id} className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="p-5">
                                    <div className="flex items-center space-x-4">
                                        <div className="relative">
                                            {rowUser.avatar_url ? (
                                                <img 
                                                    src={rowUser.avatar_url} 
                                                    alt={rowUser.full_name} 
                                                    className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-md"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-slate-700 dark:text-white font-bold border-2 border-white dark:border-slate-700 shadow-md">
                                                    {rowUser.full_name.charAt(0)}
                                                </div>
                                            )}
                                            {rowUser.status === 'active' && (
                                                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${liveStatus.color.replace('text-', 'bg-').split(' ')[0]}`}></span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white text-sm md:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{rowUser.full_name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{rowUser.username ? `@${rowUser.username}` : rowUser.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-5">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                        rowUser.role === 'supervisor' 
                                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' 
                                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                    }`}>
                                        {rowUser.role === 'supervisor' ? 'Official' : 'Field Operator'}
                                    </span>
                                </td>
                                <td className="p-5 text-slate-700 dark:text-slate-300 font-mono text-sm font-semibold hidden md:table-cell">{rowUser.badge_number || '---'}</td>
                                <td className="p-5">
                                    {rowUser.status === 'active' ? (
                                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${liveStatus.bg} ${liveStatus.color.replace('text-', 'border-transparent text-')}`}>
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
                                <td className="p-5 hidden lg:table-cell">
                                    <div className="flex items-center text-sm">
                                        {rowUser.status === 'active' ? (
                                            <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                                                <UserCheck size={16} className="mr-1.5" /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-slate-500 dark:text-slate-400 font-bold">
                                                <UserX size={16} className="mr-1.5" /> Inactive
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-5 text-right">
                                    <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleEditUser(rowUser)}
                                            className="p-2 text-slate-500 hover:text-blue-600 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors shadow-sm"
                                            title="Edit Profile"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleToggleStatus(rowUser.id, rowUser.status)}
                                            className={`text-xs font-bold px-3 py-2 rounded-lg transition-all shadow-sm border flex items-center justify-center ${
                                                rowUser.status === 'active' 
                                                ? 'bg-white dark:bg-slate-700 text-red-600 border-gray-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/30' 
                                                : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                            }`}
                                        >
                                            {rowUser.status === 'active' ? 'Deactivate' : 'Approve'}
                                        </button>
                                    </div>
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
          </div>
      ) : (
          /* --- DUTY ROSTER TAB --- */
          <div className="animate-fade-in">
              <div className="glass-panel p-4 md:p-6 rounded-3xl border border-white/50 dark:border-white/10 shadow-xl overflow-hidden min-h-[600px]">
                  
                  {/* Calendar Header */}
                  <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5 shadow-inner w-full md:w-auto justify-between">
                          <button onClick={() => changeWeek('prev')} className="p-2 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl shadow-sm transition-all"><ChevronLeft size={20}/></button>
                          <div className="px-4 text-center">
                              <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Schedule Week</span>
                              <span className="text-sm md:text-base font-bold text-slate-800 dark:text-white">
                                  {formatDateShort(currentWeekRange.start)} - {formatDateShort(currentWeekRange.end)}
                              </span>
                          </div>
                          <button onClick={() => changeWeek('next')} className="p-2 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl shadow-sm transition-all"><ChevronRight size={20}/></button>
                      </div>
                  </div>

                  {rosterLoading ? (
                      <div className="flex flex-col items-center justify-center h-80 text-slate-400">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-4"></div>
                          <p className="animate-pulse font-medium">Syncing schedule...</p>
                      </div>
                  ) : rosterError ? (
                      <div className="flex flex-col items-center justify-center h-80 text-slate-500 bg-red-50/50 rounded-3xl border border-red-100 mx-4">
                          <div className="bg-red-100 p-4 rounded-full mb-4">
                              <AlertTriangle className="w-8 h-8 text-red-500" />
                          </div>
                          <p className="font-bold text-red-700 mb-1">Unable to load roster</p>
                          <p className="text-xs mb-4 text-center px-4">{rosterError}</p>
                      </div>
                  ) : (
                    <div className="overflow-x-auto custom-scrollbar pb-4">
                      <table className="w-full border-collapse">
                          <thead>
                              <tr>
                                  <th className="p-4 text-left min-w-[200px] bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest sticky left-0 z-30 border-r border-slate-200 dark:border-slate-700 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] backdrop-blur-md">
                                      Personnel
                                  </th>
                                  {Array.from({length: 7}).map((_, i) => {
                                      const d = new Date(currentWeekRange.start);
                                      d.setDate(d.getDate() + i);
                                      
                                      const todayStr = getLocalDateStr(new Date());
                                      const currentStr = getLocalDateStr(d);
                                      const isToday = todayStr === currentStr;

                                      return (
                                          <th key={i} className={`p-4 min-w-[140px] font-bold text-center border-l border-slate-100 dark:border-slate-700 transition-colors relative group
                                            ${isToday ? 'bg-indigo-600 text-white shadow-lg z-10 rounded-t-xl -translate-y-1' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}
                                          `}>
                                              {isToday && (
                                                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                                                      <span className="bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full font-extrabold tracking-widest shadow-md border-2 border-white dark:border-slate-900">TODAY</span>
                                                  </div>
                                              )}
                                              <div className="flex flex-col items-center">
                                                  <span className={`text-[10px] uppercase tracking-widest mb-1 ${!isToday && 'opacity-70'}`}>
                                                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                                  </span>
                                                  <span className="text-xl leading-none">{d.getDate()}</span>
                                              </div>
                                              {d.getDay() === 6 && !isToday && <div className="absolute bottom-1 left-0 right-0 text-[9px] text-amber-600 font-extrabold opacity-50 uppercase tracking-tighter">Clearing Ops</div>}
                                          </th>
                                      );
                                  })}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                              {users.filter(u => u.status === 'active').map((rowUser) => (
                                  <tr key={rowUser.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                      {/* Sticky Name Column */}
                                      <td className="p-4 sticky left-0 z-20 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                                          <div className="flex items-center space-x-3">
                                              <div className="relative">
                                                  {rowUser.avatar_url ? (
                                                      <img src={rowUser.avatar_url} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-600" alt="" />
                                                  ) : (
                                                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-600">
                                                          {rowUser.full_name.charAt(0)}
                                                      </div>
                                                  )}
                                                  {/* Status Dot */}
                                                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                                              </div>
                                              <div className="min-w-[120px]">
                                                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate w-32">{rowUser.full_name}</div>
                                                  <div className="text-[10px] text-slate-400 font-mono tracking-wide">{rowUser.badge_number || 'NO BADGE'}</div>
                                              </div>
                                              
                                              {/* BULK EDIT BUTTON (Supervisor Only) */}
                                              {/* GUI FIX: More prominent button, better spacing */}
                                              {user?.role === 'supervisor' && (
                                                  <button 
                                                    onClick={(e) => { e.stopPropagation(); handleOpenBulk(rowUser); }}
                                                    className="ml-auto p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-all shadow-sm border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center"
                                                    title="Plan Week"
                                                  >
                                                      <CalendarRange size={16} />
                                                  </button>
                                              )}
                                          </div>
                                      </td>

                                      {/* Schedule Cells */}
                                      {Array.from({length: 7}).map((_, i) => {
                                          const d = new Date(currentWeekRange.start);
                                          d.setDate(d.getDate() + i);
                                          const todayStr = getLocalDateStr(new Date());
                                          const currentStr = getLocalDateStr(d);
                                          const isToday = todayStr === currentStr;

                                          const schedule = getScheduleForCell(rowUser.id, i);
                                          
                                          let content = (
                                              <div className="w-full h-14 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                                  <span className="text-slate-300 dark:text-slate-600 text-lg opacity-50">+</span>
                                              </div>
                                          );

                                          if (schedule) {
                                              if (schedule.status === 'Day Off') {
                                                  content = (
                                                      <div className="w-full h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center opacity-70">
                                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Day Off</span>
                                                      </div>
                                                  );
                                              } else if (schedule.status === 'Leave') {
                                                  content = (
                                                      <div className="w-full h-14 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex flex-col items-center justify-center">
                                                          <span className="text-xs font-bold text-red-600 dark:text-red-400">On Leave</span>
                                                      </div>
                                                  );
                                              } else if (schedule.status === 'Road Clearing') {
                                                  content = (
                                                      <div className="w-full h-14 rounded-xl bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex flex-col items-center justify-center">
                                                          <span className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase text-center leading-tight">Road<br/>Clearing</span>
                                                      </div>
                                                  );
                                              } else {
                                                  let bgClass = "";
                                                  let textClass = "";
                                                  let icon = null;
                                                  let label = "";

                                                  if (schedule.shift === '1st') {
                                                      bgClass = "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800";
                                                      textClass = "text-indigo-700 dark:text-indigo-300";
                                                      icon = <Moon size={12} />;
                                                      label = "12am - 8am";
                                                  } else if (schedule.shift === '2nd') {
                                                      bgClass = "bg-sky-100 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800";
                                                      textClass = "text-sky-700 dark:text-sky-300";
                                                      icon = <Sun size={12} />;
                                                      label = "8am - 4pm";
                                                  } else {
                                                      bgClass = "bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800";
                                                      textClass = "text-violet-700 dark:text-violet-300";
                                                      icon = <Sunset size={12} />;
                                                      label = "4pm - 12am";
                                                  }

                                                  content = (
                                                      <div className={`w-full h-14 rounded-xl border ${bgClass} flex flex-col items-center justify-center relative overflow-hidden`}>
                                                          <div className={`flex items-center space-x-1 text-xs font-bold ${textClass} mb-0.5`}>
                                                              {icon}
                                                              <span>{schedule.shift} Shift</span>
                                                          </div>
                                                          <span className={`text-[9px] font-medium ${textClass} opacity-80`}>{label}</span>
                                                      </div>
                                                  );
                                              }
                                          }

                                          return (
                                              <td 
                                                key={i} 
                                                onClick={() => handleCellClick(rowUser.id, i)}
                                                className={`p-2 border-l border-slate-100 dark:border-slate-700 transition-all
                                                    ${user?.role === 'supervisor' ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800' : ''}
                                                    ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}
                                                `}
                                              >
                                                  <div className={`transition-transform duration-200 ${user?.role === 'supervisor' ? 'active:scale-95' : ''}`}>
                                                      {content}
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

      {/* Edit User Modal (Cleaned Up) */}
      {isEditModalOpen && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up border border-white/20">
                 <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white">Edit Profile</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="p-2 bg-gray-200 dark:bg-slate-700 rounded-full hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 transition-colors">
                        <X size={18} />
                    </button>
                 </div>
                 
                 <form onSubmit={handleSaveEdit} className="p-8 space-y-6">
                    <div className="flex flex-col items-center">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-xl bg-slate-100 dark:bg-slate-700">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                                        <User size={48} />
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2.5 rounded-full shadow-lg hover:bg-blue-700 transition-colors border-2 border-white dark:border-slate-800">
                                <Camera size={16} />
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">{t.fullName}</label>
                            <input 
                                required type="text"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white font-semibold transition-all"
                                value={editFormData.full_name}
                                onChange={e => setEditFormData({...editFormData, full_name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1">{t.badgeId}</label>
                            <input 
                                type="text"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white font-mono transition-all"
                                value={editFormData.badge_number}
                                onChange={e => setEditFormData({...editFormData, badge_number: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                        <button type="submit" disabled={isSavingEdit} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl">{isSavingEdit ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                 </form>
             </div>
          </div>
      )}

      {/* Single Edit Schedule Modal */}
      {editingSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-sm shadow-2xl animate-slide-up p-8 border border-white/20">
                 <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{editingSchedule.name}</h3>
                    <p className="text-sm font-medium text-slate-500 flex items-center">
                        <CalendarIcon size={14} className="mr-1.5"/>
                        {editingSchedule.date.toDateString()}
                    </p>
                 </div>
                 
                 <div className="space-y-6">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Duty Status</label>
                         <div className="grid grid-cols-2 gap-3">
                             <button onClick={() => setNewStatus('On Duty')} className={`py-3 rounded-xl text-sm font-bold border transition-all ${newStatus === 'On Duty' ? 'bg-emerald-100 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}>On Duty</button>
                             <button onClick={() => setNewStatus('Road Clearing')} className={`py-3 rounded-xl text-sm font-bold border transition-all ${newStatus === 'Road Clearing' ? 'bg-amber-100 border-amber-500 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}>Road Ops</button>
                             {editingSchedule.date.getDay() !== 6 && (
                                <button onClick={() => setNewStatus('Day Off')} className={`py-3 rounded-xl text-sm font-bold border transition-all ${newStatus === 'Day Off' ? 'bg-slate-200 border-slate-400 text-slate-700 dark:bg-slate-700 dark:border-slate-500 dark:text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}>Day Off</button>
                             )}
                             <button onClick={() => setNewStatus('Leave')} className={`py-3 rounded-xl text-sm font-bold border transition-all ${newStatus === 'Leave' ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'}`}>On Leave</button>
                         </div>
                     </div>
                     
                     {(newStatus === 'On Duty' || newStatus === 'Road Clearing') && (
                         <div className="animate-fade-in">
                             <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Shift Assignment</label>
                             <div className="grid grid-cols-1 gap-2">
                                 <button onClick={() => setNewShift('1st')} className={`flex items-center p-3 rounded-xl border transition-all ${newShift === '1st' ? 'bg-indigo-100 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700 hover:bg-slate-100'}`}>
                                     <div className={`p-2 rounded-lg mr-3 ${newShift === '1st' ? 'bg-white/50' : 'bg-white dark:bg-slate-800'}`}><Moon size={16} /></div>
                                     <div className="text-left"><div className="text-sm font-bold">1st Shift</div><div className="text-[10px] opacity-80">12:00 AM - 8:00 AM</div></div>
                                 </button>
                                 <button onClick={() => setNewShift('2nd')} className={`flex items-center p-3 rounded-xl border transition-all ${newShift === '2nd' ? 'bg-sky-100 border-sky-500 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700 hover:bg-slate-100'}`}>
                                     <div className={`p-2 rounded-lg mr-3 ${newShift === '2nd' ? 'bg-white/50' : 'bg-white dark:bg-slate-800'}`}><Sun size={16} /></div>
                                     <div className="text-left"><div className="text-sm font-bold">2nd Shift</div><div className="text-[10px] opacity-80">8:00 AM - 4:00 PM</div></div>
                                 </button>
                                 <button onClick={() => setNewShift('3rd')} className={`flex items-center p-3 rounded-xl border transition-all ${newShift === '3rd' ? 'bg-violet-100 border-violet-500 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700 hover:bg-slate-100'}`}>
                                     <div className={`p-2 rounded-lg mr-3 ${newShift === '3rd' ? 'bg-white/50' : 'bg-white dark:bg-slate-800'}`}><Sunset size={16} /></div>
                                     <div className="text-left"><div className="text-sm font-bold">3rd Shift</div><div className="text-[10px] opacity-80">4:00 PM - 12:00 AM</div></div>
                                 </button>
                             </div>
                         </div>
                     )}
                 </div>

                 <div className="flex space-x-3 mt-8">
                     <button onClick={() => setEditingSchedule(null)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                     <button onClick={handleSaveSchedule} className="flex-1 py-3.5 bg-slate-900 dark:bg-blue-600 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg">Save</button>
                 </div>
             </div>
          </div>
      )}

      {/* Bulk Schedule Modal */}
      {bulkUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md shadow-2xl animate-slide-up p-8 border border-white/20">
                 <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold uppercase tracking-wider">
                            Supervisor Action
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Plan Week for {bulkUser.name.split(' ')[0]}</h3>
                    <p className="text-sm font-medium text-slate-500">
                        Set schedule for {formatDateShort(currentWeekRange.start)} - {formatDateShort(currentWeekRange.end)}
                    </p>
                 </div>
                 
                 <div className="space-y-6">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Default Shift</label>
                         <select
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none text-slate-800 dark:text-white font-medium"
                            value={bulkConfig.shift}
                            onChange={e => setBulkConfig({...bulkConfig, shift: e.target.value as ShiftType})}
                         >
                             <option value="1st">1st Shift (12am - 8am)</option>
                             <option value="2nd">2nd Shift (8am - 4pm)</option>
                             <option value="3rd">3rd Shift (4pm - 12am)</option>
                         </select>
                     </div>

                     <div>
                         <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Days Off</label>
                         <div className="flex flex-wrap gap-2">
                             {WEEKDAYS.map(day => (
                                 <button
                                    key={day}
                                    onClick={() => toggleDayOff(day)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                        bulkConfig.daysOff.includes(day)
                                        ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                                 >
                                     {day.substring(0,3)}
                                 </button>
                             ))}
                         </div>
                     </div>
                 </div>

                 <div className="flex space-x-3 mt-8">
                     <button onClick={() => setBulkUser(null)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                     <button onClick={handleBulkApply} className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg flex items-center justify-center space-x-2">
                         <CheckCircle size={18} />
                         <span>Apply to Week</span>
                     </button>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default UserManagement;
