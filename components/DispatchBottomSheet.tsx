
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Radio, Car, UserCircle, Users, Plus, Trash2 } from 'lucide-react';
import { DispatchLog, UserProfile } from '../types';
import { useToast } from '../contexts/ToastContext';

interface Props {
  dispatchLog: DispatchLog;
  availableOfficers: UserProfile[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<DispatchLog>) => Promise<void>;
}

const VEHICLE_OPTIONS = [
    "Trimo 1",
    "Trimo 2",
    "Trimo 3",
    "Traviz",
    "APV",
    "Rescue 1",
    "Rescue 2",
    "Ambulance 1",
    "Ambulance 2",
    "Foot Patrol / Walking",
    "Command Post"
];

const DispatchBottomSheet: React.FC<Props> = ({ dispatchLog, availableOfficers, onClose, onUpdate }) => {
  const { showToast } = useToast();
  
  // State for split fields
  const [selectedVehicle, setSelectedVehicle] = useState('');
  
  // Changed to array for multiple officers
  const [selectedOfficers, setSelectedOfficers] = useState<string[]>([]);
  const [currentOfficerSelect, setCurrentOfficerSelect] = useState('');
  
  const [status, setStatus] = useState(dispatchLog.status);
  const [loading, setLoading] = useState(false);

  // Initialize state based on existing unit_name
  useEffect(() => {
    const currentUnitName = dispatchLog.unit_name || '';
    
    // Try to parse "Vehicle - Officer, Officer, Officer" format
    const parts = currentUnitName.split(' - ');
    if (parts.length >= 2) {
        // Assume format is correct
        const potentialVehicle = parts[0];
        const officerString = parts.slice(1).join(' - '); // Rejoin remaining just in case
        
        // Handle Vehicle
        if (VEHICLE_OPTIONS.includes(potentialVehicle)) {
            setSelectedVehicle(potentialVehicle);
        } else {
            setSelectedVehicle(potentialVehicle || 'Trimo 1');
        }
        
        // Handle Officers (comma separated)
        if (officerString && officerString !== 'Pending Assignment') {
            const officersList = officerString.split(',').map(s => s.trim()).filter(s => s);
            setSelectedOfficers(officersList);
        } else {
            setSelectedOfficers([]);
        }

    } else {
        // Fallback for simple names or old format
        if (VEHICLE_OPTIONS.includes(currentUnitName)) {
            setSelectedVehicle(currentUnitName);
            setSelectedOfficers([]);
        } else {
             // Maybe it's just the officer name(s)?
             // Check if it matches any known vehicle
             if (!VEHICLE_OPTIONS.includes(currentUnitName) && currentUnitName !== 'Pending Assignment') {
                 // Assume it might be officer name
                 setSelectedVehicle('Foot Patrol / Walking');
                 setSelectedOfficers([currentUnitName]);
             } else {
                 setSelectedVehicle('Trimo 1');
             }
        }
    }
  }, [dispatchLog.unit_name]);

  const handleAddOfficer = () => {
      if (!currentOfficerSelect) return;
      if (!selectedOfficers.includes(currentOfficerSelect)) {
          setSelectedOfficers([...selectedOfficers, currentOfficerSelect]);
      }
      setCurrentOfficerSelect('');
  };

  const handleRemoveOfficer = (officer: string) => {
      setSelectedOfficers(selectedOfficers.filter(o => o !== officer));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Combine Vehicle and Officers
      let finalUnitName = 'Pending Assignment';
      
      if (selectedOfficers.length > 0) {
          finalUnitName = `${selectedVehicle} - ${selectedOfficers.join(', ')}`;
      } else if (selectedVehicle) {
          finalUnitName = selectedVehicle;
      }

      await onUpdate(dispatchLog.id, { 
          unit_name: finalUnitName, 
          status 
      });
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to update dispatch status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const statuses: DispatchLog['status'][] = ['En Route', 'On Scene', 'Clear', 'Returning'];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 transform transition-transform duration-300 ease-out animate-slide-up border border-white/20">
        
        {/* Handle for mobile feel */}
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-slate-600 rounded-full mx-auto mb-6 sm:hidden" />

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Update Dispatch Details</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
            <X size={20} className="text-gray-500 dark:text-white" />
          </button>
        </div>

        <div className="space-y-6">
          
          <div className="grid grid-cols-1 gap-4">
              {/* Vehicle Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 ml-1">Response Asset / Vehicle</label>
                <div className="relative">
                    <Car className="absolute left-3 top-3.5 text-gray-400" size={20}/>
                    <select
                        value={selectedVehicle}
                        onChange={(e) => setSelectedVehicle(e.target.value)}
                        className="w-full bg-gray-100/50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-gray-800 dark:text-white"
                    >
                        {VEHICLE_OPTIONS.map(v => (
                            <option key={v} value={v} className="dark:bg-slate-800">{v}</option>
                        ))}
                    </select>
                </div>
              </div>

              {/* Officer Selection (Multi) */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 ml-1">Officers in Charge (Dispatched)</label>
                
                {/* Add Officer Input */}
                <div className="flex space-x-2 mb-3">
                    <div className="relative flex-1">
                        <UserCircle className="absolute left-3 top-3.5 text-gray-400" size={20}/>
                        <select
                            value={currentOfficerSelect}
                            onChange={(e) => setCurrentOfficerSelect(e.target.value)}
                            className="w-full bg-gray-100/50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl pl-10 pr-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-gray-800 dark:text-white"
                        >
                            <option value="" className="dark:bg-slate-800">-- Select Officer to Add --</option>
                            {availableOfficers.map(officer => (
                                <option key={officer.id} value={officer.full_name} className="dark:bg-slate-800">
                                    {officer.full_name} ({officer.badge_number || 'No Badge'})
                                </option>
                            ))}
                        </select>
                    </div>
                    <button 
                        onClick={handleAddOfficer}
                        disabled={!currentOfficerSelect}
                        className="bg-slate-800 dark:bg-blue-600 text-white rounded-2xl px-4 flex items-center justify-center disabled:opacity-50 hover:bg-slate-900 dark:hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {/* Selected Tags */}
                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                    {selectedOfficers.length === 0 && (
                        <span className="text-xs text-gray-400 dark:text-slate-500 italic pl-1">No officers assigned yet.</span>
                    )}
                    {selectedOfficers.map(officer => (
                        <span key={officer} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {officer}
                            <button onClick={() => handleRemoveOfficer(officer)} className="ml-2 hover:text-red-500 transition-colors">
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
              </div>
          </div>

          <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start space-x-3">
               <Users size={18} className="text-blue-500 dark:text-blue-400 mt-0.5" />
               <div>
                   <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">Unit Designation Preview</p>
                   <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mt-1 break-words">
                       {selectedVehicle} {selectedOfficers.length > 0 ? `- ${selectedOfficers.join(', ')}` : ''}
                   </p>
               </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2 ml-1">Current Status</label>
            <div className="grid grid-cols-2 gap-3">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-200 font-medium text-sm ${
                    status === s
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <Radio size={16} className={status === s ? 'text-white' : 'text-gray-400'} />
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-black dark:bg-blue-600 text-white rounded-2xl py-4 font-semibold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 flex items-center justify-center space-x-2 shadow-xl"
          >
            {loading ? (
              <span className="opacity-70">Updating...</span>
            ) : (
              <>
                <CheckCircle size={20} />
                <span>Confirm Update</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DispatchBottomSheet;
