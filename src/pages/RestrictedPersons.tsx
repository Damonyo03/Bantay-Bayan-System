
import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  Search, 
  UserX, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  FileText,
  ExternalLink
} from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';

const RestrictedPersons: React.FC = () => {
  const [persons, setPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      const data = await supabaseService.getRestrictedPersons();
      setPersons(data);
    } catch (error: any) {
      console.error(error);
      showToast("Failed to load restricted list", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredPersons = persons.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.incidents?.case_number.toLowerCase().includes(searchQuery.toLowerCase())
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
          <ShieldAlert className="mr-3 text-red-600" />
          Restricted Persons
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">Individuals flagged for restricted entry due to ongoing investigations or past incidents.</p>
      </header>

      <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-6 rounded-3xl flex items-start space-x-4">
        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-600">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="font-bold text-red-900 dark:text-red-400">Security Notice</h3>
          <p className="text-sm text-red-700 dark:text-red-500/80 mt-1">
            The individuals listed below are currently flagged. Verify identification and consult with a supervisor before allowing entry or interaction.
          </p>
        </div>
      </div>

      <div className="relative w-full md:max-w-md">
        <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search by name or case number..." 
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/20 outline-none text-slate-800 dark:text-white transition-all"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPersons.map((person) => (
          <div key={person.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-red-200 dark:hover:border-red-900/50 transition-all group">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 border border-red-100 dark:border-red-900/30">
                <UserX size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">{person.name}</h3>
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-[10px] font-black text-red-700 dark:text-red-400 rounded-md uppercase tracking-wider">
                  {person.role}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linked Case</span>
                  <span className="text-xs font-mono font-bold text-blue-600">{person.incidents?.case_number}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                  "{person.incidents?.narrative}"
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <div className="flex items-center">
                  <Clock size={12} className="mr-1" />
                  {new Date(person.incidents?.created_at).toLocaleDateString()}
                </div>
                <button className="flex items-center text-blue-600 font-bold hover:underline">
                  View Case <ExternalLink size={12} className="ml-1" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredPersons.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <ShieldAlert size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Restricted Persons</h3>
            <p className="text-slate-500 mt-2">The restricted list is currently clear.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestrictedPersons;
