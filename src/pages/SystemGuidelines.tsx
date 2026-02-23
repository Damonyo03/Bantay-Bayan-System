
import React from 'react';
import { 
  BookOpen, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Scale,
  FileText,
  Lock
} from 'lucide-react';

const SystemGuidelines: React.FC = () => {
  const sections = [
    {
      title: 'Operational Protocol',
      icon: <Shield className="text-blue-600" />,
      items: [
        'All incidents must be logged immediately upon receipt of report.',
        'Official radio codes must be used during all dispatch operations.',
        'Personnel must remain on their assigned shift unless authorized by a supervisor.',
        'Restricted persons list must be checked before granting entry to secure areas.'
      ]
    },
    {
      title: 'Data Privacy & Security',
      icon: <Lock className="text-purple-600" />,
      items: [
        'Sharing of system credentials is strictly prohibited.',
        'CCTV footage requests must be accompanied by a valid purpose and identification.',
        'Personal data of complainants and victims must be handled with utmost confidentiality.',
        'System logs are audited weekly for unauthorized access or modifications.'
      ]
    },
    {
      title: 'Incident Reporting',
      icon: <FileText className="text-emerald-600" />,
      items: [
        'Narratives must be objective, factual, and free from personal bias.',
        'All involved parties must be documented with accurate contact information.',
        'Medical emergencies require immediate coordination with city health responders.',
        'Photos and digital evidence should be attached to the case file when available.'
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
          <BookOpen className="mr-3 text-blue-600" />
          System Guidelines
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">Standard operating procedures and system usage policies.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {sections.map((section, i) => (
          <section key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                {section.icon}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{section.title}</h2>
            </div>
            
            <ul className="space-y-4">
              {section.items.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-4 group">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 group-hover:scale-150 transition-transform" />
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2 flex items-center">
              <Info className="mr-2" size={20} />
              Need Assistance?
            </h2>
            <p className="text-blue-100 mb-6">If you encounter technical issues or require clarification on protocols, contact the System Administrator.</p>
            <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all">
              Contact Support
            </button>
          </div>
          <Shield size={120} className="absolute -right-8 -bottom-8 text-white/10 rotate-12" />
        </div>
      </div>
    </div>
  );
};

export default SystemGuidelines;
