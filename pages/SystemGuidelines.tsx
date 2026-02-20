
import React from 'react';
import { Shield, Users, FileText, Printer, Lock, CheckCircle, AlertTriangle, Info, Scale, BookOpen } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const SystemGuidelines: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-5xl mx-auto pb-20 animate-fade-in">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
            <BookOpen className="mr-4 text-blue-600 dark:text-blue-400" size={36} />
            System Manual & Guidelines
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-2 text-lg">
            Operational protocols and administrative hierarchy for the Bantay Bayan Internal Command System.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Permission Hierarchy */}
        <section className="md:col-span-2 space-y-8">
            <div className="glass-panel p-8 rounded-[2rem] border border-white/60 dark:border-white/10 shadow-xl">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center">
                    <Users className="mr-3 text-blue-500" />
                    User Roles & Permission Hierarchy
                </h2>
                
                <div className="space-y-6">
                    <div className="flex gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl">
                        <div className="shrink-0 w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-purple-900 dark:text-purple-300">Supervisors (Chairman / Secretary)</h3>
                            <p className="text-sm text-purple-700 dark:text-purple-400/90 mt-1 leading-relaxed">
                                <strong>Full CRUD Access:</strong> Can Create, Read, Update, and Delete all system records. Responsible for incident resolution, user management, and system maintenance.
                            </p>
                            <ul className="mt-3 grid grid-cols-2 gap-2">
                                {['Approve Access', 'Edit Blotter', 'Reopen Cases', 'System Reset', 'Audit Logs', 'Asset Approval'].map(item => (
                                    <li key={item} className="flex items-center text-xs font-bold text-purple-800 dark:text-purple-300">
                                        <CheckCircle size={12} className="mr-2 text-purple-500" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl">
                        <div className="shrink-0 w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-blue-900 dark:text-blue-300">Field Operators (Bantay Bayan)</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-400/90 mt-1 leading-relaxed">
                                <strong>Input-Only Access:</strong> Can file new reports, request assets, and view current assignments. Restricted from editing or deleting official records once submitted.
                            </p>
                            <ul className="mt-3 grid grid-cols-2 gap-2">
                                {['File Blotter', 'CCTV Request', 'Vehicle Logs', 'Duty Roster', 'View Dashboard', 'Print Record'].map(item => (
                                    <li key={item} className="flex items-center text-xs font-bold text-blue-800 dark:text-blue-300">
                                        <CheckCircle size={12} className="mr-2 text-blue-500" /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel p-8 rounded-[2rem] border border-white/60 dark:border-white/10 shadow-xl">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center">
                    <Scale className="mr-3 text-emerald-500" />
                    Reporting & Accountability
                </h2>
                <div className="space-y-4">
                    <div className="flex items-start space-x-4">
                        <div className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">Official Blotter (Incidents)</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">All filed blotters are immediately assigned a unique case number (e.g., BB-2026-XXXX) and logged for official record-keeping.</p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-4">
                        <div className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                            <Printer size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">Print-Ready Exports</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Every incident, borrowing slip, and CCTV request can be exported as a professional PDF for physical filing and signatures.</p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-4">
                        <div className="mt-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">Data Integrity</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">All actions (inserts, updates, status changes) are recorded in the system's Audit Logs to ensure transparency and accountability.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Sidebar Guidelines */}
        <aside className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
                <h3 className="font-bold text-amber-800 dark:text-amber-400 mb-3 flex items-center">
                    <AlertTriangle size={18} className="mr-2" />
                    Code of Conduct
                </h3>
                <ul className="space-y-3">
                    {['Accuracy', 'Privacy', 'Reliability', 'Punctuality'].map((val, idx) => (
                        <li key={idx} className="flex flex-col">
                            <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-500">{val}</span>
                            <span className="text-sm text-amber-900 dark:text-amber-200/80 font-medium">
                                {val === 'Accuracy' && 'Verify facts before filing an official blotter.'}
                                {val === 'Privacy' && 'Never share citizen contact data outside the system.'}
                                {val === 'Reliability' && 'Ensure your duty status is updated on the roster.'}
                                {val === 'Punctuality' && 'Record logs immediately after events occur.'}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="glass-panel p-6 rounded-3xl bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-3 flex items-center">
                    <Info size={18} className="mr-2" />
                    Need Support?
                </h3>
                <p className="text-sm text-blue-900 dark:text-blue-200/80 leading-relaxed font-medium">
                    For technical issues or password resets, contact the Barangay IT Administrator. Supervisors can manage users directly in the <span className="underline">Personnel</span> tab.
                </p>
            </div>
        </aside>

      </div>
    </div>
  );
};

export default SystemGuidelines;
