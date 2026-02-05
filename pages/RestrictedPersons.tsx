
import React, { useEffect, useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { useLanguage } from '../contexts/LanguageContext';
import { AlertOctagon, UserX, Calendar, FileText, Ban } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const RestrictedPersons: React.FC = () => {
  const { t } = useLanguage();
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestricted();
    
    // Subscribe to changes in incident parties or incidents
    const channel = supabase
    .channel('restricted_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_parties' }, () => fetchRestricted())
    .subscribe();

    return () => {
        supabase.removeChannel(channel);
    }
  }, []);

  const fetchRestricted = async () => {
      setLoading(true);
      try {
          const data = await supabaseService.getRestrictedPersons();
          setPeople(data);
      } catch (error) {
          console.error("Failed to fetch restricted list", error);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <header>
        {/* Dark Text for Light Mode */}
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
            <AlertOctagon className="mr-3 text-red-500" />
            {t.restrictedList}
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-2">{t.restrictedDesc}</p>
      </header>

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
                        <div key={person.id} className="glass-panel p-6 rounded-3xl border-l-4 border-l-red-500 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform border border-white/60 dark:border-white/10">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                 <Ban size={80} className="text-red-900"/>
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

                                <div className="space-y-3">
                                    <div className="bg-white/50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mb-1">Involved In</p>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{person.incidents?.type}</p>
                                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            <FileText size={12} className="mr-1"/>
                                            <span className="font-mono">{person.incidents?.case_number}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                                        <div className="flex items-center">
                                            <Calendar size={14} className="mr-1"/>
                                            {new Date(person.incidents?.created_at).toLocaleDateString()}
                                        </div>
                                        {person.age > 0 && <span>Age: {person.age}</span>}
                                    </div>
                                </div>
                             </div>
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
