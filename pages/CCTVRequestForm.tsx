
import React, { useState, useRef } from 'react';
import { resourceService } from '../services/resourceService';
import { Video, Printer, CheckSquare, Square, RefreshCcw, Calendar, Clock, Shield, Save, ArrowRight } from 'lucide-react';
import { generateCCTVForm } from '../utils/pdfGenerator';
import { CCTVRequest } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

const CCTVRequestForm: React.FC = () => {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
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

    const handleChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleProcess = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!hasConsented) {
            alert("You must acknowledge the Data Privacy Act compliance to proceed.");
            return;
        }

        if (!formData.lastName || !formData.firstName || !formData.dateOfIncident || !formData.purpose) {
            alert("Please fill in the required fields (Name, Incident Date, Purpose)");
            return;
        }

        setIsSubmitting(true);
        try {
            let incidentTypeStr = formData.incidentTypes.join(', ');
            if (formData.others) incidentTypeStr += (incidentTypeStr ? ', ' : '') + formData.others;

            const payload: CCTVRequest = {
                id: crypto.randomUUID(),
                request_number: `CCTV-${Date.now()}`,
                requester_name: `${formData.lastName}, ${formData.firstName} ${formData.middleInitial}`,
                contact_info: '',
                incident_type: incidentTypeStr || 'Unspecified',
                incident_date: formData.dateOfIncident,
                incident_time: formData.timeOfIncident,
                location: formData.placeOfIncident,
                purpose: formData.purpose,
                created_at: new Date().toISOString()
            };

            await resourceService.createCCTVRequest(payload);
            await generateCCTVForm(payload);
            showToast("CCTV Request recorded successfully", "success");
            setIsSuccess(true);
        } catch (error: any) {
            console.error(error);
            showToast("Failed to save record: " + error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        if (confirm("Clear form?")) {
            setFormData({
                lastName: '', firstName: '', middleInitial: '', addressNo: '', street: '', barangay: 'Post Proper Northside', city: 'Taguig City',
                incidentTypes: [], others: '', dateOfIncident: '', timeOfIncident: '', placeOfIncident: '', purpose: ''
            });
            setHasConsented(false);
            setIsSuccess(false);
        }
    };

    const openPicker = (e: React.MouseEvent, ref: React.RefObject<HTMLInputElement>) => {
        if (e.target === ref.current) return;
        if (ref.current) {
            try {
                if (typeof ref.current.showPicker === 'function') ref.current.showPicker();
                else ref.current.focus();
            } catch (error) { ref.current.focus(); }
        }
    };

    if (isSuccess) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center animate-fade-in">
                <div className="card-premium p-12 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-white/10">
                    <div className="w-24 h-24 bg-green-50 dark:bg-green-900/10 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500 dark:text-green-400 border border-green-100 dark:border-green-900/20">
                        <Save size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-3 uppercase tracking-tight italic">Success</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-sm mx-auto text-sm leading-relaxed">The CCTV Request form has been officially generated and the record is filed in the digital security vault.</p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => navigate('/resources')} className="flex-1 px-8 py-5 bg-taguig-navy text-white font-black uppercase tracking-widest text-xs rounded-[2rem] shadow-xl shadow-taguig-navy/20 flex items-center justify-center space-x-2 hover:bg-taguig-blue transition-all">
                            <span>View Registry</span>
                            <ArrowRight size={18} />
                        </button>
                        <button onClick={handleReset} className="px-8 py-5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white font-black uppercase tracking-widest text-xs rounded-[2rem] hover:bg-slate-200 transition-all flex items-center justify-center space-x-2">
                            <span>New Request</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
            <PageHeader
                title="CCTV Request Form"
                subtitle="Generate official request form for security footage."
                icon={Video}
            />

            <form className="card-premium p-10 rounded-[2.5rem] shadow-sm space-y-10 border border-slate-200 dark:border-white/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-taguig-navy"></div>
                <section>
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-taguig-gold/60 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-white/5 pb-3">Requester Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-5">
                            <label htmlFor="lastName" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">Last Name</label>
                            <input id="lastName" type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 px-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold" value={formData.lastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('lastName', e.target.value)} />
                        </div>
                        <div className="md:col-span-5">
                            <label htmlFor="firstName" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">First Name</label>
                            <input id="firstName" type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 px-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold" value={formData.firstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('firstName', e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="middleInitial" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">M.I.</label>
                            <input id="middleInitial" type="text" maxLength={2} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 px-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold text-center" value={formData.middleInitial} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('middleInitial', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div className="md:col-span-1">
                            <label htmlFor="street" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">House No. & Street</label>
                            <input id="street" type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 px-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold" value={formData.street} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('street', e.target.value)} />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label htmlFor="barangay" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">Barangay</label>
                                <input id="barangay" type="text" className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl py-3.5 px-4 text-slate-400 dark:text-slate-500 font-bold" value={formData.barangay} readOnly />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="city" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">City</label>
                                <input id="city" type="text" className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl py-3.5 px-4 text-slate-400 dark:text-slate-500 font-bold" value={formData.city} readOnly />
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-taguig-gold/60 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-white/5 pb-3">Incident Nature</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {INCIDENT_OPTIONS.map(option => (
                            <div key={option} onClick={() => handleCheckboxChange(option)} className={`cursor-pointer p-4 rounded-2xl border flex items-center space-x-3 transition-all ${formData.incidentTypes.includes(option) ? 'bg-taguig-navy text-white border-taguig-navy shadow-lg shadow-taguig-navy/20' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                                {formData.incidentTypes.includes(option) ? <CheckSquare size={20} className="text-taguig-gold" /> : <Square size={20} className="text-slate-300 dark:text-slate-600" />}
                                <span className="text-xs font-black uppercase tracking-widest">{option}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6">
                        <label htmlFor="othersInput" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">Others (Specify)</label>
                        <input id="othersInput" type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 px-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold" value={formData.others} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('others', e.target.value)} />
                    </div>
                </section>

                <section>
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-taguig-gold/60 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-white/5 pb-3">Record Coordinates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label htmlFor="dateOfIncident" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">Date of Incident</label>
                            <div className="relative" onClick={(e) => openPicker(e, dateInputRef)}>
                                <Calendar className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={18} />
                                <input id="dateOfIncident" ref={dateInputRef} type="date" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold cursor-pointer" value={formData.dateOfIncident} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('dateOfIncident', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="timeOfIncident" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">Time of Incident</label>
                            <div className="relative" onClick={(e) => openPicker(e, timeInputRef)}>
                                <Clock className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" size={18} />
                                <input id="timeOfIncident" ref={timeInputRef} type="time" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold cursor-pointer" value={formData.timeOfIncident} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('timeOfIncident', e.target.value)} />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="placeOfIncident" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">Place of Incident</label>
                            <input id="placeOfIncident" type="text" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 px-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold" value={formData.placeOfIncident} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('placeOfIncident', e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="purposeOfRequest" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">Purpose of Request</label>
                            <textarea id="purposeOfRequest" className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-4 px-6 outline-none focus:ring-4 focus:ring-taguig-navy/10 h-32 resize-none text-slate-800 dark:text-white font-medium leading-relaxed" value={formData.purpose} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('purpose', e.target.value)} />
                        </div>
                    </div>
                </section>

                <div className="bg-taguig-navy/[0.02] dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl flex items-start space-x-4">
                    <input type="checkbox" id="privacy-consent" checked={hasConsented} onChange={(e) => setHasConsented(e.target.checked)} className="w-5 h-5 text-taguig-navy rounded focus:ring-taguig-navy mt-0.5 border-slate-300 bg-white dark:bg-slate-800" />
                    <label htmlFor="privacy-consent" className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed cursor-pointer">
                        <span className="font-black flex items-center mb-2 uppercase tracking-widest text-taguig-navy dark:text-taguig-gold"><Shield size={14} className="mr-2" /> Data Privacy Consent</span>
                        I acknowledge that the personal data provided herein will be processed for the purpose of this CCTV request, in compliance with the Data Privacy Act of 2012.
                    </label>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-slate-100 dark:border-white/10">
                    <button type="button" onClick={handleReset} className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[10px] hover:text-taguig-red transition-all flex items-center space-x-2 px-6 py-4">
                        <RefreshCcw size={16} />
                        <span>Reset Form</span>
                    </button>
                    <button onClick={handleProcess} disabled={!hasConsented || isSubmitting} className={`px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center space-x-3 transition-all shadow-xl ${hasConsented ? 'bg-taguig-navy text-white hover:bg-taguig-blue shadow-taguig-navy/20 hover:scale-[1.02]' : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed shadow-none'}`}>
                        {isSubmitting ? <span>Processing...</span> : <><Save size={18} /><span>Save & Print Request</span></>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CCTVRequestForm;
