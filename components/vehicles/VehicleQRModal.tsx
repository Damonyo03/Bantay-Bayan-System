import React, { useRef } from 'react';
import { Vehicle } from '../../types';
import { useBranding } from '../../src/config/branding';
import { generateQRDataUrl } from '../../utils/qrCodeGenerator';
import BrandLogo from '../BrandLogo';
import { X, Printer, Download, QrCode, Shield, Car, Truck } from 'lucide-react';

interface VehicleQRModalProps {
  vehicle: Vehicle | null;
  allVehicles?: Vehicle[];
  isOpen: boolean;
  onClose: () => void;
}

export const VehicleQRModal: React.FC<VehicleQRModalProps> = ({
  vehicle,
  allVehicles,
  isOpen,
  onClose,
}) => {
  const branding = useBranding();
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const targetVehicles: Vehicle[] = vehicle
    ? [vehicle]
    : allVehicles && allVehicles.length > 0
    ? allVehicles
    : [];

  if (targetVehicles.length === 0) return null;

  // Build secure opaque URL payload: holds only the vehicle reference, no personal data
  const getVehicleQRUrl = (v: Vehicle): string => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    // Uses hash router URL compatible with web & Capacitor
    return `${origin}${pathname}#/vehicles?vehicle_id=${encodeURIComponent(v.id)}&action=quick_trip`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSingle = (v: Vehicle) => {
    const qrUrl = getVehicleQRUrl(v);
    const dataUrl = generateQRDataUrl(qrUrl, 500);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `QR_${v.plate_number.replace(/\s+/g, '_')}_${v.name.replace(/\s+/g, '_')}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-qr-sheet, #printable-qr-sheet * {
            visibility: visible;
          }
          #printable-qr-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-taguig-navy dark:bg-taguig-blue text-white rounded-2xl shadow-md">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                {targetVehicles.length === 1
                  ? `Vehicle QR Pass • ${targetVehicles[0].plate_number}`
                  : `Print Fleet QR Badges (${targetVehicles.length} Vehicles)`}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Official Vehicle Identification Sheet
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-taguig-navy dark:bg-taguig-blue text-white rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all flex items-center space-x-1.5 shadow-sm"
              title="Print Sheet"
            >
              <Printer size={15} />
              <span>Print Sheet</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Content */}
        <div
          ref={printAreaRef}
          id="printable-qr-sheet"
          className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-50/50 dark:bg-slate-900"
        >
          {targetVehicles.map((v, idx) => {
            const qrPayload = getVehicleQRUrl(v);
            const qrDataUrl = generateQRDataUrl(qrPayload, 320);

            return (
              <div
                key={v.id}
                className={`bg-white rounded-3xl border-2 border-slate-300 p-6 md:p-8 text-slate-900 shadow-sm max-w-lg mx-auto ${
                  idx < targetVehicles.length - 1 ? 'page-break mb-8' : ''
                }`}
              >
                {/* Official Header */}
                <div className="text-center border-b-2 border-slate-200 pb-4 mb-6">
                  <div className="flex items-center justify-center space-x-4 mb-2">
                    <BrandLogo
                      src={branding.primarySealUrl}
                      alt="Barangay Seal"
                      variant="seal"
                      className="w-12 h-12"
                    />
                    <div>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">
                        Republic of the Philippines • {branding.cityName}
                      </p>
                      <h2 className="text-base font-black uppercase tracking-tight text-slate-900">
                        {branding.orgName}
                      </h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-taguig-blue">
                        Public Safety & Security Patrol Fleet
                      </p>
                    </div>
                    <BrandLogo
                      src={branding.secondarySealUrl}
                      alt="Taguig Seal"
                      variant="seal"
                      className="w-12 h-12"
                    />
                  </div>
                </div>

                {/* Vehicle Identification */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    {v.name.toLowerCase().includes('ambulance') ? (
                      <Truck size={14} className="text-taguig-blue" />
                    ) : (
                      <Car size={14} className="text-taguig-blue" />
                    )}
                    <span>{v.type || 'Patrol Vehicle'}</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight">
                    {v.name}
                  </h3>
                  <div className="mt-2 inline-block bg-slate-900 text-white font-mono font-black text-2xl px-6 py-2 rounded-2xl tracking-[0.2em] shadow-sm border-2 border-slate-800">
                    {v.plate_number}
                  </div>
                </div>

                {/* Scannable QR Code */}
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 mb-6">
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${v.plate_number}`}
                    className="w-56 h-56 object-contain shadow-md rounded-xl bg-white p-2 border border-slate-200"
                  />
                  <p className="mt-3 text-[11px] font-mono text-slate-500 font-bold uppercase tracking-wider text-center">
                    Vehicle Ref: {v.id.substring(0, 8)}...{v.id.substring(v.id.length - 4)}
                  </p>
                </div>

                {/* Instructions & Footer */}
                <div className="text-center space-y-1 text-slate-600 text-xs border-t border-slate-200 pt-4">
                  <p className="font-bold text-slate-900">
                    Scan with any smartphone camera or Bantay Bayan Scanner
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Directly triggers Start Trip, Checkpoint Arrival/Departure, or End Trip.
                  </p>
                  <div className="pt-3 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    <span>OJT Attendance & Patrol Tracker</span>
                    <span>Confidential • Official Use Only</span>
                  </div>
                </div>

                {/* Download Single Action (Hidden in Print) */}
                <div className="no-print mt-6 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDownloadSingle(v)}
                    className="text-xs font-bold text-taguig-blue hover:text-taguig-navy flex items-center space-x-1.5"
                  >
                    <Download size={14} />
                    <span>Download SVG Badge</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Contains opaque reference only in compliance with Data Privacy Act.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-white/20 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
