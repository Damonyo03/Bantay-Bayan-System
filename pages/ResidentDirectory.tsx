import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { userService } from '../services/userService';
import { UserProfile } from '../types';
import PageHeader from '../components/PageHeader';
import { Search, User, Shield, AlertTriangle, Users, Download } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

const ResidentDirectory: React.FC = () => {
    const { user, isHighLevelAdmin } = useAuth();
    const { showToast } = useToast();
    
    const [residents, setResidents] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const canView = isHighLevelAdmin() || ['supervisor', 'bantay_bayan', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad'].includes(user?.role || '');
        if (!canView) return;
        fetchResidents();
    }, [user]);

    const fetchResidents = async () => {
        setLoading(true);
        try {
            const data = await userService.getUsers();
            // Show only active residents in the directory. 
            // New applications (inactive) are now managed in the Staff Directory's "Applications" tab.
            const citizenData = data.filter(u => ['guest', 'resident'].includes(u.role) && u.status !== 'inactive');
            setResidents(citizenData);
        } catch (error) {
            showToast("Failed to fetch resident list.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: 'active' | 'inactive' | 'rejected' | 'deactivated') => {
        if (!isHighLevelAdmin()) {
            showToast("You do not have permission to change status.", "error");
            return;
        }
        try {
            await userService.updateUserStatus(id, newStatus);
            showToast("User status updated successfully", "success");
            fetchResidents();
        } catch (error) {
            showToast("Failed to update status", "error");
        }
    };

    const filteredResidents = residents.filter(r => 
        r.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExportExcel = () => {
        const exportData = filteredResidents.map(r => ({
            'Full Name': r.full_name,
            'Username': r.username,
            'Email': r.email,
            'Role': r.role === 'resident' ? 'Verified Resident' : 'Guest',
            'Status': r.status,
            'Badge Number': r.badge_number || 'N/A',
            'Created At': new Date(r.created_at).toLocaleString()
        }));
        exportToExcel(exportData, 'Citizen_Roster');
    };

    const RoleBadge = ({ role }: { role: string }) => {
        if (role === 'resident') {
            return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">Verified Resident</span>;
        }
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Guest</span>;
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'active':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-emerald-500 text-white">Active</span>;
            case 'inactive':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-amber-500 text-white">Inactive</span>;
            case 'rejected':
            case 'deactivated':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-red-500 text-white">{status}</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in relative z-10 min-w-0">
            <PageHeader 
                title="Registered Citizens" 
                subtitle="Directory of verified residents and community guests" 
            />

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 lg:p-8 shadow-xl border border-slate-200 dark:border-white/10 relative overflow-hidden">
                
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6 z-10 relative">
                    <h2 className="text-xl font-bold font-display uppercase tracking-tight text-slate-800 dark:text-white flex items-center">
                        <Users className="text-taguig-blue mr-2" />
                        Citizen Roster
                        <span className="ml-3 bg-taguig-blue/10 text-taguig-blue text-xs font-black px-2 py-0.5 rounded-lg">{filteredResidents.length}</span>
                    </h2>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search names or emails..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-taguig-blue/20 outline-none text-slate-800 dark:text-white transition-all text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleExportExcel}
                            className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 transition-all flex items-center justify-center shrink-0"
                            title="Export to Excel"
                        >
                            <Download size={18} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-100 dark:border-white/10">
                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap px-4">Citizen Name</th>
                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap px-4">Role</th>
                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap px-4">Status & Access</th>
                                {isHighLevelAdmin() && <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap px-4 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400">
                                        <div className="flex justify-center"><div className="w-6 h-6 border-2 border-taguig-blue/30 border-t-taguig-blue rounded-full animate-spin" /></div>
                                    </td>
                                </tr>
                            ) : filteredResidents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <AlertTriangle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-slate-500 font-medium">No citizens found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredResidents.map(resident => (
                                    <tr key={resident.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-taguig-blue/10 border border-taguig-blue/20 flex items-center justify-center text-taguig-blue font-bold shrink-0">
                                                    {resident.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{resident.full_name}</p>
                                                    <p className="text-[10px] font-medium text-slate-500 mt-0.5">{resident.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <RoleBadge role={resident.role} />
                                        </td>
                                        <td className="py-4 px-4">
                                            <StatusBadge status={resident.status} />
                                        </td>
                                        {isHighLevelAdmin() && (
                                            <td className="py-4 px-4 text-right">
                                                <select
                                                    value={resident.status}
                                                    onChange={e => handleStatusUpdate(resident.id, e.target.value as any)}
                                                    className="bg-transparent border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300 outline-none focus:border-taguig-blue transition-colors"
                                                >
                                                    <option value="active">Approve (Active)</option>
                                                    <option value="inactive">Suspend (Inactive)</option>
                                                    <option value="rejected">Reject</option>
                                                </select>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ResidentDirectory;
