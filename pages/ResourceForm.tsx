
import React, { useState } from 'react';
import { supabaseService } from '../services/supabaseService';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AssetItem } from '../types';
import { generateBorrowingSlip } from '../utils/pdfGenerator';
import { Package, Calendar, User, Phone, MapPin, Plus, Trash2, CheckCircle, ArrowRight, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ResourceForm: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const [formData, setFormData] = useState({
      borrower_name: '',
      contact_number: '',
      address: '',
      purpose: '',
      pickup_date: '',
      return_date: ''
  });

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

      if (items.length === 0) {
          alert("Please select at least one item.");
          return;
      }

      setIsSubmitting(true);
      try {
          const payload = {
              ...formData,
              items_requested: items,
              logged_by: user.id
          };
          
          const result = await supabaseService.createAssetRequest(payload);
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
        <div className="max-w-2xl mx-auto pt-10 text-center animate-fade-in">
             <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-xl">
                <CheckCircle size={48} strokeWidth={2} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{t.submitRequest} Successful!</h2>
            <p className="text-gray-500 mb-8">The request is now pending approval from the Barangay Captain or Admin.</p>
            
            <div className="flex justify-center space-x-4">
                <button 
                    onClick={() => generateBorrowingSlip(successData)}
                    className="px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold shadow-lg hover:scale-105 transition-transform flex items-center"
                >
                    <Printer size={18} className="mr-2" />
                    Print Borrowing Slip
                </button>
                <button 
                    onClick={() => navigate('/resources')}
                    className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center">
            <Package className="mr-3 text-blue-600" />
            {t.resourceRequest}
        </h1>
        <p className="text-gray-500 mt-2">Request LGU assets for community use.</p>
      </header>

      <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-[2rem] shadow-xl space-y-8">
        
        {/* Borrower Details */}
        <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Borrower Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">{t.borrowerName}</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            required
                            type="text"
                            value={formData.borrower_name}
                            onChange={e => setFormData({...formData, borrower_name: e.target.value})}
                            className="w-full bg-white/50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Full Legal Name"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">{t.contactNo}</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            required
                            type="text"
                            value={formData.contact_number}
                            onChange={e => setFormData({...formData, contact_number: e.target.value})}
                            className="w-full bg-white/50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="0912..."
                        />
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">{t.address}</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            required
                            type="text"
                            value={formData.address}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                            className="w-full bg-white/50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="House No., Street, Block"
                        />
                    </div>
                </div>
            </div>
        </section>

        {/* Request Details */}
        <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Request Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">{t.pickupDate}</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            required
                            type="date"
                            value={formData.pickup_date}
                            onChange={e => setFormData({...formData, pickup_date: e.target.value})}
                            className="w-full bg-white/50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">{t.returnDate}</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            required
                            type="date"
                            value={formData.return_date}
                            onChange={e => setFormData({...formData, return_date: e.target.value})}
                            className="w-full bg-white/50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>
                <div className="md:col-span-2">
                     <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">{t.purpose}</label>
                     <input 
                            required
                            type="text"
                            value={formData.purpose}
                            onChange={e => setFormData({...formData, purpose: e.target.value})}
                            className="w-full bg-white/50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="e.g. Wake, Birthday, Medical Transport"
                        />
                </div>
            </div>

            <div className="space-y-3">
                 <label className="block text-sm font-bold text-gray-700 ml-1">{t.itemsRequested}</label>
                 {items.map((item, idx) => (
                     <div key={idx} className="flex items-center space-x-3 animate-fade-in">
                         <select 
                             value={item.item}
                             onChange={e => handleItemChange(idx, 'item', e.target.value)}
                             className="flex-1 bg-white/50 border border-gray-200 rounded-xl py-3 px-4 outline-none"
                         >
                             {ITEM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                         </select>
                         <input 
                             type="number"
                             min="1"
                             value={item.quantity}
                             onChange={e => handleItemChange(idx, 'quantity', parseInt(e.target.value))}
                             className="w-24 bg-white/50 border border-gray-200 rounded-xl py-3 px-4 outline-none text-center"
                             placeholder="Qty"
                         />
                         {items.length > 1 && (
                             <button type="button" onClick={() => handleRemoveItem(idx)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl">
                                 <Trash2 size={18} />
                             </button>
                         )}
                     </div>
                 ))}
                 <button 
                    type="button"
                    onClick={handleAddItem}
                    className="mt-2 text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                 >
                     <Plus size={16} />
                     <span>{t.newItem}</span>
                 </button>
            </div>
        </section>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:scale-105 transition-all flex items-center space-x-2"
            >
                {isSubmitting ? (
                    <span>Processing...</span>
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