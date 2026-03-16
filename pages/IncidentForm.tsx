
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
          <div key={s} className="flex-1 space-y-3">
            <div className={`h-2 rounded-full transition-all duration-700 ${step >= s ? 'bg-taguig-navy shadow-lg shadow-taguig-navy/20' : 'bg-slate-200 dark:bg-white/10'}`} />
            <p className={`text-[10px] font-black uppercase tracking-widest text-center ${step >= s ? 'text-taguig-navy' : 'text-slate-400'}`}>
              {s === 1 ? 'Details' : s === 2 ? 'Parties' : 'Record'}
            </p>
          </div>
        ))}
      </div>

      <div className="card-premium rounded-2xl sm:rounded-[2rem] p-4 sm:p-10 shadow-sm min-h-[500px] relative overflow-hidden border border-slate-200 dark:border-white/10">

        {/* Step 1: Incident Details */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-8 flex items-center uppercase tracking-tight italic">
              <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg mr-4">
                <FileText className="text-taguig-navy dark:text-taguig-gold" size={24} />
              </div>
              Incident Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="incidentType" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/60 uppercase tracking-widest mb-2 ml-1">Type of Problem (Uri)</label>
                <select
                  id="incidentType"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-taguig-navy/10 outline-none transition-all font-bold text-slate-800 dark:text-white"
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
                <label htmlFor="location" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/60 uppercase tracking-widest mb-2 ml-1">Location (Lugar)</label>
                <input
                  id="location"
                  type="text"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-taguig-navy/10 outline-none text-slate-800 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  value={formData.location}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Street, Block, Lot"
                />
              </div>

              <div>
                <label htmlFor="actionTaken" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/60 uppercase tracking-widest mb-2 ml-1">Action Taken</label>
                <select
                  id="actionTaken"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 focus:ring-4 focus:ring-taguig-navy/10 outline-none text-slate-800 dark:text-white font-bold"
                  value={formData.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value as IncidentStatus })}
                >
                  <option value="Pending" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Record Only (Pending)</option>
                  <option value="Dispatched" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Dispatch Patrol</option>
                  <option value="Resolved" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Amicably Settled</option>
                </select>
              </div>

              {/* Restricted Entry Flag - UPDATED TEXT & COLOR */}
              <div className="flex items-start p-6 bg-taguig-red/[0.03] dark:bg-taguig-red/[0.05] border border-taguig-red/20 rounded-2xl">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id="restricted"
                    checked={formData.is_restricted_entry}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_restricted_entry: e.target.checked })}
                    className="w-5 h-5 text-taguig-red rounded focus:ring-taguig-red border-slate-300 dark:border-taguig-red/30 bg-white dark:bg-slate-800 cursor-pointer"
                  />
                </div>
                <div className="ml-4">
                  <label htmlFor="restricted" className="font-black text-taguig-red text-[10px] uppercase tracking-widest flex items-center cursor-pointer mb-2">
                    <AlertOctagon size={16} className="mr-2" />
                    Watchlist / Restricted Request
                  </label>
                  <p
                    className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed cursor-pointer"
                    onClick={() => setFormData({ ...formData, is_restricted_entry: !formData.is_restricted_entry })}
                  >
                    Complainant requests that the respondent(s) be placed on the <span className="font-bold text-taguig-red">Watchlist</span> due to hostile acts or threats. This will flag them for restricted entry monitoring.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="narrative" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/60 uppercase tracking-widest mb-2 ml-1">Narrative (Salaysay)</label>
              <textarea
                id="narrative"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 h-40 focus:ring-4 focus:ring-taguig-navy/10 outline-none resize-none font-medium leading-relaxed text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
                value={formData.narrative}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, narrative: e.target.value })}
                placeholder="State the facts clearly..."
              />
            </div>

            <div className="flex justify-end pt-8">
              <button
                onClick={() => setStep(2)}
                className="w-full sm:w-auto flex items-center justify-center space-x-3 bg-taguig-navy text-white px-10 py-5 rounded-[2rem] hover:bg-taguig-blue hover:scale-[1.02] active:scale-[0.98] transition-all font-black uppercase tracking-widest text-sm shadow-xl shadow-taguig-navy/20"
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
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center uppercase tracking-tight italic">
                <div className="p-2 bg-slate-100 dark:bg-white/10 rounded-lg mr-4">
                  <UserPlus className="text-taguig-navy dark:text-taguig-gold" size={24} />
                </div>
                Involved Persons
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
                <div className="text-center py-16 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/5">
                  <div className="mb-4 flex justify-center">
                    <UserPlus size={40} className="opacity-20" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest">No parties recorded yet.</p>
                </div>
              )}

              {parties.map((party, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-6 rounded-2xl space-y-4 relative group hover:shadow-md transition-all">
                  <button
                    onClick={() => handlePartyRemove(idx)}
                    className="absolute top-4 right-4 text-slate-300 hover:text-taguig-red transition-all transform hover:scale-110"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    <div className="md:col-span-4">
                      <label htmlFor={`party-name-${idx}`} className="text-[10px] text-slate-400 dark:text-taguig-gold/60 font-black uppercase tracking-widest mb-2 block ml-1">Full Name</label>
                      <input
                        id={`party-name-${idx}`}
                        type="text"
                        value={party.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePartyChange(idx, 'name', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-4 focus:ring-taguig-navy/10 outline-none transition-all font-bold text-slate-800 dark:text-white"
                        placeholder="Last, First MI"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor={`party-age-${idx}`} className="text-[10px] text-slate-400 dark:text-taguig-gold/60 font-black uppercase tracking-widest mb-2 block ml-1">Age</label>
                      <input
                        id={`party-age-${idx}`}
                        type="number"
                        value={party.age || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePartyChange(idx, 'age', parseInt(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-4 focus:ring-taguig-navy/10 outline-none text-slate-800 dark:text-white font-bold"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label htmlFor={`party-role-${idx}`} className="text-[10px] text-slate-400 dark:text-taguig-gold/60 font-black uppercase tracking-widest mb-2 block ml-1">Role</label>
                      <select
                        id={`party-role-${idx}`}
                        value={party.role}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePartyChange(idx, 'role', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-4 focus:ring-taguig-navy/10 outline-none text-slate-800 dark:text-white font-bold"
                      >
                        <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Complainant</option>
                        <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Respondent</option>
                        <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Suspect</option>
                        <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Witness</option>
                        <option className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Victim</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label htmlFor={`party-contact-${idx}`} className="text-[10px] text-slate-400 dark:text-taguig-gold/60 font-black uppercase tracking-widest mb-2 block ml-1">Contact #</label>
                      <input
                        id={`party-contact-${idx}`}
                        type="text"
                        value={party.contact_info || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePartyChange(idx, 'contact_info', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-4 focus:ring-taguig-navy/10 outline-none text-slate-800 dark:text-white font-bold"
                        placeholder="0912..."
                      />
                    </div>
                    <div className="md:col-span-12">
                      <label htmlFor={`party-statement-${idx}`} className="text-[10px] text-slate-400 dark:text-taguig-gold/60 font-black uppercase tracking-widest mb-2 block ml-1">Statement / Remarks</label>
                      <input
                        id={`party-statement-${idx}`}
                        type="text"
                        value={party.statement}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePartyChange(idx, 'statement', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-4 focus:ring-taguig-navy/10 outline-none text-slate-800 dark:text-white font-medium"
                        placeholder="Initial statement..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DATA PRIVACY CONSENT */}
            <div className="bg-taguig-navy/[0.02] dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl flex items-start space-x-4 mt-6">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id="privacy-consent"
                  checked={hasConsented}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHasConsented(e.target.checked)}
                  className="w-5 h-5 text-taguig-navy rounded focus:ring-taguig-navy border-slate-300 bg-white dark:bg-slate-800 cursor-pointer"
                />
              </div>
              <label htmlFor="privacy-consent" className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed cursor-pointer">
                <span className="font-black flex items-center mb-2 uppercase tracking-widest text-taguig-navy dark:text-taguig-gold"><Shield size={14} className="mr-2" /> Data Privacy Consent</span>
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
                className={`flex items-center space-x-3 px-10 py-5 rounded-[2rem] transition-all font-black uppercase tracking-widest text-sm shadow-xl ${!hasConsented
                  ? 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-taguig-navy text-white hover:bg-taguig-blue shadow-taguig-navy/20 active:scale-[0.98]'
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
            <div className="w-24 h-24 bg-green-50 dark:bg-green-900/10 rounded-full flex items-center justify-center mb-8 text-green-500 dark:text-green-400 shadow-sm border border-green-100 dark:border-green-900/20">
              <Check size={48} strokeWidth={3} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-3 uppercase tracking-tight italic">Success</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-2 font-bold">Case #<span className="font-mono text-slate-800 dark:text-white ml-2">{lastIncident?.case_number}</span></p>
            <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-sm text-sm">The incident has been officially recorded in the national security databank.</p>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <button
                onClick={handleNewEntry}
                className="w-full sm:w-auto px-10 py-5 rounded-[2rem] bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all flex items-center justify-center space-x-3"
              >
                <RotateCcw size={18} />
                <span>New Entry</span>
              </button>
              <button
                onClick={async () => {
                  if (lastIncident) {
                    setIsSubmitting(true);
                    try {
                      await generateOfficialReport(lastIncident);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                }}
                className="w-full sm:w-auto px-10 py-5 rounded-[2rem] bg-taguig-navy text-white font-black uppercase tracking-widest text-xs hover:bg-taguig-blue hover:scale-[1.02] transition-all flex items-center justify-center space-x-3 shadow-xl shadow-taguig-navy/20"
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
