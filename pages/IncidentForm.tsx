
import React, { useState } from 'react';
import { incidentService } from '../services/incidentService';
import { useAuth } from '../contexts/AuthContext';
import { IncidentType, IncidentParty, IncidentWithDetails, IncidentStatus } from '../types';
import { generateOfficialReport } from '../utils/pdfGenerator';
import { Plus, Trash2, Save, FileText, ChevronRight, UserPlus, Check, AlertOctagon, Printer, RotateCcw, Shield } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const IncidentForm: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastIncident, setLastIncident] = useState<IncidentWithDetails | null>(null);

  // Initial State Constants
  const initialFormData = {
    type: 'Medical' as IncidentType,
    narrative: '',
    location: '',
    status: 'Pending' as IncidentStatus,
    is_restricted_entry: false
  };

  // Step 1: Incident Data
  const [formData, setFormData] = useState(initialFormData);

  // Step 2: Parties Data
  const [parties, setParties] = useState<Omit<IncidentParty, 'id' | 'incident_id'>[]>([]);

  // Privacy Consent State
  const [hasConsented, setHasConsented] = useState(false);

  const handlePartyAdd = () => {
    setParties([...parties, { name: '', age: 0, role: 'Complainant', statement: '', contact_info: '' }]);
  };

  const handlePartyChange = (index: number, field: keyof IncidentParty, value: string | number) => {
    const newParties = [...parties];
    (newParties[index] as any)[field] = value;
    setParties(newParties);
  };

  const handlePartyRemove = (index: number) => {
    setParties(parties.filter((_, i: number) => i !== index));
  };

  const handleNewEntry = () => {
    setFormData(initialFormData);
    setParties([]);
    setLastIncident(null);
    setStep(1);
    setHasConsented(false);
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("Session expired. Please login again.");
      return;
    }

    if (!hasConsented) {
      alert("You must acknowledge the Data Privacy Act compliance to proceed.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Inject officer_id here to ensure it's current
      const payload = {
        ...formData,
        officer_id: user.id
      };

      const result = await incidentService.createIncidentReport(payload, parties);

      // Combine result with officer name for the printout
      const fullIncidentRecord = {
        ...result,
        officer_name: user.full_name,
      };

      setLastIncident(fullIncidentRecord);
      setStep(3);
    } catch (error) {
      console.error(error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-fade-in">
      <PageHeader
        title="Official Blotter"
        subtitle="Bantay Bayan Operations Registry • Post Proper Northside"
      />

      {/* Stepper */}
      <div className="flex items-center space-x-4 mb-12">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 space-y-2">
            <div className={`h-2 rounded-full transition-all duration-700 ${step >= s ? 'bg-taguig-blue shadow-lg shadow-taguig-blue/30' : 'bg-slate-200 dark:bg-white/10'}`} />
            <p className={`text-[10px] font-black uppercase tracking-widest text-center ${step >= s ? 'text-taguig-blue' : 'text-slate-400'}`}>
              {s === 1 ? 'Details' : s === 2 ? 'Parties' : 'Record'}
            </p>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 shadow-xl min-h-[500px] relative overflow-hidden border border-white/60 dark:border-white/10">

        {/* Step 1: Incident Details */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center">
              <FileText className="mr-3" /> Case Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Type of Problem (Uri)</label>
                <select
                  className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-500/20 outline-none transition-all font-medium text-slate-800 dark:text-white"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as IncidentType })}
                >
                  <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Medical</option>
                  <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Fire</option>
                  <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Theft</option>
                  <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Disturbance</option>
                  <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Traffic</option>
                  <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Logistics</option>
                  <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Location (Lugar)</label>
                <input
                  type="text"
                  className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-500/20 outline-none text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  value={formData.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Street, Block, Lot"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-2 ml-1">Action Taken</label>
                <select
                  className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-500/20 outline-none text-slate-800 dark:text-white"
                  value={formData.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value as IncidentStatus })}
                >
                  <option value="Pending" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Record Only (Pending)</option>
                  <option value="Dispatched" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Dispatch Patrol</option>
                  <option value="Resolved" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Amicably Settled</option>
                </select>
              </div>

              {/* Restricted Entry Flag - UPDATED TEXT & COLOR */}
              <div className="flex items-start p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id="restricted"
                    checked={formData.is_restricted_entry}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_restricted_entry: e.target.checked })}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300 dark:border-red-700 bg-white dark:bg-slate-800 cursor-pointer"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="restricted" className="font-bold text-red-700 dark:text-red-400 text-sm flex items-center cursor-pointer mb-1">
                    <AlertOctagon size={16} className="mr-2" />
                    Watchlist / Restricted Request
                  </label>
                  <p
                    className="text-xs text-red-600 dark:text-red-100/90 leading-relaxed cursor-pointer"
                    onClick={() => setFormData({ ...formData, is_restricted_entry: !formData.is_restricted_entry })}
                  >
                    Complainant requests that the respondent(s) be placed on the <span className="font-bold">Watchlist</span> due to hostile acts or threats. This will flag them for restricted entry monitoring.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-2 ml-1">Narrative (Salaysay)</label>
              <textarea
                className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 h-40 focus:ring-2 focus:ring-slate-500/20 outline-none resize-none font-normal leading-relaxed text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                value={formData.narrative}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, narrative: e.target.value })}
                placeholder="State the facts clearly..."
              />
            </div>

            <div className="flex justify-end pt-8">
              <button
                onClick={() => setStep(2)}
                className="w-full sm:w-auto flex items-center justify-center space-x-3 bg-taguig-blue text-white px-10 py-4 rounded-2xl hover:bg-taguig-navy hover:scale-[1.02] active:scale-[0.98] transition-all font-black uppercase tracking-widest text-sm shadow-xl shadow-taguig-blue/20"
              >
                <span>Continue</span>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Involved Parties */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                <UserPlus className="mr-3" /> Involved Persons
              </h2>
              <button
                onClick={handlePartyAdd}
                className="flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-bold"
              >
                <Plus size={16} />
                <span>Add Person</span>
              </button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {parties.length === 0 && (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl bg-gray-50/50 dark:bg-slate-800/50">
                  No parties recorded.
                </div>
              )}

              {parties.map((party, idx) => (
                <div key={idx} className="bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 p-6 rounded-2xl space-y-4 relative group hover:shadow-md transition-all">
                  <button
                    onClick={() => handlePartyRemove(idx)}
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4">
                      <label className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase mb-1 block">Full Name</label>
                      <input
                        type="text"
                        value={party.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePartyChange(idx, 'name', e.target.value)}
                        className="w-full bg-white/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none font-semibold text-slate-800 dark:text-white placeholder:text-slate-400"
                        placeholder="Last, First MI"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase mb-1 block">Age</label>
                      <input
                        type="number"
                        value={party.age || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePartyChange(idx, 'age', parseInt(e.target.value))}
                        className="w-full bg-white/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-800 dark:text-white"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase mb-1 block">Role</label>
                      <select
                        value={party.role}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePartyChange(idx, 'role', e.target.value)}
                        className="w-full bg-white/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-800 dark:text-white"
                      >
                        <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Complainant</option>
                        <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Respondent</option>
                        <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Suspect</option>
                        <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Witness</option>
                        <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Victim</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase mb-1 block">Contact #</label>
                      <input
                        type="text"
                        value={party.contact_info || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePartyChange(idx, 'contact_info', e.target.value)}
                        className="w-full bg-white/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-800 dark:text-white placeholder:text-slate-400"
                        placeholder="0912..."
                      />
                    </div>
                    <div className="md:col-span-12">
                      <label className="text-xs text-slate-500 dark:text-slate-300 font-bold uppercase mb-1 block">Statement / Remarks</label>
                      <input
                        type="text"
                        value={party.statement}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePartyChange(idx, 'statement', e.target.value)}
                        className="w-full bg-white/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none text-slate-800 dark:text-white placeholder:text-slate-400"
                        placeholder="Initial statement..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DATA PRIVACY CONSENT */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-start space-x-3 mt-4">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id="privacy-consent"
                  checked={hasConsented}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHasConsented(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 bg-white dark:bg-slate-800 cursor-pointer"
                />
              </div>
              <label htmlFor="privacy-consent" className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed cursor-pointer">
                <span className="font-bold flex items-center mb-1"><Shield size={14} className="mr-1" /> Data Privacy Consent</span>
                I certify that the involved parties have been informed and have consented to the collection and processing of their personal information for this official record, in accordance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>.
              </label>
            </div>

            <div className="flex justify-between pt-8 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={() => setStep(1)}
                className="text-slate-400 dark:text-slate-500 hover:text-taguig-blue font-black uppercase tracking-widest text-xs transition-colors px-6 py-4"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !hasConsented}
                className={`flex items-center space-x-3 px-10 py-4 rounded-2xl transition-all font-black uppercase tracking-widest text-sm shadow-xl ${!hasConsented
                  ? 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-taguig-blue text-white hover:bg-taguig-navy shadow-taguig-blue/30 active:scale-[0.98]'
                  }`}
              >
                {isSubmitting ? (
                  <span>Recording...</span>
                ) : (
                  <>
                    <Save size={18} />
                    <span>File Blotter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success & Export */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-12 animate-fade-in text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 text-green-600 dark:text-green-400 shadow-green-100 shadow-xl">
              <Check size={40} strokeWidth={3} />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Blotter Filed Successfully</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-2">Case Number: <span className="font-mono font-bold text-slate-800 dark:text-white">{lastIncident?.case_number}</span></p>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">The incident has been officially recorded in the barangay database.</p>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <button
                onClick={handleNewEntry}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all flex items-center justify-center space-x-2"
              >
                <RotateCcw size={18} />
                <span>New Entry</span>
              </button>
              <button
                onClick={() => lastIncident && generateOfficialReport(lastIncident)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-taguig-blue text-white font-black uppercase tracking-widest text-xs hover:bg-taguig-navy hover:scale-[1.05] transition-all flex items-center justify-center space-x-2 shadow-xl shadow-taguig-blue/20"
              >
                <Printer size={18} />
                <span>Print Record</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default IncidentForm;
