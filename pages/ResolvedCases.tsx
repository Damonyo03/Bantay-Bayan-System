
import React, { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { IncidentWithDetails } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Archive, MapPin, Clock, Printer, RotateCcw, AlertTriangle, CheckCircle, FileCheck } from 'lucide-react';
import { generateOfficialReport } from '../utils/pdfGenerator';
import { supabase } from '../lib/supabaseClient';

const ResolvedCases: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  
  const [archives, setArchives] = useState<IncidentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchArchives = async () => {
      setIsLoading(true);
      try {
          // Fetch both Resolved and Closed
          const data = await supabaseService.getIncidentsByStatus(['Resolved', 'Closed']);
          setArchives(data);
      } catch (error) {
          console.error("Failed to fetch archives", error);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
    fetchArchives();

    // Subscribe to changes in incidents so if a case is resolved, it appears here immediately
    const channel = supabase
      .channel('archives_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchArchives())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleReopen = async (incident: IncidentWithDetails) => {
      if (!confirm(`Are you sure you want to reopen Case #${incident.case_number}? It will be moved back to the Active Dashboard.`)) return;

      try {
          await supabaseService.updateIncident(incident.id, { status: 'Pending' });
          showToast("Case reopened and moved to Active Dashboard", "success");
          // Explicitly refresh to ensure UI updates immediately
          fetchArchives();
      } catch (err: any) {
          console.error(err);
          showToast("Failed to reopen case", "error");
      }
  };

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <header>
        {/* Dark Text for Light Mode */}
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
            <Archive className="mr-3 text-green-500 dark:text-green-400" />
            {t.archives}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-2">{t.resolvedCasesDesc}</p>
      </header>

      {isLoading ? (
         <div className="flex items-center justify-center h-64">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-white"></div>
         </div>
      ) : (
        <div className="grid gap-6">
            {archives.length === 0 && (
                <div className="glass-panel p-12 text-center rounded-3xl border-dashed border-gray-300 dark:border-slate-700 text-slate-400">
                    <FileCheck size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No resolved or closed cases found.</p>
                </div>
            )}

            {archives.map((incident) => (
                <div key={incident.id} className="glass-panel p-6 rounded-3xl border border-white/60 dark:border-white/10 hover:shadow-lg transition-all relative overflow-hidden">
                    {/* Status Strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${incident.status === 'Resolved' ? 'bg-green-500' : 'bg-gray-500'}`} />

                    <div className="pl-4 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center space-x-3 mb-2">
                                <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{incident.case_number}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                    incident.status === 'Resolved' 
                                    ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                                    : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                                }`}>
                                    {incident.status}
                                </span>
                                {incident.is_restricted_entry && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                                        Restricted
                                    </span>
                                )}
                            </div>
                            
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{incident.type}</h3>
                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-2xl">{incident.narrative}</p>
                            
                            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 font-bold pt-2 space-x-4">
                                <span className="flex items-center"><MapPin size={14} className="mr-1" />{incident.location}</span>
                                <span className="flex items-center"><Clock size={14} className="mr-1" />{new Date(incident.created_at).toLocaleDateString()}</span>
                                <span className="flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md">Officer: {incident.officer_name}</span>
                            </div>
                        </div>

                        <div className="flex flex-row lg:flex-col space-x-3 lg:space-x-0 lg:space-y-3 shrink-0">
                            <button 
                                onClick={() => generateOfficialReport(incident)}
                                className="flex-1 lg:w-40 flex items-center justify-center space-x-2 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                            >
                                <Printer size={16} />
                                <span>Print Report</span>
                            </button>

                            {user?.role === 'supervisor' && (
                                <button 
                                    onClick={() => handleReopen(incident)}
                                    className="flex-1 lg:w-40 flex items-center justify-center space-x-2 py-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-xl text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                                >
                                    <RotateCcw size={16} />
                                    <span>{t.reopenCase}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ResolvedCases;
