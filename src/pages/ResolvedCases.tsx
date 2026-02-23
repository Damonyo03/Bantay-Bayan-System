
import React, { useEffect, useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  CheckCircle, 
  MapPin, 
  User, 
  Calendar,
  FileText,
  ArrowRight
} from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { IncidentWithDetails } from '../types';
import { useToast } from '../contexts/ToastContext';

const ResolvedCases: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const data = await supabaseService.getIncidentsByStatus(['Resolved', 'Closed']);
      setIncidents(data);
    } catch (error: any) {
      console.error(error);
      showToast("Failed to load resolved cases", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidents = incidents.filter(i => 
    i.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.narrative.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
          <History className="mr-3 text-blue-600" />
          Resolved Cases
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">Historical record of all resolved and closed incidents.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by case number, location, or details..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredIncidents.map((inc) => (
          <div key={inc.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{inc.case_number}</h3>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-md text-slate-500 uppercase tracking-wider">{inc.type}</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-500 mt-1 space-x-4">
                    <div className="flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {new Date(inc.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <MapPin size={12} className="mr-1" />
                      {inc.location}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reporting Officer</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{inc.officer_name}</p>
                </div>
                <button className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 rounded-xl transition-colors">
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 italic">"{inc.narrative}"</p>
            </div>
          </div>
        ))}

        {filteredIncidents.length === 0 && (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <History size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Resolved Cases</h3>
            <p className="text-slate-500 mt-2">Closed incidents will appear here for historical reference.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResolvedCases;
