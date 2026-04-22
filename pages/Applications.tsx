
import React, { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { UserProfile, UserRole } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
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
    ArrowRight,
    Eye,
    X,
    ExternalLink,
    Image as ImageIcon
} from 'lucide-react';
import PageHeader from '../components/PageHeader';

const Applications: React.FC = () => {
    const { showToast } = useToast();
    const { user, isHighLevelAdmin } = useAuth();
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('All');
    
    // ID Photo Modal State
    const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
    const [isIdModalOpen, setIsIdModalOpen] = useState(false);
    const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);

    const fetchPendingUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getPendingApplications();
            setPendingUsers(data);
        } catch (error) {
            showToast("Failed to fetch applications", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();

        const channel = userService.subscribeToNewRegistrations((newApp) => {
            showToast(`New registration attempt: ${newApp.full_name}`, "info");
            fetchPendingUsers();
        });

        return () => {
            userService.unsubscribe(channel);
        };
    }, []);

    const handleViewId = async (path: string) => {
        if (!path) return;
        setIsGeneratingUrl(true);
        try {
            const { data, error } = await supabase.storage
                .from('identity-docs')
                .createSignedUrl(path, 3600); // 1 hour link

            if (error) throw error;
            setIdPhotoUrl(data.signedUrl);
            setIsIdModalOpen(true);
        } catch (error) {
            showToast("Could not retrieve ID photo", "error");
        } finally {
            setIsGeneratingUrl(false);
        }
    };

    const handleApprove = async (id: string, name: string) => {
        try {
            await userService.approveApplication(id);
            showToast(`Application approved. ${name} is now an official member.`, "success");
            fetchPendingUsers();
        } catch (error) {
            showToast("Failed to approve application", "error");
        }
    };

    const handleReject = async (id: string, name: string) => {
        if (!confirm(`Reject application for ${name}? This will remove their registration attempt.`)) return;
        try {
            await userService.rejectApplication(id);
            showToast("Application rejected and removed from queue.", "info");
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
                title="Registration Queue" 
                subtitle="Isolated desk for reviewing new identity-verified membership requests" 
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
                        <div key={applicant.id} className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 shadow-premium hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden flex flex-col">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Shield size={80} />
                            </div>
                            
                            <div className="flex items-center space-x-5 mb-6">
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

                            <div className="space-y-3 mb-6">
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

                            {/* ID Photo Preview Section */}
                            <div className="mb-8 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                {applicant.valid_id_url ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-taguig-blue/20 rounded-xl flex items-center justify-center text-taguig-blue">
                                                <ImageIcon size={20} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Identity Doc Attached</span>
                                        </div>
                                        <button 
                                            onClick={() => handleViewId(applicant.valid_id_url!)}
                                            disabled={isGeneratingUrl}
                                            className="flex items-center space-x-2 px-4 py-2 bg-taguig-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-taguig-navy transition-all disabled:opacity-50"
                                        >
                                            <Eye size={14} />
                                            <span>{isGeneratingUrl ? 'Loading...' : 'View ID'}</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-3 opacity-50 italic">
                                        <AlertTriangle size={16} className="text-amber-500" />
                                        <span className="text-xs text-slate-400">No ID photo provided</span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-auto relative z-10">
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

            {/* ID Photo Modal */}
            {isIdModalOpen && idPhotoUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                            <h3 className="text-lg font-black uppercase italic tracking-tight dark:text-white">Identity Document Verification</h3>
                            <div className="flex items-center space-x-4">
                                <a 
                                    href={idPhotoUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 text-slate-400 hover:text-taguig-blue transition-colors"
                                    title="Open in new tab"
                                >
                                    <ExternalLink size={20} />
                                </a>
                                <button 
                                    onClick={() => setIsIdModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-8 flex justify-center bg-slate-50 dark:bg-black/20 min-h-[400px]">
                            <img 
                                src={idPhotoUrl} 
                                alt="Applicant ID" 
                                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-xl"
                            />
                        </div>
                        <div className="p-6 bg-slate-100 dark:bg-white/5 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Private Document • Access Logs Recorded</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Applications;
