import React, { useState, useEffect, useRef } from 'react';
import { Vehicle, VehicleStatus } from '../../types';
import { vehicleService, VehicleInputParams } from '../../services/vehicleService';
import { compressImage } from '../../utils/imageCompressor';
import {
  X,
  Car,
  Truck,
  Camera,
  Upload,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Palette,
  FileText,
  Fuel,
  Calendar,
  Layers,
  Wrench,
  CheckCircle2,
} from 'lucide-react';

interface AddEditVehicleModalProps {
  vehicle: Vehicle | null; // If null, mode is Add. If provided, mode is Edit.
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const VEHICLE_TYPES = [
  'Patrol Car',
  'Ambulance / Emergency Medical',
  'Motorcycle / Tricycle',
  'Van / Utility Vehicle (L300 / Traviz)',
  'Rescue Truck / Heavy Patrol',
  'Mobile Command Post',
  'Foot Patrol / Walking',
  'Other / Logistics',
];

const FUEL_TYPES = ['Diesel', 'Gasoline', 'Electric', 'Hybrid', 'N/A'];

export const AddEditVehicleModal: React.FC<AddEditVehicleModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const isEditMode = !!vehicle;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [type, setType] = useState(VEHICLE_TYPES[0]);
  const [color, setColor] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [fuelType, setFuelType] = useState(FUEL_TYPES[0]);
  const [status, setStatus] = useState<VehicleStatus>('available');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setName(vehicle.name || '');
      setPlateNumber(vehicle.plate_number || '');
      setType(vehicle.type || VEHICLE_TYPES[0]);
      setColor(vehicle.color || '');
      setModel(vehicle.model || '');
      setYear(vehicle.year || '');
      setFuelType(vehicle.fuel_type || FUEL_TYPES[0]);
      setStatus(vehicle.status || 'available');
      setNotes(vehicle.notes || '');
      setImageUrl(vehicle.image_url || null);
      setImagePreview(vehicle.image_url || null);
    } else {
      setName('');
      setPlateNumber('');
      setType(VEHICLE_TYPES[0]);
      setColor('');
      setModel('');
      setYear(new Date().getFullYear().toString());
      setFuelType(FUEL_TYPES[0]);
      setStatus('available');
      setNotes('');
      setImageUrl(null);
      setImagePreview(null);
    }
    setImageFile(null);
    setError(null);
  }, [vehicle, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await compressImage(file, { maxWidthOrHeight: 1600, quality: 0.8 });
        const localPreview = URL.createObjectURL(compressed);
        setImageFile(new File([compressed], file.name, { type: 'image/jpeg' }));
        setImagePreview(localPreview);
      } catch (err) {
        console.warn('Compression fallback to original image:', err);
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleRemovePhoto = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vehicle name / identifier is required.');
      return;
    }
    if (!plateNumber.trim()) {
      setError('Plate number / conduction sticker is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let finalImageUrl = imageUrl;

      // If user selected a new image file, upload it first
      if (imageFile) {
        finalImageUrl = await vehicleService.uploadVehiclePhoto(imageFile);
      }

      const params: VehicleInputParams = {
        name: name.trim(),
        plate_number: plateNumber.trim(),
        type: type.trim(),
        color: color.trim() || null,
        model: model.trim() || null,
        year: year.trim() || null,
        fuel_type: fuelType.trim() || null,
        status: status,
        notes: notes.trim() || null,
        image_url: finalImageUrl || null,
      };

      if (isEditMode && vehicle) {
        await vehicleService.updateVehicle(vehicle.id, params);
      } else {
        await vehicleService.createVehicle(params);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save vehicle:', err);
      setError(err.message || 'Failed to save vehicle details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!vehicle) return;
    if (vehicle.status === 'on_trip' || vehicle.active_trip) {
      setError('Cannot delete vehicle while it is currently deployed on an active trip.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete vehicle "${vehicle.name}" (${vehicle.plate_number})? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await vehicleService.deleteVehicle(vehicle.id);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to delete vehicle:', err);
      setError(err.message || 'Failed to delete vehicle. It may be referenced in past trip records.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-taguig-blue/10 dark:bg-taguig-gold/20 text-taguig-blue dark:text-taguig-gold">
              <Car size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                Fleet Management
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                {isEditMode ? `Edit Vehicle: ${vehicle.name}` : 'Register New Vehicle'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Vehicle Photo Upload Section */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Vehicle Official Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="relative w-32 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 group">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Vehicle preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-slate-400 dark:text-slate-500 text-center p-2">
                    <Camera size={24} />
                    <span className="text-[10px] font-bold mt-1">No Photo</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-taguig-blue/10 dark:hover:bg-taguig-gold/10 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-white/10 transition-colors"
                >
                  <Upload size={14} />
                  <span>{imagePreview ? 'Change Photo' : 'Upload Vehicle Photo'}</span>
                </button>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  JPEG, PNG, or WebP. Auto-compressed for rapid mobile syncing.
                </p>
              </div>
            </div>
          </div>

          {/* Row 1: Vehicle Name & Plate Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Vehicle Name / Identifier <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Patrol Car Alpha / Ambulance #1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Plate Number / Conduction <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SNN 1977 / 1312 - 0438584"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue uppercase"
              />
            </div>
          </div>

          {/* Row 2: Type & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Vehicle Classification
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                <Palette size={13} />
                <span>Body Color / Livery</span>
              </label>
              <input
                type="text"
                placeholder="e.g. White / Navy Blue / Silver"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>
          </div>

          {/* Row 3: Make/Model, Year, Fuel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Make & Model
              </label>
              <input
                type="text"
                placeholder="e.g. Toyota Innova / Isuzu Traviz"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                <Calendar size={13} />
                <span>Model Year</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
                <Fuel size={13} />
                <span>Fuel Type</span>
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-taguig-blue"
              >
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Status */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Operational Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('available')}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                  status === 'available'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                }`}
              >
                <CheckCircle2 size={16} className="mb-1 text-emerald-500" />
                <span>Available / Ready</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('maintenance')}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                  status === 'maintenance'
                    ? 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300 ring-2 ring-red-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Wrench size={16} className="mb-1 text-red-500" />
                <span>Maintenance</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('decommissioned')}
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                  status === 'decommissioned'
                    ? 'bg-slate-500/20 border-slate-500 text-slate-900 dark:text-white ring-2 ring-slate-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Layers size={16} className="mb-1 text-slate-500" />
                <span>Decommissioned</span>
              </button>
            </div>
          </div>

          {/* Row 5: Notes & Equipment */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center space-x-1">
              <FileText size={13} />
              <span>Equipment Aboard & Operational Notes (Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Equipped with siren, lightbar, first aid kit, handheld two-way radio #3, and fire extinguisher."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-taguig-blue"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div>
            {isEditMode && (
              <button
                type="button"
                disabled={deleting || loading}
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 font-bold text-xs uppercase tracking-wider transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Trash2 size={15} />
                <span>{deleting ? 'Deleting...' : 'Delete Vehicle'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              disabled={loading || deleting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || deleting}
              className="px-6 py-2.5 rounded-xl bg-taguig-blue hover:bg-taguig-navy text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-taguig-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>{isEditMode ? 'Save Vehicle Details' : 'Register Vehicle'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
