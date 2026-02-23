
import React, { useState } from 'react';
import { 
  FileText, 
  MapPin, 
  User, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle,
  Clock,
  Shield,
  Loader2
} from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { IncidentType, IncidentStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

const IncidentForm: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    type: 'Medical' as IncidentType,
    location: '',
    narrative: '',
    status: 'Pending' as IncidentStatus,
    is_restricted_entry: false
  });

  const [parties, setParties] = useState<any[]>([]);

  const addParty = () => {
    setParties([...parties, { name: '', age: '', role: 'Complainant', statement: '', contact_info: '' }]);
  };

  const removeParty = (index: number) => {
    setParties(parties.filter((_, i) => i !== index));
  };

  const updateParty = (index: number, field: string, value: any) => {
    const newParties = [...parties];
    newParties[index][field] = value;
    setParties(newParties);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await supabaseService.createIncidentReport(
        {
          ...formData,
          officer_id: user.id
        },
        parties.map(p => ({ ...p, age: parseInt(p.age) || 0 }))
      );
      showToast("Incident report created successfully", "success");
      navigate('/');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to create report", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">New Incident Report</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Document a new incident or emergency response.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <h2 className="text-xl font-bold flex items-center">
            <Shield className="mr-3 text-blue-600" size={24} />
            Incident Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Incident Type</label>
              <select 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as IncidentType})}
              >
                <option value="Medical">Medical Emergency</option>
                <option value="Fire">Fire Incident</option>
                <option value="Theft">Theft / Robbery</option>
                <option value="Disturbance">Public Disturbance</option>
                <option value="Traffic">Traffic Accident</option>
                <option value="Logistics">Logistics Support</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="Street, Landmark, or Area"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Narrative / Description</label>
            <textarea 
              required
              rows={5}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
              placeholder="Provide a detailed account of the incident..."
              value={formData.narrative}
              onChange={e => setFormData({...formData, narrative: e.target.value})}
            />
          </div>

          <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
            <input 
              type="checkbox"
              id="restricted"
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={formData.is_restricted_entry}
              onChange={e => setFormData({...formData, is_restricted_entry: e.target.checked})}
            />
            <label htmlFor="restricted" className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Flag for Restricted Entry (Suspect/Respondent will be added to Restricted List)
            </label>
          </div>
        </section>

        {/* Involved Parties */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center">
              <User className="mr-3 text-blue-600" size={24} />
              Involved Parties
            </h2>
            <button 
              type="button"
              onClick={addParty}
              className="flex items-center space-x-2 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-xl transition-all"
            >
              <Plus size={18} />
              <span>Add Person</span>
            </button>
          </div>

          <div className="space-y-6">
            {parties.map((party, index) => (
              <div key={index} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 relative animate-slide-up">
                <button 
                  type="button"
                  onClick={() => removeParty(index)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                      value={party.name}
                      onChange={e => updateParty(index, 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Age</label>
                    <input 
                      type="number"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                      value={party.age}
                      onChange={e => updateParty(index, 'age', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Role</label>
                    <select 
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                      value={party.role}
                      onChange={e => updateParty(index, 'role', e.target.value)}
                    >
                      <option value="Complainant">Complainant</option>
                      <option value="Victim">Victim</option>
                      <option value="Witness">Witness</option>
                      <option value="Respondent">Respondent</option>
                      <option value="Suspect">Suspect</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Statement</label>
                  <textarea 
                    rows={3}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                    placeholder="Brief summary of their statement..."
                    value={party.statement}
                    onChange={e => updateParty(index, 'statement', e.target.value)}
                  />
                </div>
              </div>
            ))}

            {parties.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <p className="text-slate-500">No parties added yet. Click "Add Person" to include involved individuals.</p>
              </div>
            )}
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center space-x-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            <span>Submit Report</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default IncidentForm;
