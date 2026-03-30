import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { publicReportService } from '../services/publicReportService';
import { PublicReport } from '../types';
import PageHeader from '../components/PageHeader';
import { RefreshCw, Search, Shield, CheckCircle, Clock, XCircle, ChevronRight, MessageSquare, MapPin, User, FileText, AlertTriangle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportToExcel } from '../utils/excelExport';

const PublicReportsQueue: React.FC = () => {
    const { user, isSupremeAdmin } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    
    const [reports, setReports] = useState<PublicReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    useEffect(() => {
        const canView = isSupremeAdmin() || ['supervisor', 'bantay_bayan', 'barangay_captain', 'barangay_secretary', 'barangay_kagawad'].includes(user?.role || '');
        if (!canView) {
            navigate('/dashboard');
            return;
        }
        fetchAllReports();
    }, [user, navigate]);

    const fetchAllReports = async () => {
        setLoading(true);
        try {
            const data = await publicReportService.getAllReports();
            setReports(data);
        } catch (error) {
            showToast("Failed to fetch public reports.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: 'Acknowledged' | 'Rejected') => {
        setActionLoadingId(id);
        try {
            await publicReportService.updateReportStatus(id, newStatus);
            showToast(`Report ${newStatus.toLowerCase()} successfully.`, "success");
            fetchAllReports();
        } catch (error) {
            showToast("Failed to update status.", "error");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleConvertToIncident = async (report: PublicReport) => {
        // Ideally, this opens a modal to create an incident prepopulated with report data,
        // but for now, we just update the status to show it's being handled.
        setActionLoadingId(report.id);
        try {
            await publicReportService.updateReportStatus(report.id, 'Converted to Incident');
            showToast("Report marked as Converted to Incident. (Incident Creation Pending)", "success");
            fetchAllReports();
        } catch (error) {
            showToast("Failed to convert.", "error");
        } finally {
            setActionLoadingId(null);
        }
    };

    const filteredReports = reports.filter(r => {
        const matchesSearch = 
            r.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.narrative.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.submitter_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
            
        const matchesFilter = filterStatus === 'All' || r.status === filterStatus;
        
        return matchesSearch && matchesFilter;
    });

    const handleExportExcel = () => {
        const exportData = filteredReports.map(r => ({
            'Ref Number': r.reference_number,
            'Type': r.type,
            'Status': r.status,
            'Location': r.location,
            'Narrative': r.narrative,
            'Submitter Name': r.submitter_name || 'Anonymous',
            'Submitted At': new Date(r.created_at).toLocaleString()
        }));
        exportToExcel(exportData, 'Public_Reports');
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'Pending Review':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"><AlertTriangle size={12} className="mr-1.5" />{status}</span>;
            case 'Acknowledged':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"><CheckCircle size={12} className="mr-1.5" />{status}</span>;
            case 'Converted to Incident':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"><Shield size={12} className="mr-1.5" />{status}</span>;
            case 'Rejected':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20"><XCircle size={12} className="mr-1.5" />{status}</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in relative z-10 min-w-0">
            <PageHeader 
                title="Public Reports Queue" 
                subtitle="Review and manage concerns submitted by residents and guests" 
            />

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    {['All', 'Pending Review', 'Acknowledged', 'Converted to Incident', 'Rejected'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                filterStatus === status
                                    ? 'bg-taguig-blue text-white shadow-md'
                                    : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-taguig-navy border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            {status === 'All' ? 'All Reports' : status}
                            {status === 'Pending Review' && filterStatus !== 'Pending Review' && (
                                <span className="ml-2 bg-taguig-red text-white px-2 py-0.5 rounded-full text-[9px]">{reports.filter(r => r.status === 'Pending Review').length}</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white transition-all text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={fetchAllReports}
                        className="p-3 bg-white dark:bg-slate-800 text-slate-400 rounded-xl hover:text-taguig-blue border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center shrink-0"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 transition-all flex items-center justify-center shrink-0"
                        title="Export to Excel"
                    >
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-taguig-blue/30 border-t-taguig-blue rounded-full animate-spin" /></div>
            ) : filteredReports.length === 0 ? (
                <div className="glass-panel p-16 text-center border-dashed border-2 border-gray-300 dark:border-slate-700">
                    <div className="bg-gray-100 dark:bg-slate-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} className="text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No Reports Found</h3>
                    <p className="text-gray-500 mt-2">There are no reports matching your current filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredReports.map(report => (
                        <div key={report.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-white/5 relative flex flex-col h-full hover:border-taguig-blue/30 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{report.reference_number}</p>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{report.type}</h3>
                                </div>
                                <StatusBadge status={report.status} />
                            </div>

                            <div className="flex-1 space-y-4 mb-6">
                                <div className="flex items-start">
                                    <MapPin size={16} className="text-taguig-blue mt-0.5 mr-2 shrink-0" />
                                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{report.location}</p>
                                </div>
                                <div className="flex items-start">
                                    <MessageSquare size={16} className="text-slate-400 mt-0.5 mr-2 shrink-0" />
                                    <p className="text-sm text-slate-500 leading-relaxed italic line-clamp-3">"{report.narrative}"</p>
                                </div>
                                <div className="flex items-center pt-2">
                                    <User size={14} className="text-slate-400 mr-2 shrink-0" />
                                    <p className="text-xs text-slate-500 font-medium">By: {report.submitter_name}</p>
                                    <span className="mx-2 text-slate-300">•</span>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(report.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {report.status === 'Pending Review' && (
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                                    <button 
                                        onClick={() => handleUpdateStatus(report.id, 'Acknowledged')}
                                        disabled={actionLoadingId === report.id}
                                        className="flex-1 bg-taguig-blue/10 text-taguig-blue hover:bg-taguig-blue hover:text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                                    >
                                        Acknowledge
                                    </button>
                                    <button 
                                        onClick={() => handleUpdateStatus(report.id, 'Rejected')}
                                        disabled={actionLoadingId === report.id}
                                        className="bg-taguig-red/10 text-taguig-red hover:bg-taguig-red hover:text-white py-3 px-4 rounded-xl text-xs transition-all"
                                        title="Reject Report"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                </div>
                            )}

                            {report.status === 'Acknowledged' && (
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <button 
                                        onClick={() => handleConvertToIncident(report)}
                                        disabled={actionLoadingId === report.id}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20"
                                    >
                                        <Shield size={16} />
                                        <span>Convert to Official Incident</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PublicReportsQueue;
