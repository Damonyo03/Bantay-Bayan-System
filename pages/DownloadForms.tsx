import React from 'react';
import { FileText, ClipboardList, Video, Download, Car, FileDown } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
    generateBlankBlotter,
    generateBlankBorrowing,
    generateBlankCCTV,
    generateBlankVehicleLog
} from '../utils/pdfGenerator';

const DownloadForms: React.FC = () => {
    const forms = [
        {
            title: "Blotter / Incident Report",
            description: "Download a blank blotter form for manual incident reporting and documentation.",
            icon: <FileText className="h-8 w-8 text-blue-400" />,
            action: generateBlankBlotter,
            color: "from-blue-500/20 to-blue-600/5",
            borderColor: "border-blue-500/30"
        },
        {
            title: "Asset Borrowing Slip",
            description: "Standard form for requesting and documenting the borrowing of barangay assets.",
            icon: <ClipboardList className="h-8 w-8 text-emerald-400" />,
            action: generateBlankBorrowing,
            color: "from-emerald-500/20 to-emerald-600/5",
            borderColor: "border-emerald-500/30"
        },
        {
            title: "CCTV Request Form",
            description: "Official form for requesting CCTV footage access for investigation purposes.",
            icon: <Video className="h-8 w-8 text-purple-400" />,
            action: generateBlankCCTV,
            color: "from-purple-500/20 to-purple-600/5",
            borderColor: "border-purple-500/30"
        },
        {
            title: "Vehicle Usage Log Form",
            description: "Log sheet for monitoring barangay vehicle usage, departure/arrival times, and purpose.",
            icon: <Car className="h-8 w-8 text-amber-400" />,
            action: generateBlankVehicleLog,
            color: "from-amber-500/20 to-amber-600/5",
            borderColor: "border-amber-500/30"
        }
    ];

    return (
        <div className="min-h-screen p-8 animate-fade-in">
            <div className="max-w-6xl mx-auto">
                <PageHeader
                    title="Printable Forms"
                    subtitle="Download forms you can print and fill out by hand."
                    icon={FileDown}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {forms.map((form, index) => (
                        <div
                            key={index}
                            className={`group relative p-8 rounded-[2rem] border ${form.borderColor} bg-white/40 dark:bg-white/5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 shadow-premium`}
                        >
                            <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit group-hover:scale-110 transition-transform duration-300 shadow-inner">
                                {form.icon}
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 font-display">
                                {form.title}
                            </h3>

                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8 font-medium">
                                {form.description}
                            </p>

                            <button
                                onClick={async () => await form.action()}
                                className="w-full py-4 px-6 bg-taguig-blue text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-taguig-navy hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-taguig-blue/20 flex items-center justify-center gap-3"
                            >
                                <Download className="h-4 w-4" strokeWidth={3} />
                                Download PDF
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-16 p-8 rounded-[2rem] border border-white/60 dark:border-white/5 bg-white/30 dark:bg-black/20 backdrop-blur-md shadow-inner">
                    <h4 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-3 font-display uppercase tracking-tight">
                        <span className="h-2 w-2 rounded-full bg-taguig-red animate-pulse shadow-[0_0_10px_rgba(214,45,32,0.5)]"></span>
                        Important Usage Note
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        These forms are for physical use when offline or for manual signature requirements.
                        They follow the official **Taguig City & Barangay Northside** branding standards.
                        Submit filled forms to the **Bantay Bayan** office for official digital recording.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DownloadForms;
