import React, { useEffect, useState } from 'react';
import { incidentService } from '../services/incidentService';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AlertOctagon, UserX, Calendar, FileText, Ban, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';

const RestrictedPersons: React.FC = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { showToast } = useToast();

    const [people, setPeople] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchRestricted();

        const channel = supabase
            .channel('restricted_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_parties' }, () => fetchRestricted())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchRestricted())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, []);

    const fetchRestricted = async () => {
        try {
            const data = await incidentService.getRestrictedPersons();
            setPeople(data);
        } catch (error) {
            console.error("Failed to fetch restricted list", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearRestriction = async (person: any) => {
        if (user?.role !== 'supervisor') {
            showToast("Unauthorized: Access Restricted to Supervisors.", "error");
            return;
        }

        if (!person.incident_id) {
            showToast("Error: Missing incident ID for this record.", "error");
            return;
        }

        if (!confirm(`Are you sure you want to remove ${person.name} from the Watchlist?`)) return;

        setProcessingId(person.id);
        try {
            await incidentService.clearRestrictedStatus(person.incident_id);

            showToast(`Watchlist cleared for Case #${person.incidents?.case_number}.`, "success");

            // Optimistic UI Update
            setPeople(prev => prev.filter(p => p.incident_id !== person.incident_id));

        } catch (error: any) {
            console.error("Clear error:", error);
            showToast(error.message || "Failed to update status. Check permissions.", "error");
            fetchRestricted();
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title={t.restrictedList}
                subtitle={t.restrictedDesc}
                icon={AlertOctagon}
            />

            {loading ? (
                <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-white"></div></div>
            ) : (
                <>
                    {people.length === 0 ? (
                        <div className="glass-panel p-12 text-center rounded-3xl border-dashed border-gray-300 dark:border-slate-700 text-slate-400">
                            <UserX size={48} className="mx-auto mb-4 opacity-30" />
                            <p>No restricted individuals found on record.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {people.map((person) => (
                                <div key={person.id} className="glass-panel p-6 rounded-3xl border-l-4 border-l-red-500 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform border border-white/60 dark:border-white/10 flex flex-col justify-between">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                        <Ban size={80} className="text-red-900" />
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex items-center space-x-3 mb-4">
                                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-700 dark:text-red-400 font-bold shadow-sm">
                                                <UserX size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{person.name}</h3>
                                                <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wide">{person.role.toUpperCase()}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                                                <FileText size={16} className="mr-2 text-slate-400" />
                                                <span className="font-mono font-bold">{person.incidents?.case_number}</span>
                                            </div>
                                            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                                                <AlertOctagon size={16} className="mr-2 text-slate-400" />
                                                <span>{person.incidents?.type}</span>
                                            </div>
                                            <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                                                <Calendar size={16} className="mr-2 text-slate-400" />
                                                <span>{new Date(person.incidents?.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-2">
                                                    "{person.statement || person.incidents?.narrative}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {user?.role === 'supervisor' && (
                                        <button
                                            onClick={() => handleClearRestriction(person)}
                                            disabled={processingId === person.id}
                                            className="relative z-10 w-full flex items-center justify-center space-x-2 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-white hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-all shadow-sm disabled:opacity-70"
                                        >
                                            {processingId === person.id ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    <span>Updating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck size={16} />
                                                    <span>Clear Watchlist Status</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RestrictedPersons;
