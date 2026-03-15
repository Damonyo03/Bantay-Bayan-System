
import React, { useEffect, useState, useRef } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { UserProfile, PersonnelSchedule, ShiftType, DutyStatus, UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Users, Shield, UserCheck, UserX, Plus, X, Lock, User, Mail, Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertTriangle, Fingerprint, Clock, RefreshCw, Edit, Save, Camera as CameraIcon, Search, Filter, MoreHorizontal, Moon, Sun, Sunrise, Sunset, CalendarRange, CheckCircle, CalendarDays, ChevronDown, Check, Navigation, Copy, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

// Helper to get YYYY-MM-DD in local time
const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const UserManagement: React.FC = () => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const { user, isSupremeAdmin, canEditRole } = useAuth(); // Current logged-in user

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
    const [editingSchedule, setEditingSchedule] = useState<{ userId: string, date: Date, name: string } | null>(null);
    const [newShift, setNewShift] = useState<ShiftType>('1st');
    const [newStatus, setNewStatus] = useState<DutyStatus>('On Duty');
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    // Bulk Schedule Modal State
    const [bulkUser, setBulkUser] = useState<{ id: string, name: string } | null>(null);
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
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
            const data = await userService.getUsers();
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
            const data = await userService.getSchedules(todayStr, todayStr);
            setTodaySchedule(data);
        } catch (e) {
            console.error("Failed to fetch today's schedule", e);
        }
    };

    const getUserLiveStatus = (userId: string) => {
        const today = new Date();
        const todayStr = getLocalDateStr(today);
        const userSchedule = todaySchedule.find((s: PersonnelSchedule) => s.user_id === userId && s.date === todayStr);

        // RED: Day Off or On Leave (Explicitly unavailable)
        const stateUnavailable = { label: 'Day Off/Leave', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' };
        // GRAY: Off Duty (Scheduled for duty but current time is outside shift hours)
        const stateOffDuty = { label: 'Off Duty', dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' };
        // GREEN: On Duty (Currently on assigned shift)
        const stateOnDuty = { label: 'On Duty', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' };
        // ORANGE: Road Clearing
        const stateRoadClearing = { label: 'Road Ops', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' };

        if (!userSchedule) return stateOffDuty;

        // Handle Unavailable Statuses
        if (userSchedule.status === 'Leave') return { ...stateUnavailable, label: 'On Leave' };
        if (userSchedule.status === 'Day Off') return { ...stateUnavailable, label: 'Day Off' };

        // Check current shift time
        const currentHour = today.getHours();
        let isOnShift = false;

        // Shift Hours Logic
        if (userSchedule.shift === '1st' && (currentHour >= 6 && currentHour < 14)) isOnShift = true;
        if (userSchedule.shift === '2nd' && (currentHour >= 14 && currentHour < 22)) isOnShift = true;
        if (userSchedule.shift === '3rd' && (currentHour >= 22 || currentHour < 6)) isOnShift = true;

        if (isOnShift) {
            // Check for Road Clearing Time (Only 1st Shift on Saturday, 8am-10am)
            const isSaturday = today.getDay() === 6;
            const isRoadClearingTime = currentHour >= 8 && currentHour < 10;

            const isRoadClearing = userSchedule.status === 'Road Clearing' ||
                (userSchedule.status === 'On Duty' && userSchedule.shift === '1st' && isSaturday && isRoadClearingTime);

            return isRoadClearing ? stateRoadClearing : stateOnDuty;
        } else {
            // Scheduled but time is outside shift
            return stateOffDuty;
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
            const data = await userService.getSchedules(startStr, endStr);
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
        return schedules.find((s: PersonnelSchedule) => s.user_id === userId && s.date === dateStr);
    };

    const isDateLocked = (cellDate: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - cellDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays > 7; // Non-editable if older than 7 days
    };

    const handleCellClick = (userId: string, dayOffset: number) => {
        // ONLY SUPERVISORS CAN EDIT
        if (user?.role !== 'supervisor') return;

        const { start } = getWeekRange(currentDate);
        const cellDate = new Date(start);
        cellDate.setDate(cellDate.getDate() + dayOffset);

        if (isDateLocked(cellDate)) {
            showToast("Records older than 7 days are locked for integrity.", "info");
            return;
        }

        const targetUser = users.find((u: UserProfile) => u.id === userId);
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

        setIsSavingSchedule(true);
        try {
            const dateStr = getLocalDateStr(editingSchedule.date);
            await userService.upsertSchedule({
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
        } finally {
            setIsSavingSchedule(false);
        }
    };

    const handleDuplicatePreviousWeek = async () => {
        if (user?.role !== 'supervisor') return;
        if (!confirm("Copy all assignments from the previous week into this week? Existing assignments in this week will be overwritten (excluding locked dates).")) return;

        setRosterLoading(true);
        try {
            const { start: currentStart } = getWeekRange(currentDate);

            // 1. Calculate previous week range
            const prevStart = new Date(currentStart);
            prevStart.setDate(prevStart.getDate() - 7);
            const prevEnd = new Date(prevStart);
            prevEnd.setDate(prevEnd.getDate() + 6);
            prevEnd.setHours(23, 59, 59, 999);

            // 2. Fetch previous week's schedules
            const prevSchedules = await userService.getSchedules(
                getLocalDateStr(prevStart),
                getLocalDateStr(prevEnd)
            );

            if (prevSchedules.length === 0) {
                showToast("No schedules found in the previous week to copy.", "info");
                setRosterLoading(false);
                return;
            }

            // 3. Map to current week
            const newSchedules: Partial<PersonnelSchedule>[] = [];

            prevSchedules.forEach((prev: PersonnelSchedule) => {
                const prevDate = new Date(prev.date);
                // Find day index (0-6) relative to prevStart
                const diffTime = prevDate.getTime() - prevStart.getTime();
                const dayIndex = Math.round(diffTime / (1000 * 60 * 60 * 24));

                // Target Date
                const targetDate = new Date(currentStart);
                targetDate.setDate(targetDate.getDate() + dayIndex);

                // Skip if target date is locked
                if (isDateLocked(targetDate)) return;

                newSchedules.push({
                    user_id: prev.user_id,
                    date: getLocalDateStr(targetDate),
                    shift: prev.shift,
                    status: prev.status
                });
            });

            if (newSchedules.length === 0) {
                showToast("No editable days found in this week's range.", "error");
                setRosterLoading(false);
                return;
            }

            // 4. Batch Save
            await userService.saveBatchSchedules(newSchedules);
            showToast(`Successfully duplicated ${newSchedules.length} assignments from previous week.`, "success");
            fetchSchedules();
        } catch (e: any) {
            console.error(e);
            showToast("Failed to duplicate roster", "error");
        } finally {
            setRosterLoading(false);
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
                return { ...prev, daysOff: prev.daysOff.filter((d: string) => d !== day) };
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

                // Skip locked dates in bulk apply
                if (isDateLocked(d)) continue;

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

            await userService.saveBatchSchedules(schedulesPayload);
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

    const handleYearMonthJump = (monthIndex: number, year: number) => {
        const newDate = new Date(year, monthIndex, 1);
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
            role: 'bantay_bayan',
        });
        setIsModalOpen(true);
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'deactivated' : 'active';
        try {
            await userService.updateUserStatus(id, newStatus as any);
            showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}.`, "success");
            fetchUsers();
        } catch (error) {
            showToast("Failed to update status", "error");
        }
    };

    const handleRoleChange = async (id: string, newRole: string) => {
        try {
            await userService.updateProfile(id, { role: newRole as UserRole });
            showToast(`User role updated to ${formatRoleName(newRole)}.`, "success");
            fetchUsers();
        } catch (error: any) {
            showToast(error.message || "Failed to update role", "error");
        }
    };

    const handleRejectUser = async (id: string) => {
        if (!confirm("Are you sure you want to reject this application?")) return;
        try {
            await userService.updateUserStatus(id, 'rejected');
            showToast("Application rejected.", "info");
            fetchUsers();
        } catch (error) {
            showToast("Failed to reject application", "error");
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm("Are you sure you want to PERMANENTLY delete this user account? This cannot be undone.")) return;
        try {
            await userService.deleteUser(id);
            showToast("User permanently deleted.", "success");
            fetchUsers();
        } catch (error) {
            showToast("Failed to delete user", "error");
        }
    };

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

    const handlePhotoAction = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                const image = await Camera.getPhoto({
                    quality: 90,
                    allowEditing: true,
                    resultType: CameraResultType.Uri,
                    source: CameraSource.Prompt
                });

                if (image.webPath) {
                    setImagePreview(image.webPath);
                    const response = await fetch(image.webPath);
                    const blob = await response.blob();
                    const file = new File([blob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    setSelectedFile(file);
                }
            } catch (error) {
                console.log('User cancelled or camera error', error);
            }
        } else {
            fileInputRef.current?.click();
        }
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
                avatarUrl = await userService.uploadAvatar(editingUser.id, selectedFile);
            }

            // ONLY update full_name and avatar_url; badge_number is now read-only in UI
            await userService.updateProfile(editingUser.id, {
                full_name: editFormData.full_name,
                avatar_url: avatarUrl
            });

            showToast("User details updated successfully", "success");
            fetchUsers();
            setIsEditModalOpen(false);
        } catch (error: any) {
            console.error("Update failed", error);
            showToast(error.message || "Failed to update profile", "error");
        } finally {
            setIsSavingEdit(false);
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
            const exists = users.some((u: UserProfile) => u.username === newUser.username || u.email === newUser.email);
            if (exists) {
                throw new Error("Username or Email is already in use (checked local cache).");
            }

            const isTaken = await userService.checkUsernameExists(newUser.username);
            if (isTaken) {
                throw new Error("Username is already taken.");
            }

            await userService.createUser(
                newUser.email,
                newUser.username,
                newUser.password,
                newUser.fullName,
                newUser.role
            );

            showToast("Account created successfully. User is Pending approval.", "success");
            setIsModalOpen(false);
            setNewUser({ email: '', username: '', password: '', fullName: '', role: 'bantay_bayan' });
            setActiveTab('pending');
            // Update list immediately
            fetchUsers();

        } catch (error: any) {
            console.error(error);
            alert("Registration Error: " + (error.message || "Database error. User might already exist."));
        } finally {
            setIsCreating(false);
        }
    }

    const currentWeekRange = getWeekRange(currentDate);
    const pendingUsers = users.filter((u: UserProfile) => u.status === 'inactive');
    const activeUsers = users.filter((u: UserProfile) => u.status === 'active' || u.status === 'deactivated');

    const filteredUsers = (activeTab === 'pending' ? pendingUsers : activeUsers).filter((u: UserProfile) => {
        const q = searchQuery.toLowerCase();
        return u.full_name.toLowerCase().includes(q) ||
            u.badge_number?.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q);
    });

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    // Filter available roles based on current user's permissions
    const getAvailableRoles = () => {
        const allRoles = [
            { id: 'barangay_captain', label: 'Barangay Captain' },
            { id: 'barangay_secretary', label: 'Barangay Secretary' },
            { id: 'barangay_kagawad', label: 'Barangay Kagawad' },
            { id: 'supervisor', label: 'Supervisor' },
            { id: 'bantay_bayan', label: 'Bantay Bayan' },
            { id: 'resident', label: 'Resident' },
            { id: 'guest', label: 'Guest' }
        ];

        if (isSupremeAdmin()) {
            return allRoles;
        } else if (user?.role === 'barangay_secretary' || user?.role === 'barangay_kagawad') {
            // High-Level Admins cannot assign 'Barangay Captain'
            return allRoles.filter(role => role.id !== 'barangay_captain');
        } else {
            // Supervisors and others (though UI should hide it) can see minimal roles
            return allRoles.filter(role => ['supervisor', 'bantay_bayan', 'resident', 'guest'].includes(role.id));
        }
    };

    const formatRoleName = (roleStr: string) => {
        return roleStr.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="Staff Directory"
                subtitle="Member Management • Post Proper Northside"
            >
                {(user?.role === 'barangay_captain' || user?.role === 'barangay_secretary' || user?.role === 'barangay_kagawad' || user?.role === 'supervisor') && (
                    <div className="flex bg-taguig-blue/5 dark:bg-white/5 p-2 rounded-2xl w-full xl:w-auto overflow-x-auto no-scrollbar border border-taguig-blue/10 shadow-sm">
                        <button
                            onClick={() => setActiveTab('personnel')}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center whitespace-nowrap ${activeTab === 'personnel'
                                ? 'bg-white dark:bg-slate-800 text-taguig-blue shadow-premium'
                                : 'text-slate-500 dark:text-slate-400 hover:text-taguig-blue dark:hover:text-white'
                                }`}
                        >
                            <Users size={16} className="mr-2" />
                            Directory
                        </button>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center whitespace-nowrap ${activeTab === 'pending'
                                ? 'bg-white dark:bg-slate-800 text-taguig-red shadow-premium'
                                : 'text-slate-500 dark:text-slate-400 hover:text-taguig-red dark:hover:text-white'
                                }`}
                        >
                            <span>Applications</span>
                            {pendingUsers.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-taguig-red text-white text-[9px] rounded-full shadow-sm">{pendingUsers.length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('roster')}
                            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center whitespace-nowrap ${activeTab === 'roster'
                                ? 'bg-white dark:bg-slate-800 text-taguig-blue shadow-premium'
                                : 'text-slate-500 dark:text-slate-400 hover:text-taguig-blue dark:hover:text-white'
                                }`}
                        >
                            <CalendarIcon size={16} className="mr-2" />
                            Duty Roster
                        </button>
                    </div>
                )}
            </PageHeader>

            {/* RENDER CONTENT BASED ON TAB */}

            {activeTab === 'personnel' || activeTab === 'pending' ? (
                /* --- PERSONNEL DIRECTORY / PENDING TAB --- */
                <div className="space-y-6">
                    {activeTab === 'personnel' && (
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="relative w-full md:max-w-md">
                                <label htmlFor="searchOfficers" className="sr-only">Search officer name, badge, or email</label>
                                <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                <input
                                    id="searchOfficers"
                                    type="text"
                                    placeholder="Search officer name, badge, or email..."
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white transition-all"
                                    value={searchQuery}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={fetchUsers}
                                    className="p-4 bg-white dark:bg-white/5 text-slate-400 dark:text-slate-400 rounded-2xl hover:bg-taguig-blue hover:text-white transition-all shadow-sm border border-slate-200 dark:border-white/10"
                                    title="Refresh List"
                                >
                                    <RefreshCw size={20} />
                                </button>
                                <button
                                    onClick={handleOpenModal}
                                    className="flex-1 md:flex-none bg-taguig-blue text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-taguig-navy hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-taguig-blue/20 flex items-center justify-center space-x-3"
                                >
                                    <Plus size={20} />
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
                                <div className="glass-panel rounded-[2.5rem] overflow-hidden shadow-premium border border-white dark:border-white/10 animate-fade-in relative z-10">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse whitespace-nowrap">
                                            <thead>
                                                <tr className="bg-taguig-blue/5 dark:bg-white/5 border-b border-taguig-blue/10 dark:border-white/10">
                                                    <th className="p-6 font-black text-taguig-blue dark:text-taguig-gold text-[10px] uppercase tracking-[0.2em]">{t.officer}</th>
                                                    <th className="p-6 font-black text-taguig-blue dark:text-taguig-gold text-[10px] uppercase tracking-[0.2em]">{t.role}</th>
                                                    <th className="p-6 font-black text-taguig-blue dark:text-taguig-gold text-[10px] uppercase tracking-[0.2em] hidden md:table-cell">{t.badgeId}</th>
                                                    <th className="p-6 font-black text-taguig-blue dark:text-taguig-gold text-[10px] uppercase tracking-[0.2em]">Assignment</th>
                                                    <th className="p-6 font-black text-taguig-blue dark:text-taguig-gold text-[10px] uppercase tracking-[0.2em] hidden lg:table-cell">Account</th>
                                                    <th className="p-6 font-black text-taguig-blue dark:text-taguig-gold text-[10px] uppercase tracking-[0.2em] text-right">{t.actions}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                                {filteredUsers.map((rowUser: UserProfile) => {
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
                                                                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 transition-colors ${liveStatus.dot}`}></span>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-slate-900 dark:text-white text-sm md:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{rowUser.full_name}</div>
                                                                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{rowUser.username ? `@${rowUser.username}` : rowUser.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-5">
                                                                {canEditRole(rowUser.role) ? (
                                                                    <select
                                                                        value={rowUser.role}
                                                                        onChange={(e) => handleRoleChange(rowUser.id, e.target.value)}
                                                                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 text-slate-700 dark:text-slate-300 transition-colors shadow-sm"
                                                                    >
                                                                        {getAvailableRoles().map((roleOption) => (
                                                                            <option key={roleOption.id} value={roleOption.id}>
                                                                                {roleOption.label}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                ) : (
                                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${rowUser.role.includes('barangay')
                                                                        ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
                                                                        : rowUser.role === 'supervisor'
                                                                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                                                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
                                                                        }`}>
                                                                        {formatRoleName(rowUser.role)}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-5 text-slate-700 dark:text-slate-300 font-mono text-sm font-semibold hidden md:table-cell">{rowUser.badge_number || '---'}</td>
                                                            <td className="p-5">
                                                                {rowUser.status === 'active' || rowUser.status === 'deactivated' ? (
                                                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm transition-all ${rowUser.status === 'deactivated' ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' : liveStatus.badge}`}>
                                                                        {rowUser.status === 'active' ? <Clock size={10} className="mr-1.5" /> : <UserX size={10} className="mr-1.5" />}
                                                                        {rowUser.status === 'deactivated' ? 'Deactivated' : liveStatus.label}
                                                                    </div>
                                                                ) : rowUser.status === 'rejected' ? (
                                                                    <span className="text-xs font-bold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full border border-red-200 dark:border-red-800 flex items-center w-fit">
                                                                        <X size={12} className="mr-1.5" />
                                                                        Rejected
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-800 flex items-center w-fit">
                                                                        <AlertTriangle size={12} className="mr-1.5" />
                                                                        Pending Review
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-5 hidden lg:table-cell">
                                                                <div className="flex items-center text-sm">
                                                                    {rowUser.status === 'active' || rowUser.status === 'deactivated' ? (
                                                                        <span className={`flex items-center font-bold ${rowUser.status === 'deactivated' ? 'text-slate-500 dark:text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                            {rowUser.status === 'active' ? <UserCheck size={16} className="mr-1.5" /> : <UserX size={16} className="mr-1.5" />}
                                                                            {rowUser.status === 'deactivated' ? 'Deactivated' : 'Approved'}
                                                                        </span>
                                                                    ) : rowUser.status === 'rejected' ? (
                                                                        <span className="flex items-center text-red-600 dark:text-red-400 font-bold">
                                                                            <UserX size={16} className="mr-1.5" /> Rejected
                                                                        </span>
                                                                    ) : (
                                                                        <span className="flex items-center text-slate-500 dark:text-slate-400 font-bold">
                                                                            <UserX size={16} className="mr-1.5" /> Pending
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
                                                                        className={`text-xs font-bold px-3 py-2 rounded-lg transition-all shadow-sm border flex items-center justify-center ${rowUser.status === 'active'
                                                                            ? 'bg-white dark:bg-slate-700 text-red-600 border-gray-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                                                                            : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                                                            }`}
                                                                    >
                                                                        {rowUser.status === 'active' ? 'Deactivate' : rowUser.status === 'deactivated' ? 'Activate' : 'Approve'}
                                                                    </button>

                                                                    {rowUser.status !== 'active' && (
                                                                        <>
                                                                            {rowUser.status === 'inactive' && (
                                                                                <button
                                                                                    onClick={() => handleRejectUser(rowUser.id)}
                                                                                    className="text-xs font-bold px-3 py-2 rounded-lg bg-white dark:bg-slate-700 text-orange-600 border border-slate-200 dark:border-slate-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-all shadow-sm"
                                                                                >
                                                                                    Reject
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={() => handleDeleteUser(rowUser.id)}
                                                                                className="p-2 text-red-600 hover:text-red-700 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors shadow-sm"
                                                                                title="Delete Permanently"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
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
                <div className="animate-fade-in space-y-6">

                    {/* Navigation & Controls */}
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-white dark:bg-white/5 p-6 rounded-[2rem] shadow-premium border border-taguig-blue/10 dark:border-white/10">
                        <div className="flex items-center space-x-5">
                            <div className="p-4 bg-taguig-blue/10 dark:bg-white/10 text-taguig-blue dark:text-taguig-gold rounded-2xl">
                                <CalendarRange size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-taguig-blue dark:text-white uppercase tracking-tight italic leading-tight">Weekly Schedule</h2>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mt-1">Personnel Shift Management</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-center">
                            <div className="flex bg-taguig-blue/5 dark:bg-white/5 p-1 rounded-2xl border border-taguig-blue/10">
                                <button
                                    onClick={() => changeWeek('prev')}
                                    className="p-3 text-slate-400 hover:text-taguig-blue transition-colors"
                                    title="Previous Week"
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <div className="px-6 py-2 flex flex-col items-center justify-center min-w-[180px]">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-taguig-blue/60 dark:text-taguig-gold/60 leading-none mb-1">Weekly Period</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white leading-none">
                                        {formatDateShort(currentWeekRange.start)} - {formatDateShort(currentWeekRange.end)}
                                    </span>
                                </div>

                                <button
                                    onClick={() => changeWeek('next')}
                                    className="p-3 text-slate-400 hover:text-taguig-blue transition-colors"
                                    title="Next Week"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCurrentDate(new Date())}
                                    className="px-6 py-4 bg-white dark:bg-white/5 text-taguig-blue dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-taguig-blue/10 shadow-sm hover:bg-taguig-blue/5 transition-all"
                                >
                                    Today
                                </button>

                                {user?.role === 'supervisor' && (
                                    <button
                                        onClick={handleDuplicatePreviousWeek}
                                        disabled={rosterLoading}
                                        className="px-6 py-4 bg-taguig-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-taguig-navy hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-taguig-blue/20 flex items-center space-x-2 disabled:opacity-50"
                                    >
                                        <Copy size={14} />
                                        <span>Clone Week</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Roster Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col min-h-[600px]">

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
                            <div className="flex-1 overflow-x-auto custom-scrollbar relative">
                                <table className="w-full border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-taguig-blue/5 dark:bg-white/5 border-b border-taguig-blue/10 dark:border-white/10 backdrop-blur-md">
                                            {/* Sticky Header Corner */}
                                            <th className="p-6 text-left min-w-[160px] md:min-w-[240px] sticky left-0 z-30 bg-white dark:bg-slate-900 border-r border-taguig-blue/10 dark:border-white/10 shadow-premium">
                                                <span className="text-[10px] font-black text-taguig-blue dark:text-taguig-gold uppercase tracking-[0.2em] pl-2">Personnel</span>
                                            </th>

                                            {/* Days Header */}
                                            {Array.from({ length: 7 }).map((_, i) => {
                                                const d = new Date(currentWeekRange.start);
                                                d.setDate(d.getDate() + i);
                                                const todayStr = getLocalDateStr(new Date());
                                                const currentStr = getLocalDateStr(d);
                                                const isToday = todayStr === currentStr;

                                                return (
                                                    <th key={i} className={`p-4 min-w-[140px] text-center border-r border-taguig-blue/10 dark:border-white/10 last:border-0 relative ${isToday ? 'bg-taguig-blue/10 dark:bg-taguig-blue/20' : ''}`}>
                                                        {isToday && <div className="absolute top-0 left-0 right-0 h-1.5 bg-taguig-blue"></div>}
                                                        <div className={`inline-flex flex-col items-center justify-center rounded-[1.25rem] px-5 py-3 ${isToday ? 'bg-taguig-blue text-white shadow-lg shadow-taguig-blue/30' : ''}`}>
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-white' : 'text-slate-400'}`}>
                                                                {d.toLocaleDateString('en-US', { weekday: 'short' })}
                                                            </span>
                                                            <span className={`text-xl font-black ${isToday ? 'text-white' : 'text-taguig-blue dark:text-taguig-gold'}`}>
                                                                {d.getDate()}
                                                            </span>
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {users.filter(u => u.status === 'active').map((rowUser) => (
                                            <tr key={rowUser.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                {/* Sticky Name Cell */}
                                                <td className="p-3 md:p-4 sticky left-0 z-20 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700 border-r border-slate-200 dark:border-slate-700 transition-colors shadow-[4px_0_24px_-4px_rgba(0,0,0,0.05)]">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="relative flex-shrink-0">
                                                            {rowUser.avatar_url ? (
                                                                <img src={rowUser.avatar_url} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-600 shadow-sm" alt="" />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-sm font-bold text-slate-500 dark:text-slate-300 border-2 border-white dark:border-slate-600 shadow-sm">
                                                                    {rowUser.full_name.charAt(0)}
                                                                </div>
                                                            )}
                                                            {/* Live Status Indicator - Red/Emerald/Orange/Slate */}
                                                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-slate-800 rounded-full ${getUserLiveStatus(rowUser.id).dot}`}></div>
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{rowUser.full_name}</p>
                                                            <p className="text-[10px] text-slate-400 font-mono tracking-wide truncate">{rowUser.badge_number || 'N/A'}</p>
                                                        </div>

                                                        {/* Supervisor Bulk Action */}
                                                        {user?.role === 'supervisor' && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleOpenBulk(rowUser); }}
                                                                className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white dark:bg-slate-600 text-slate-400 hover:text-blue-600 rounded-lg shadow-sm border border-slate-200 dark:border-slate-500 transition-all transform hover:scale-110"
                                                                title="Auto-fill Week"
                                                            >
                                                                <CalendarRange size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Schedule Cells */}
                                                {Array.from({ length: 7 }).map((_, i) => {
                                                    const d = new Date(currentWeekRange.start);
                                                    d.setDate(d.getDate() + i);
                                                    const todayStr = getLocalDateStr(new Date());
                                                    const currentStr = getLocalDateStr(d);
                                                    const isToday = todayStr === currentStr;
                                                    const isLocked = isDateLocked(d);

                                                    const schedule = getScheduleForCell(rowUser.id, i);

                                                    let content = (
                                                        <div className="w-full h-14 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center opacity-40 group-hover:opacity-100 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                                                            <Plus size={16} className="text-slate-400" />
                                                        </div>
                                                    );

                                                    if (schedule) {
                                                        if (schedule.status === 'Day Off') {
                                                            content = (
                                                                <div className="w-full h-14 rounded-xl bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.03)_10px,rgba(0,0,0,0.03)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)] border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Day Off</span>
                                                                </div>
                                                            );
                                                        } else if (schedule.status === 'Leave') {
                                                            content = (
                                                                <div className="w-full h-14 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 flex flex-col items-center justify-center shadow-sm">
                                                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">On Leave</span>
                                                                </div>
                                                            );
                                                        } else if (schedule.status === 'Road Clearing') {
                                                            content = (
                                                                <div className="w-full h-14 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
                                                                    <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-bl-lg"></div>
                                                                    <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase text-center leading-tight">Road<br />Clearing</span>
                                                                </div>
                                                            );
                                                        } else {
                                                            let bgClass = "";
                                                            let textClass = "";
                                                            let icon = null;
                                                            let label = "";

                                                            if (schedule.shift === '1st') {
                                                                bgClass = "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/50";
                                                                textClass = "text-indigo-700 dark:text-indigo-300";
                                                                icon = <Moon size={14} className="text-indigo-500" />;
                                                                label = "6am - 2pm";
                                                            } else if (schedule.shift === '2nd') {
                                                                bgClass = "bg-sky-50 dark:bg-sky-900/20 border-sky-100 dark:border-sky-900/50";
                                                                textClass = "text-sky-700 dark:text-sky-300";
                                                                icon = <Sun size={14} className="text-sky-500" />;
                                                                label = "2pm - 10pm";
                                                            } else {
                                                                bgClass = "bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-900/50";
                                                                textClass = "text-violet-700 dark:text-violet-300";
                                                                icon = <Sunset size={14} className="text-violet-500" />;
                                                                label = "10pm - 6am";
                                                            }

                                                            content = (
                                                                <div className={`w-full h-14 rounded-xl border ${bgClass} flex flex-col items-center justify-center relative overflow-hidden shadow-sm group-hover:shadow-md transition-shadow`}>
                                                                    <div className={`flex items-center space-x-1.5 text-xs font-bold ${textClass} mb-0.5`}>
                                                                        {icon}
                                                                        <span>{schedule.shift}</span>
                                                                    </div>
                                                                    <span className={`text-[10px] font-medium ${textClass} opacity-80`}>{label}</span>
                                                                </div>
                                                            );
                                                        }
                                                    }

                                                    return (
                                                        <td
                                                            key={i}
                                                            onClick={() => handleCellClick(rowUser.id, i)}
                                                            className={`p-2 border-r border-slate-50 dark:border-slate-800 transition-all relative
                                                      ${user?.role === 'supervisor' && !isLocked ? 'cursor-pointer' : 'cursor-not-allowed'}
                                                      ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}
                                                  `}
                                                        >
                                                            <div className={`transition-transform duration-200 ${user?.role === 'supervisor' && !isLocked ? 'active:scale-95' : ''}`}>
                                                                {isLocked && (
                                                                    <div className="absolute top-1 right-1 z-10 text-slate-300 dark:text-slate-600">
                                                                        <Lock size={10} />
                                                                    </div>
                                                                )}
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

            {/* Edit User Modal */}
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
                                <div className="relative group cursor-pointer" onClick={handlePhotoAction}>
                                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-xl bg-slate-100 dark:bg-slate-700 relative">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                                                <User size={48} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2.5 rounded-full shadow-lg hover:bg-blue-700 transition-colors border-2 border-white dark:border-slate-800">
                                        <CameraIcon size={16} />
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label htmlFor="editFullName" className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 ml-1">{t.fullName}</label>
                                    <input
                                        id="editFullName"
                                        required type="text"
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white font-semibold transition-all"
                                        value={editFormData.full_name}
                                        onChange={e => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="editBadgeId" className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 ml-1">{t.badgeId}</label>
                                    <input
                                        id="editBadgeId"
                                        readOnly
                                        type="text"
                                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 outline-none text-slate-500 dark:text-slate-500 font-mono transition-all cursor-not-allowed"
                                        value={editFormData.badge_number}
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

            {/* SINGLE EDIT SCHEDULE MODAL */}
            {editingSchedule && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-white dark:border-white/10 relative">
                        <div className="px-6 py-6 border-b border-taguig-blue/10 dark:border-white/5 bg-taguig-blue/5">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-taguig-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-taguig-blue/30">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-taguig-blue dark:text-white uppercase tracking-tight italic">Shift Assignment</h3>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                                        {editingSchedule.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                                <button onClick={() => setEditingSchedule(null)} className="ml-auto w-10 h-10 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-taguig-red transition-all"><X size={20} /></button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Officer Profile Overlay */}
                            <div className="flex items-center space-x-3 bg-taguig-blue/5 dark:bg-white/5 p-3 rounded-2xl border border-taguig-blue/10">
                                <div className="w-10 h-10 rounded-xl bg-taguig-blue text-white flex items-center justify-center font-black text-lg shadow-md">
                                    {editingSchedule.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest leading-none">Personnel</p>
                                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{editingSchedule.name}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 block">Duty Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'On Duty', label: 'On Duty', icon: Shield, color: 'emerald' },
                                        { id: 'Road Clearing', label: 'Road Ops', icon: Navigation, color: 'orange' },
                                        { id: 'Day Off', label: 'Day Off', icon: Moon, color: 'slate' },
                                        { id: 'Leave', label: 'On Leave', icon: AlertTriangle, color: 'red' }
                                    ].map((status) => {
                                        const isSat = editingSchedule.date.getDay() === 6;
                                        if (isSat && status.id === 'Day Off') return null;

                                        const isSelected = newStatus === status.id;
                                        return (
                                            <button
                                                key={status.id}
                                                onClick={() => setNewStatus(status.id as DutyStatus)}
                                                className={`flex items-center space-x-2.5 p-3 rounded-2xl border-2 transition-all ${isSelected
                                                    ? 'bg-taguig-blue text-white border-taguig-blue shadow-lg shadow-taguig-blue/20'
                                                    : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                                                    }`}
                                            >
                                                <status.icon size={16} />
                                                <span className="text-[11px] font-black uppercase tracking-widest">{status.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {(newStatus === 'On Duty' || newStatus === 'Road Clearing') && (
                                <div className="space-y-3 animate-slide-up">
                                    <label className="text-[10px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 block">Shift Schedule</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {[
                                            { id: '1st', label: '1st Shift', time: '0600H - 1400H', icon: Sunrise },
                                            { id: '2nd', label: '2nd Shift', time: '1400H - 2200H', icon: Sun },
                                            { id: '3rd', label: '3rd Shift', time: '2200H - 0600H', icon: Moon }
                                        ].map((shift) => {
                                            const isSelected = newShift === shift.id;
                                            return (
                                                <button
                                                    key={shift.id}
                                                    onClick={() => setNewShift(shift.id as ShiftType)}
                                                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all group ${isSelected
                                                        ? 'bg-white dark:bg-slate-800 border-taguig-blue shadow-premium'
                                                        : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-taguig-blue text-white' : 'bg-slate-200 dark:bg-white/10'}`}>
                                                            <shift.icon size={16} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className={`text-xs font-black uppercase tracking-widest ${isSelected ? 'text-taguig-blue dark:text-taguig-gold' : ''}`}>{shift.label}</p>
                                                            <p className="text-[10px] font-medium opacity-60 font-mono">{shift.time}</p>
                                                        </div>
                                                    </div>
                                                    {isSelected && <div className="w-5 h-5 bg-taguig-blue text-white rounded-full flex items-center justify-center"><Check size={12} strokeWidth={4} /></div>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleSaveSchedule}
                                disabled={isSavingSchedule}
                                className={`w-full mt-2 bg-taguig-blue text-white py-4 rounded-[2rem] font-black uppercase tracking-widest text-[13px] hover:bg-taguig-navy hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-taguig-blue/20 flex items-center justify-center space-x-2 ${isSavingSchedule ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isSavingSchedule ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        <span>Save Deployment</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Schedule Modal */}
            {bulkUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-white dark:border-white/10 relative">
                        <div className="px-6 py-6 border-b border-taguig-blue/10 dark:border-white/5 bg-taguig-blue/5">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-taguig-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-taguig-blue/30">
                                    <CalendarRange size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-taguig-blue dark:text-white uppercase tracking-tight italic">Weekly Deployment Pattern</h3>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Personnel: {bulkUser.name}</p>
                                </div>
                                <button onClick={() => setBulkUser(null)} className="ml-auto w-10 h-10 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-taguig-red transition-all"><X size={20} /></button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div>
                                <label htmlFor="bulkShift" className="text-[10px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 mb-2 block">Standard Shift Time</label>
                                <select
                                    id="bulkShift"
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-taguig-blue/10 outline-none text-slate-800 dark:text-white transition-all font-bold text-sm"
                                    value={bulkConfig.shift}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBulkConfig({ ...bulkConfig, shift: e.target.value as ShiftType })}
                                >
                                    <option value="1st">0600H - 1400H (1st Shift)</option>
                                    <option value="2nd">1400H - 2200H (2nd Shift)</option>
                                    <option value="3rd">2200H - 0600H (3rd Shift)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 mb-2 block">Fixed Rest Days</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {WEEKDAYS.map(day => (
                                        <button
                                            key={day}
                                            onClick={() => toggleDayOff(day)}
                                            className={`px-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${bulkConfig.daysOff.includes(day)
                                                ? 'bg-taguig-blue text-white shadow-md'
                                                : 'bg-slate-50 dark:bg-white/5 text-slate-400 border border-slate-100 dark:border-white/5'
                                                }`}
                                        >
                                            {day.substring(0, 3)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleBulkApply}
                                disabled={rosterLoading}
                                className={`w-full mt-2 bg-taguig-blue text-white py-4 rounded-[2rem] font-black uppercase tracking-widest text-[13px] hover:bg-taguig-navy hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-taguig-blue/20 flex items-center justify-center space-x-2 ${rosterLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {rosterLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Generating...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        <span>Generate Weekly Plan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE USER MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden border border-white dark:border-white/10 relative">
                        <div className="px-10 py-8 border-b border-taguig-blue/10 dark:border-white/5 bg-taguig-blue/5">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 bg-taguig-blue text-white rounded-2xl flex items-center justify-center shadow-lg shadow-taguig-blue/30">
                                    <UserCheck size={32} />
                                </div>
                                <div>
                                    <h3 className="font-black text-2xl text-taguig-blue dark:text-white uppercase tracking-tight italic">Enroll New Personnel</h3>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Official Account Provisioning</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="ml-auto w-10 h-10 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-taguig-red transition-all"><X size={20} /></button>
                            </div>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="newFullName" className="text-[10px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 mb-2 block">Full Name</label>
                                        <input
                                            id="newFullName"
                                            type="text"
                                            required
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-taguig-blue/10 outline-none text-slate-800 dark:text-white transition-all font-bold placeholder:text-slate-400"
                                            value={newUser.fullName}
                                            onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                                            placeholder="Juan de la Cruz"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="newUsername" className="text-[10px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 mb-2 block">Username</label>
                                        <input
                                            id="newUsername"
                                            type="text"
                                            required
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-taguig-blue/10 outline-none text-slate-800 dark:text-white transition-all font-bold placeholder:text-slate-400"
                                            value={newUser.username}
                                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                            placeholder="jdelacruz"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="newRole" className="text-[10px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 mb-2 block">Access Role</label>
                                        <select
                                            id="newRole"
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-taguig-blue/10 outline-none text-slate-800 dark:text-white transition-all font-bold font-display"
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        >
                                            <option value="bantay_bayan">Bantay Bayan</option>
                                            <option value="resident">Resident</option>
                                            <option value="guest">Guest</option>
                                            <option value="supervisor">Brgy. Official (Admin)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="newEmail" className="text-[10px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 mb-2 block">Email Address</label>
                                        <input
                                            id="newEmail"
                                            type="email"
                                            required
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-taguig-blue/10 outline-none text-slate-800 dark:text-white transition-all font-bold placeholder:text-slate-400"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            placeholder="juan@taguig.gov"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="newPassword" className="text-[10px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 mb-2 block">Temporary Password</label>
                                        <input
                                            id="newPassword"
                                            type="password"
                                            required
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-taguig-blue/10 outline-none text-slate-800 dark:text-white transition-all font-bold placeholder:text-slate-400"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                            placeholder="Minimum 8 characters"
                                        />
                                        <p className="text-[9px] text-slate-400 mt-2 ml-1 italic font-medium">Must include uppercase, number, and symbol.</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full mt-10 bg-taguig-blue text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm hover:bg-taguig-navy hover:scale-[1.02] transition-all shadow-xl shadow-taguig-blue/20 flex items-center justify-center space-x-3"
                            >
                                {isCreating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Enrolling...</span>
                                    </>
                                ) : (
                                    <>
                                        <UserCheck size={24} />
                                        <span>Create Account</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
