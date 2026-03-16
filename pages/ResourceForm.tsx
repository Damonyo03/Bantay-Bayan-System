
import React, { useState } from 'react';
import { resourceService } from '../services/resourceService';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AssetItem } from '../types';
import { generateBorrowingSlip } from '../utils/pdfGenerator';
import { Package, Calendar, User, Phone, MapPin, Plus, Trash2, CheckCircle, ArrowRight, Printer, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

const ResourceForm: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);

    const today = new Date().toISOString().split('T')[0];


    const [formData, setFormData] = useState({
        borrower_name: '',
        contact_number: '',
        address: '',
        purpose: '',
        pickup_date: '',
        return_date: ''
    });

    const [hasConsented, setHasConsented] = useState(false);

    const [items, setItems] = useState<AssetItem[]>([{ item: 'Plastic Chairs', quantity: 10 }]);

    const ITEM_OPTIONS = [
        'Tent (10x10)',
        'Tent (20x20)',
        'Plastic Chairs',
        'Long Tables',
        'Round Tables',
        'Sound System',
        'Service Vehicle / Ambulance',
        'Wheelchair',
        'Crutches'
    ];

    const handleAddItem = () => {
        setItems([...items, { item: ITEM_OPTIONS[0], quantity: 1 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof AssetItem, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!hasConsented) {
            alert("You must acknowledge the Data Privacy Act compliance to proceed.");
            return;
        }

        if (items.length === 0) {
            alert("Please select at least one item.");
            return;
        }

        // Date Validation
        if (formData.pickup_date < today) {
            alert("Pickup date cannot be in the past.");
            return;
        }

        if (formData.return_date < formData.pickup_date) {
            alert("Return date must be on or after the pickup date.");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                items_requested: items,
                logged_by: user.id
            };

            const result = await resourceService.createAssetRequest(payload);
            setSuccessData(result);
        } catch (error) {
            console.error(error);
            alert("Failed to create request.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (successData) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center animate-fade-in">
                <div className="card-premium p-12 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>
                    <div className="w-24 h-24 bg-green-50 dark:bg-green-900/10 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500 dark:text-green-400 border border-green-100 dark:border-green-900/20">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-3 uppercase tracking-tight italic">Request Submitted</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-sm mx-auto text-sm leading-relaxed">Your resource request has been logged successfully and is currently awaiting command approval.</p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={async () => await generateBorrowingSlip(successData)}
                            className="flex-1 px-8 py-5 bg-taguig-navy text-white font-black uppercase tracking-widest text-xs rounded-[2rem] shadow-xl shadow-taguig-navy/20 flex items-center justify-center space-x-2 hover:bg-taguig-blue transition-all"
                        >
                            <Printer size={18} />
                            <span>Print Record Slip</span>
                        </button>
                        <button
                            onClick={() => navigate('/resources')}
                            className="px-8 py-5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white font-black uppercase tracking-widest text-xs rounded-[2rem] hover:bg-slate-200 transition-all flex items-center justify-center space-x-2"
                        >
                            <span>Back to Portal</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <PageHeader
                title={t.resourceRequest}
                subtitle="Request municipal assets and equipment for community support."
                icon={Package}
            />

            <form onSubmit={handleSubmit} className="card-premium p-10 rounded-[2.5rem] shadow-sm space-y-10 border border-slate-200 dark:border-white/10 animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-taguig-navy"></div>

                {/* Borrower Details */}
                <section>
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-taguig-gold/60 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-white/5 pb-3">Borrower Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="borrowerName" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">{t.borrowerName}</label>
                            <div className="relative">
                                <User className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500" size={18} />
                                <input
                                    id="borrowerName"
                                    required
                                    type="text"
                                    value={formData.borrower_name}
                                    onChange={e => setFormData({ ...formData, borrower_name: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold"
                                    placeholder="Full Legal Name"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="contactNo" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">{t.contactNo}</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500" size={18} />
                                <input
                                    id="contactNo"
                                    required
                                    type="text"
                                    value={formData.contact_number}
                                    onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold"
                                    placeholder="0912..."
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="address" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">{t.address}</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500" size={18} />
                                <input
                                    id="address"
                                    required
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-medium"
                                    placeholder="House No., Street, Block"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Request Details */}
                <section>
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-taguig-gold/60 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-white/5 pb-3">Logistical Data</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <label htmlFor="pickupDate" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">{t.pickupDate}</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500" size={18} />
                                <input
                                    id="pickupDate"
                                    required
                                    type="date"
                                    min={today}
                                    value={formData.pickup_date}
                                    onChange={e => setFormData({ ...formData, pickup_date: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="returnDate" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">{t.returnDate}</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500" size={18} />
                                <input
                                    id="returnDate"
                                    required
                                    type="date"
                                    min={formData.pickup_date || today}
                                    value={formData.return_date}
                                    onChange={e => setFormData({ ...formData, return_date: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold"
                                />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="purpose" className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/40 uppercase tracking-widest mb-2 ml-1">{t.purpose}</label>
                            <input
                                id="purpose"
                                required
                                type="text"
                                value={formData.purpose}
                                onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 px-4 outline-none focus:ring-4 focus:ring-taguig-navy/10 text-slate-800 dark:text-white font-bold"
                                placeholder="e.g. Wake, Birthday, Medical Transport"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-taguig-gold/60 uppercase tracking-widest ml-1">{t.itemsRequested}</label>
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-center space-x-4 animate-fade-in group">
                                <div className="flex-1 relative">
                                    <select
                                        value={item.item}
                                        onChange={e => handleItemChange(idx, 'item', e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl py-3.5 px-4 outline-none text-slate-800 dark:text-white font-bold appearance-none cursor-pointer focus:ring-4 focus:ring-taguig-navy/10"
                                    >
                                        {ITEM_OPTIONS.map(opt => <option key={opt} value={opt} className="dark:bg-slate-800">{opt}</option>)}
                                    </select>
                                </div>
                                <div className="w-32 relative">
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl py-3.5 px-4 outline-none text-center text-slate-800 dark:text-white font-black"
                                        placeholder="Qty"
                                    />
                                </div>
                                {items.length > 1 && (
                                    <button type="button" onClick={() => handleRemoveItem(idx)} className="p-3.5 text-slate-300 hover:text-taguig-red transition-all hover:scale-110">
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="w-full py-4 rounded-xl border-2 border-dashed border-slate-100 dark:border-white/5 text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[10px] flex items-center justify-center space-x-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group"
                        >
                            <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                            <span>Add New Registry Entry</span>
                        </button>
                    </div>
                </section>

                {/* DATA PRIVACY CONSENT */}
                <div className="bg-taguig-navy/[0.02] dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl flex items-start space-x-4">
                    <input
                        type="checkbox"
                        id="privacy-consent"
                        checked={hasConsented}
                        onChange={(e) => setHasConsented(e.target.checked)}
                        className="w-5 h-5 text-taguig-navy rounded focus:ring-taguig-navy mt-0.5 border-slate-300 bg-white dark:bg-slate-800"
                    />
                    <label htmlFor="privacy-consent" className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed cursor-pointer">
                        <span className="font-black flex items-center mb-2 uppercase tracking-widest text-taguig-navy dark:text-taguig-gold"><Shield size={14} className="mr-2" /> Data Privacy Consent</span>
                        I confirm that the personal data provided is accurate and I consent to its collection and processing for the purpose of this resource request, in compliance with the <strong>Data Privacy Act of 2012</strong>.
                    </label>
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-white/5 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting || !hasConsented}
                        className={`px-12 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center space-x-3 transition-all shadow-xl shadow-taguig-navy/20 active:scale-[0.98] ${hasConsented
                            ? 'bg-taguig-navy text-white hover:bg-taguig-blue'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed shadow-none'
                            }`}
                    >
                        {isSubmitting ? (
                            <span>Processing Request...</span>
                        ) : (
                            <>
                                <span>{t.submitRequest}</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ResourceForm;
