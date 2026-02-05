
import React, { useState, useRef } from 'react';
import { Video, Printer, Save, CheckSquare, Square, RefreshCcw, Calendar, Clock, Shield } from 'lucide-react';
import { generateCCTVForm } from '../utils/pdfGenerator';

const CCTVRequestForm: React.FC = () => {
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleInitial: '',
    addressNo: '',
    street: '',
    barangay: 'Post Proper Northside',
    city: 'Taguig City',
    incidentTypes: [] as string[],
    others: '',
    dateOfIncident: '',
    timeOfIncident: '',
    placeOfIncident: '',
    purpose: ''
  });

  const [hasConsented, setHasConsented] = useState(false);

  // Refs for programmatic access to inputs
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const INCIDENT_OPTIONS = [
      'Robbery', 'Hold-up', 'Theft', 
      'Physical Injuries', 'Vehicle Accident', 'Budol-budol',
      'Carnapping', 'Murder', 'Lost Item/s'
  ];

  const handleCheckboxChange = (type: string) => {
      setFormData(prev => {
          if (prev.incidentTypes.includes(type)) {
              return { ...prev, incidentTypes: prev.incidentTypes.filter(t => t !== type) };
          } else {
              return { ...prev, incidentTypes: [...prev.incidentTypes, type] };
          }
      });
  };

  const handleChange = (field: string, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrint = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!hasConsented) {
          alert("You must acknowledge the Data Privacy Act compliance to proceed.");
          return;
      }

      if (!formData.lastName || !formData.firstName || !formData.dateOfIncident) {
          alert("Please fill in the required fields (Name, Incident Date)");
          return;
      }
      generateCCTVForm(formData);
  };

  const handleReset = () => {
      if(confirm("Clear form?")) {
        setFormData({
            lastName: '',
            firstName: '',
            middleInitial: '',
            addressNo: '',
            street: '',
            barangay: 'Post Proper Northside',
            city: 'Taguig City',
            incidentTypes: [],
            others: '',
            dateOfIncident: '',
            timeOfIncident: '',
            placeOfIncident: '',
            purpose: ''
        });
        setHasConsented(false);
      }
  };

  // Safe helper to open picker
  const openPicker = (e: React.MouseEvent, ref: React.RefObject<HTMLInputElement>) => {
    // Prevent double-trigger if clicking the input itself
    if (e.target === ref.current) return;
    
    if (ref.current) {
        try {
            if (typeof ref.current.showPicker === 'function') {
                ref.current.showPicker();
            } else {
                ref.current.focus();
            }
        } catch (error) {
            console.warn("Picker open failed:", error);
            ref.current.focus();
        }
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
            {/* Dark text for Light mode visibility */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
                <Video className="mr-3 text-red-500 dark:text-red-400" />
                CCTV Request Form
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2">Generate official request form for security footage.</p>
        </div>
      </header>

      <form className="glass-panel p-8 rounded-[2rem] shadow-xl space-y-8 border border-white/60 dark:border-white/10">
        
        {/* Requester Info */}
        <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">Requester Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Last Name</label>
                    <input 
                        type="text"
                        className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white"
                        value={formData.lastName}
                        onChange={e => handleChange('lastName', e.target.value)}
                    />
                </div>
                <div className="md:col-span-5">
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">First Name</label>
                    <input 
                        type="text"
                        className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white"
                        value={formData.firstName}
                        onChange={e => handleChange('firstName', e.target.value)}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">M.I.</label>
                    <input 
                        type="text"
                        maxLength={2}
                        className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white"
                        value={formData.middleInitial}
                        onChange={e => handleChange('middleInitial', e.target.value)}
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">House No. & Street</label>
                    <input 
                        type="text"
                        className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white"
                        value={formData.street}
                        onChange={e => handleChange('street', e.target.value)}
                        placeholder="e.g. 123 Kalayaan St."
                    />
                </div>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Barangay</label>
                        <input 
                            type="text"
                            className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            value={formData.barangay}
                            readOnly
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">City</label>
                        <input 
                            type="text"
                            className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                            value={formData.city}
                            readOnly
                        />
                    </div>
                </div>
            </div>
        </section>

        {/* Incident Type */}
        <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">Incident Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {INCIDENT_OPTIONS.map(option => (
                    <div 
                        key={option}
                        onClick={() => handleCheckboxChange(option)}
                        className={`cursor-pointer p-3 rounded-xl border flex items-center space-x-3 transition-all ${
                            formData.incidentTypes.includes(option) 
                            ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300' 
                            : 'bg-white/50 dark:bg-white/5 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        {formData.incidentTypes.includes(option) ? <CheckSquare size={20} /> : <Square size={20} />}
                        <span className="text-sm font-semibold">{option}</span>
                    </div>
                ))}
            </div>
            <div className="mt-4">
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Others (Specify)</label>
                <input 
                    type="text"
                    className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white"
                    value={formData.others}
                    onChange={e => handleChange('others', e.target.value)}
                />
            </div>
        </section>

        {/* Incident Details */}
        <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">Incident Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Date of Incident</label>
                    <div className="relative" onClick={(e) => openPicker(e, dateInputRef)}>
                        <Calendar className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
                        <input 
                            ref={dateInputRef}
                            type="date"
                            className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white font-medium cursor-pointer"
                            value={formData.dateOfIncident}
                            onChange={e => handleChange('dateOfIncident', e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Time of Incident</label>
                    <div className="relative" onClick={(e) => openPicker(e, timeInputRef)}>
                        <Clock className="absolute left-3 top-3.5 text-gray-400 pointer-events-none" size={18} />
                        <input 
                            ref={timeInputRef}
                            type="time"
                            className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white font-medium cursor-pointer"
                            value={formData.timeOfIncident}
                            onChange={e => handleChange('timeOfIncident', e.target.value)}
                        />
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Place of Incident</label>
                    <input 
                        type="text"
                        className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white"
                        value={formData.placeOfIncident}
                        onChange={e => handleChange('placeOfIncident', e.target.value)}
                        placeholder="Specific location or landmarks"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Purpose of Request</label>
                    <textarea 
                        className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 h-24 resize-none text-slate-800 dark:text-white"
                        value={formData.purpose}
                        onChange={e => handleChange('purpose', e.target.value)}
                        placeholder="Reason for requesting footage..."
                    />
                </div>
            </div>
        </section>

        {/* DATA PRIVACY CONSENT */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-start space-x-3">
            <input 
                type="checkbox"
                id="privacy-consent"
                checked={hasConsented}
                onChange={(e) => setHasConsented(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-0.5 border-gray-300"
            />
            <label htmlFor="privacy-consent" className="text-sm text-blue-900 dark:text-blue-300 leading-relaxed cursor-pointer">
                <span className="font-bold flex items-center mb-1"><Shield size={14} className="mr-1"/> Data Privacy Consent</span>
                I acknowledge that the personal data provided herein will be processed for the purpose of this CCTV request, in compliance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>. I agree to the storage and authorized use of this information.
            </label>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-white/10">
            <button 
                type="button"
                onClick={handleReset}
                className="text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700 dark:hover:text-white flex items-center space-x-2 px-4 py-2"
            >
                <RefreshCcw size={18} />
                <span>Reset Form</span>
            </button>
            <button 
                onClick={handlePrint}
                disabled={!hasConsented}
                className={`px-8 py-4 rounded-xl font-bold flex items-center space-x-2 shadow-lg transition-all ${
                    hasConsented 
                    ? 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-black dark:hover:bg-blue-700 hover:scale-105 shadow-slate-900/20' 
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                }`}
            >
                <Printer size={20} />
                <span>Generate & Print Form</span>
            </button>
        </div>

      </form>
    </div>
  );
};

export default CCTVRequestForm;
