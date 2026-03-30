import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { publicReportService } from '../services/publicReportService';
import { PublicReport, IncidentType } from '../types';
import PageHeader from '../components/PageHeader';
import { Shield, Send, Clock, CheckCircle, XCircle, FileText, MapPin, AlertCircle } from 'lucide-react';

const PublicServiceRequest: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    
    const [reports, setReports] = useState<PublicReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        type: 'Disturbance' as IncidentType,
        location: '',
        narrative: ''
    });

    useEffect(() => {
        if (user) {
            fetchMyReports();
        }
    }, [user]);

    const fetchMyReports = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await publicReportService.getMyReports(user.id);
            setReports(data);
        } catch (error) {
            showToast("Failed to fetch your reports.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        setIsSubmitting(true);
        try {
            await publicReportService.createReport(
                formData.type,
                formData.narrative,
                formData.location,
                user.id
            );
            showToast("Report submitted successfully. We will review it shortly.", "success");
            setFormData({ type: 'Disturbance', location: '', narrative: '' });
            fetchMyReports();
        } catch (error) {
            showToast("Failed to submit report. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'Pending Review':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"><Clock size={12} className="mr-1.5" />{status}</span>;
            case 'Acknowledged':
            case 'Converted to Incident':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"><CheckCircle size={12} className="mr-1.5" />{status}</span>;
            case 'Rejected':
                return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20"><XCircle size={12} className="mr-1.5" />{status}</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in relative z-10 min-w-0">
            <PageHeader 
                title="Public Service Requests" 
                subtitle="Submit incident reports and community concerns directly to Bantay Bayan" 
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-taguig-blue/5 rounded-bl-[100px] pointer-events-none" />
                        <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic mb-6 flex items-center">
                            <AlertCircle className="mr-2 text-taguig-blue" />
                            Submit a Report
                        </h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 mb-2 block">Incident Type</label>
                                <select 
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-taguig-blue/10 outline-none text-slate-800 dark:text-white transition-all font-bold"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as IncidentType })}
                                >
                                    <option value="Medical" className="dark:bg-slate-800">Medical Emergency</option>
                                    <option value="Fire" className="dark:bg-slate-800">Fire Incident</option>
                                    <option value="Theft" className="dark:bg-slate-800">Theft / Crime</option>
                                    <option value="Disturbance" className="dark:bg-slate-800">Public Disturbance</option>
                                    <option value="Traffic" className="dark:bg-slate-800">Traffic Issue</option>
                                    <option value="Logistics" className="dark:bg-slate-800">Community Request</option>
                                    <option value="Other" className="dark:bg-slate-800">Other</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 mb-2 block">Location</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text"
                                        required
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 pl-12 focus:ring-4 focus:ring-taguig-blue/10 outline-none text-slate-800 dark:text-white transition-all font-bold placeholder:text-slate-400"
                                        placeholder="Specific address or landmark"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-black text-taguig-blue/60 dark:text-taguig-gold/60 uppercase tracking-widest ml-1 mb-2 block">Narrative Details</label>
                                <textarea 
                                    required
                                    rows={4}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-taguig-blue/10 outline-none text-slate-800 dark:text-white transition-all font-medium placeholder:text-slate-400 resize-none"
                                    placeholder="Please provide full details of what happened..."
                                    value={formData.narrative}
                                    onChange={e => setFormData({ ...formData, narrative: e.target.value })}
                                />
                            </div>
                            
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full mt-4 bg-taguig-blue text-white py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-sm hover:bg-taguig-navy hover:scale-[1.02] transition-all shadow-xl shadow-taguig-blue/20 flex items-center justify-center space-x-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Submitting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        <span>Submit Report</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
                
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-white/5 relative overflow-hidden h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic flex items-center">
                                <FileText className="mr-2 text-taguig-blue" />
                                My Reports History
                            </h2>
                            <span className="text-xs font-bold text-slate-400">{reports.length} Total</span>
                        </div>
                        
                        {loading ? (
                            <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-taguig-blue/30 border-t-taguig-blue rounded-full animate-spin" /></div>
                        ) : reports.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50 dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                <Shield className="mx-auto h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No reports submitted yet</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Your submitted incidents and requests will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {reports.map((report) => (
                                    <div key={report.id} className="p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 hover:border-taguig-blue/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center space-x-3 mb-2">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{report.reference_number}</span>
                                                <StatusBadge status={report.status} />
                                            </div>
                                            <h4 className="font-bold text-lg text-slate-800 dark:text-white break-words">{report.type} at {report.location}</h4>
                                            <p className="text-sm text-slate-500 line-clamp-2 mt-1">{report.narrative}</p>
                                        </div>
                                        <div className="text-left md:text-right shrink-0">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Submitted</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {new Date(report.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicServiceRequest;
