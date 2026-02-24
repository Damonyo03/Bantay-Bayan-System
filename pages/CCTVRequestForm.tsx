
import React, { useState, useRef } from 'react';
import { resourceService } from '../services/resourceService';
import { Video, Printer, CheckSquare, Square, RefreshCcw, Calendar, Clock, Shield, Save, ArrowRight } from 'lucide-react';
import { generateCCTVForm } from '../utils/pdfGenerator';
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

            const payload = {
                requester_name: `${formData.lastName}, ${formData.firstName} ${formData.middleInitial}`,
                contact_info: '',
                incident_type: incidentTypeStr || 'Unspecified',
                incident_date: formData.dateOfIncident,
                incident_time: formData.timeOfIncident,
                location: formData.placeOfIncident,
                purpose: formData.purpose
            };

            await resourceService.createCCTVRequest(payload);
            generateCCTVForm(formData);
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
                <div className="glass-panel p-12 rounded-[2.5rem] shadow-2xl border border-white/60 dark:border-white/10">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                        <Save size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Request Saved</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-10">The CCTV Request form has been generated and the record is filed in the digital history.</p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => navigate('/resources')} className="flex-1 px-8 py-4 bg-slate-900 dark:bg-blue-600 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center space-x-2">
                            <span>View Request History</span>
                            <ArrowRight size={18} />
                        </button>
                        <button onClick={handleReset} className="px-8 py-4 bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-white font-bold rounded-2xl hover:bg-gray-200">
                            New Request
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

            <form className="glass-panel p-8 rounded-[2rem] shadow-xl space-y-8 border border-white/60 dark:border-white/10">
                <section>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">Requester Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-5">
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Last Name</label>
                            <input type="text" className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white" value={formData.lastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('lastName', e.target.value)} />
                        </div>
                        <div className="md:col-span-5">
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">First Name</label>
                            <input type="text" className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white" value={formData.firstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('firstName', e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">M.I.</label>
                            <input type="text" maxLength={2} className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white" value={formData.middleInitial} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('middleInitial', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">House No. & Street</label>
                            <input type="text" className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white" value={formData.street} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('street', e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Barangay</label>
                                <input type="text" className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 rounded-xl py-3 px-4 text-gray-500" value={formData.barangay} readOnly />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">City</label>
                                <input type="text" className="w-full bg-gray-100 dark:bg-slate-800 border border-gray-200 rounded-xl py-3 px-4 text-gray-500" value={formData.city} readOnly />
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">Incident Type</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {INCIDENT_OPTIONS.map(option => (
                            <div key={option} onClick={() => handleCheckboxChange(option)} className={`cursor-pointer p-3 rounded-xl border flex items-center space-x-3 transition-all ${formData.incidentTypes.includes(option) ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300' : 'bg-white/50 dark:bg-white/5 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                                {formData.incidentTypes.includes(option) ? <CheckSquare size={20} /> : <Square size={20} />}
                                <span className="text-sm font-semibold">{option}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Others (Specify)</label>
                        <input type="text" className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white" value={formData.others} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('others', e.target.value)} />
                    </div>
                </section>

                <section>
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">Incident Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Date of Incident</label>
                            <div className="relative" onClick={(e) => openPicker(e, dateInputRef)}>
                                <Calendar className="absolute left-3 top-3.5 text-slate-600 dark:text-gray-400 pointer-events-none" size={18} />
                                <input ref={dateInputRef} type="date" className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white font-medium cursor-pointer" value={formData.dateOfIncident} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('dateOfIncident', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Time of Incident</label>
                            <div className="relative" onClick={(e) => openPicker(e, timeInputRef)}>
                                <Clock className="absolute left-3 top-3.5 text-slate-600 dark:text-gray-400 pointer-events-none" size={18} />
                                <input ref={timeInputRef} type="time" className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white font-medium cursor-pointer" value={formData.timeOfIncident} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('timeOfIncident', e.target.value)} />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Place of Incident</label>
                            <input type="text" className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 dark:text-white" value={formData.placeOfIncident} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('placeOfIncident', e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1 ml-1">Purpose of Request</label>
                            <textarea className="w-full bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/20 h-24 resize-none text-slate-800 dark:text-white" value={formData.purpose} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('purpose', e.target.value)} />
                        </div>
                    </div>
                </section>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-start space-x-3">
                    <input type="checkbox" id="privacy-consent" checked={hasConsented} onChange={(e) => setHasConsented(e.target.checked)} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-0.5 border-gray-300" />
                    <label htmlFor="privacy-consent" className="text-sm text-blue-900 dark:text-blue-300 leading-relaxed cursor-pointer">
                        <span className="font-bold flex items-center mb-1"><Shield size={14} className="mr-1" /> Data Privacy Consent</span>
                        I acknowledge that the personal data provided herein will be processed for the purpose of this CCTV request, in compliance with the Data Privacy Act of 2012.
                    </label>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-white/10">
                    <button type="button" onClick={handleReset} className="text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700 dark:hover:text-white flex items-center space-x-2 px-4 py-2"><RefreshCcw size={18} /><span>Reset Form</span></button>
                    <button onClick={handleProcess} disabled={!hasConsented || isSubmitting} className={`px-8 py-4 rounded-xl font-bold flex items-center space-x-2 shadow-lg transition-all ${hasConsented ? 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-black dark:hover:bg-blue-700 hover:scale-105' : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'}`}>
                        {isSubmitting ? <span>Processing...</span> : <><Save size={20} /><span>Save & Print</span></>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CCTVRequestForm;
