import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { userService } from '../services/userService';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';
import { 
    Search, 
    User, 
    Shield, 
    AlertTriangle, 
    Users, 
    Download, 
    Eye, 
    X, 
    ExternalLink, 
    Image as ImageIcon,
    Mail,
    Phone,
    MapPin,
    Calendar,
    BadgeCheck,
    CreditCard
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

const ResidentDirectory: React.FC = () => {
    const { user, isHighLevelAdmin } = useAuth();
    const { showToast } = useToast();
    
    const [residents, setResidents] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Detail Modal State
    const [selectedResident, setSelectedResident] = useState<UserProfile | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
    const [isGeneratingUrl, setIsGeneratingUrl] = useState(false);

    useEffect(() => {
        const canView = isHighLevelAdmin() || ['supervisor', 'bantay_bayan', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad'].includes(user?.role || '');
        if (!canView) return;
        fetchResidents();
    }, [user]);

    const fetchResidents = async () => {
        setLoading(true);
        try {
            const data = await userService.getUsers();
            // Show only fully active residents in the directory. 
            const citizenData = data.filter(u => 
                ['guest', 'resident'].includes(u.role) && 
                u.status === 'active'
            );
            setResidents(citizenData);
        } catch (error) {
            showToast("Failed to fetch resident list.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (resident: UserProfile) => {
        setSelectedResident(resident);
        setIsModalOpen(true);
        setIdPhotoUrl(null);

        if (resident.valid_id_url) {
            setIsGeneratingUrl(true);
            try {
                const { data, error } = await supabase.storage
                    .from('identity-docs')
                    .createSignedUrl(resident.valid_id_url, 3600);
                
                if (error) throw error;
                setIdPhotoUrl(data.signedUrl);
            } catch (err) {
                console.error("Failed to get signed URL:", err);
            } finally {
                setIsGeneratingUrl(false);
            }
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
            'Area': r.area || 'N/A',
            'Full Address': r.address || 'N/A',
            'Contact Info': r.contact_info || 'N/A',
            'Role': r.role === 'resident' ? 'Verified Resident' : 'Guest',
            'Status': r.status,
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
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">Active</span>;
            case 'pending':
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-taguig-blue text-white shadow-sm shadow-taguig-blue/20">Pending</span>;
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
                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap px-4 text-center">Status</th>
                                <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap px-4 text-right">Actions</th>
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
                                        <td className="py-4 px-4 text-center">
                                            <StatusBadge status={resident.status} />
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center justify-end space-x-3">
                                                <button 
                                                    onClick={() => handleViewDetails(resident)}
                                                    className="p-2 text-slate-400 hover:text-taguig-blue hover:bg-taguig-blue/10 rounded-lg transition-all"
                                                    title="View Full Profile"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                
                                                {isHighLevelAdmin() && (
                                                    <select
                                                        value={resident.status}
                                                        onChange={e => handleStatusUpdate(resident.id, e.target.value as any)}
                                                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300 outline-none focus:border-taguig-blue transition-colors cursor-pointer"
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Suspend</option>
                                                        <option value="rejected">Reject</option>
                                                        <option value="deactivated">Deactivate</option>
                                                    </select>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Resident Detail Modal */}
            {isModalOpen && selectedResident && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-8 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center space-x-6">
                                <div className="w-20 h-20 rounded-[2rem] bg-taguig-blue/10 flex items-center justify-center text-taguig-blue shadow-inner border border-taguig-blue/20">
                                    <User size={40} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black uppercase italic tracking-tight dark:text-white leading-none mb-2">{selectedResident.full_name}</h3>
                                    <div className="flex items-center space-x-3">
                                        <RoleBadge role={selectedResident.role} />
                                        <StatusBadge status={selectedResident.status} />
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="grid lg:grid-cols-2 gap-0">
                            {/* Information Side */}
                            <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-taguig-blue">Contact Information</h4>
                                    <div className="grid gap-3">
                                        <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                                                <Mail size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email Address</p>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedResident.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                                                <Phone size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mobile Number</p>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedResident.contact_info || 'Not Provided'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-taguig-blue">Residency Details</h4>
                                    <div className="grid gap-3">
                                        <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                                                <MapPin size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Area / Vicinity</p>
                                                <p className="text-sm font-black text-taguig-blue uppercase">{selectedResident.area || 'Not Provided'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                                                <BadgeCheck size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Full Registered Address</p>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 italic">{selectedResident.address || 'Not Provided'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                                                <Calendar size={18} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Member Since</p>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{new Date(selectedResident.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ID Side */}
                            <div className="bg-slate-50 dark:bg-black/20 p-8 flex flex-col items-center justify-center border-l border-slate-100 dark:border-white/5">
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 self-start">Verification Document</h4>
                                
                                {selectedResident.valid_id_url ? (
                                    <div className="relative group w-full aspect-[16/10] bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-white/10">
                                        {isGeneratingUrl ? (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-8 h-8 border-4 border-taguig-blue/20 border-t-taguig-blue rounded-full animate-spin" />
                                            </div>
                                        ) : idPhotoUrl ? (
                                            <>
                                                <img 
                                                    src={idPhotoUrl} 
                                                    alt="Resident ID" 
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <a 
                                                        href={idPhotoUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center space-x-2 shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                                                    >
                                                        <ExternalLink size={14} />
                                                        <span>Full Preview</span>
                                                    </a>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                                                <ImageIcon size={48} className="mb-2" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Document Unavailable</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full aspect-[16/10] bg-slate-100 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-slate-400">
                                        <AlertTriangle size={48} className="mb-4 text-amber-500/50" />
                                        <p className="font-bold text-center px-10">This resident has not uploaded a valid ID for verification.</p>
                                    </div>
                                )}
                                
                                <div className="mt-8 flex items-center space-x-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <CreditCard size={14} />
                                    <span>Government Issued ID Proof</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 dark:bg-white/5 flex justify-between items-center border-t border-slate-100 dark:border-white/5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Administrative Data Privacy Policy Applies</p>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-lg"
                            >
                                Close Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResidentDirectory;
