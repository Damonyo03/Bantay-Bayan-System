
import React, { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { UserProfile, UserRole } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    UserCheck, 
    UserX, 
    Search, 
    Filter, 
    RefreshCw, 
    Clock, 
    Shield, 
    User, 
    Mail, 
    AlertTriangle,
    BadgeCheck,
    ArrowRight
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

const Applications: React.FC = () => {
    const { showToast } = useToast();
    const { user, isHighLevelAdmin } = useAuth();
    const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('All');

    const fetchPendingUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getUsers();
            setPendingUsers(data.filter(u => u.status === 'inactive'));
        } catch (error) {
            showToast("Failed to fetch applications", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const handleApprove = async (id: string, name: string) => {
        try {
            await userService.updateUserStatus(id, 'active');
            showToast(`Application approved for ${name}`, "success");
            fetchPendingUsers();
        } catch (error) {
            showToast("Failed to approve application", "error");
        }
    };

    const handleReject = async (id: string, name: string) => {
        if (!confirm(`Reject application for ${name}?`)) return;
        try {
            await userService.updateUserStatus(id, 'rejected');
            showToast("Application rejected", "info");
            fetchPendingUsers();
        } catch (error) {
            showToast("Failed to reject application", "error");
        }
    };

    const filteredApplications = pendingUsers.filter(u => {
        const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             u.username?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'All' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const formatRole = (role: string) => {
        return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in relative z-10">
            <PageHeader 
                title="Registration Desk" 
                subtitle="Review and authorize new system membership requests" 
            />

            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text"
                        placeholder="Search applicants..."
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-taguig-blue/10 transition-all font-medium text-slate-800 dark:text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                    <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <Filter size={18} className="text-slate-400" />
                        <select 
                            className="bg-transparent outline-none text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 cursor-pointer"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                        >
                            <option value="All">All Types</option>
                            <option value="resident">Residents</option>
                            <option value="bantay_bayan">Security Officers</option>
                            <option value="guest">Guests</option>
                            <option value="supervisor">Supervisors</option>
                        </select>
                    </div>
                    
                    <button 
                        onClick={fetchPendingUsers}
                        className="p-4 bg-white dark:bg-slate-900 text-slate-400 hover:text-taguig-blue rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm transition-all"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-20">
                    <div className="w-10 h-10 border-4 border-taguig-blue/20 border-t-taguig-blue rounded-full animate-spin" />
                </div>
            ) : filteredApplications.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200 dark:border-white/5">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600">
                        <Clock size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Queue Clear</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">No pending registration requests found.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredApplications.map((applicant) => (
                        <div key={applicant.id} className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-premium hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Shield size={80} />
                            </div>
                            
                            <div className="flex items-center space-x-5 mb-8">
                                <div className="w-16 h-16 rounded-3xl bg-taguig-blue/10 flex items-center justify-center text-taguig-blue shadow-inner group-hover:scale-110 transition-transform duration-500">
                                    <User size={32} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xl font-black text-slate-900 dark:text-white truncate uppercase italic tracking-tight leading-none mb-1">{applicant.full_name}</h4>
                                    <div className="flex items-center text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                                        <Shield size={12} className="mr-1 text-taguig-blue" />
                                        {formatRole(applicant.role)}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                                        <Mail size={14} />
                                    </div>
                                    <span className="text-sm font-semibold truncate">{applicant.email}</span>
                                </div>
                                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                                        <Clock size={14} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Applied {new Date(applicant.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-10">
                                <button 
                                    onClick={() => handleReject(applicant.id, applicant.full_name)}
                                    className="flex items-center justify-center space-x-2 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 font-black uppercase tracking-widest text-[10px] transition-all"
                                >
                                    <UserX size={16} />
                                    <span>Reject</span>
                                </button>
                                <button 
                                    onClick={() => handleApprove(applicant.id, applicant.full_name)}
                                    className="flex items-center justify-center space-x-2 py-4 rounded-2xl bg-taguig-blue text-white shadow-lg shadow-taguig-blue/20 hover:bg-taguig-navy hover:scale-[1.02] active:scale-[0.98] font-black uppercase tracking-widest text-[10px] transition-all"
                                >
                                    <UserCheck size={16} />
                                    <span>Approve</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Applications;
