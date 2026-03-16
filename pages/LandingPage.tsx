import React, { useState } from 'react';
import { 
    Shield, 
    Bell, 
    Users, 
    ChevronRight, 
    Building2,
    Globe,
    FileText,
    Smartphone,
    Info,
    ArrowUpRight,
    Moon,
    Sun,
    Mail,
    X,
    Menu,
    Phone,
    MapPin,
    AlertTriangle,
    Navigation,
    Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const LandingPage: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [modalData, setModalData] = useState<{ title: string, content: string, icon?: any } | null>(null);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setIsMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-taguig-blue/20 selection:text-taguig-blue transition-colors duration-500 overflow-x-hidden">
            
            {/* Utility Top-Bar */}
            <div className="bg-slate-900 border-b border-white/5 py-2.5 px-6 relative z-[70]">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">
                    <div className="flex items-center space-x-6">
                        <a href="mailto:barangayostpropernorthside@gmail.com" className="flex items-center hover:text-taguig-gold transition-colors">
                            <Mail size={12} className="mr-2 text-taguig-gold" />
                            barangayostpropernorthside@gmail.com
                        </a>
                        <a href="tel:87106711" className="flex items-center hover:text-taguig-gold transition-colors">
                            <Phone size={12} className="mr-2 text-taguig-gold" />
                            8710-6711 / 8788-1764
                        </a>
                    </div>
                    <div className="hidden md:flex items-center space-x-4">
                        <span className="flex items-center">
                            <MapPin size={12} className="mr-2 text-taguig-gold" />
                            Bonifacio Global City, Taguig
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="sticky top-0 left-0 right-0 z-[60] bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="flex items-center space-x-2">
                            <img src="/taguig_seal.png" alt="Taguig Seal" className="h-12 w-auto drop-shadow-md group-hover:rotate-12 transition-transform" />
                            <img src="/brgy_seal.png" alt="Barangay Seal" className="h-12 w-auto drop-shadow-md" />
                        </div>
                        <div className="hidden sm:block border-l border-slate-200 dark:border-white/10 pl-4">
                            <h1 className="text-lg font-black text-taguig-blue dark:text-white uppercase italic leading-none tracking-tight">Post Proper Northside</h1>
                            <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mt-1">Peace & Security Operations</p>
                        </div>
                    </div>
                    
                    {/* Desktop Menu */}
                    <div className="hidden lg:flex items-center space-x-10 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                        <button onClick={() => scrollToSection('about')} className="hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors">Introduction</button>
                        <button onClick={() => scrollToSection('services')} className="hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors">Services</button>
                        <button onClick={() => scrollToSection('team')} className="hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors">Hierarchy</button>
                        <button 
                            onClick={() => navigate('/login')}
                            className="px-8 py-3 bg-slate-900 dark:bg-taguig-blue text-white rounded-full hover:bg-taguig-navy transition-all shadow-xl shadow-taguig-blue/20 flex items-center group"
                        >
                            <span>Portal Login</span>
                            <ArrowUpRight size={14} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button 
                        className="lg:hidden p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-600 dark:text-white hover:bg-taguig-blue hover:text-white transition-all"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Mobile Dropdown */}
                {isMenuOpen && (
                    <div className="lg:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <button onClick={() => scrollToSection('about')} className="block w-full text-left py-4 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 border-b border-slate-50 dark:border-white/5">Introduction</button>
                        <button onClick={() => scrollToSection('services')} className="block w-full text-left py-4 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 border-b border-slate-50 dark:border-white/5">Services</button>
                        <button onClick={() => scrollToSection('team')} className="block w-full text-left py-4 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 border-b border-slate-50 dark:border-white/5">Hierarchy</button>
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full py-4 bg-taguig-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl"
                        >
                            Portal Login
                        </button>
                    </div>
                )}
            </nav>

            {/* Hero Banner with Dark Overlay */}
            <section id="about" className="relative min-h-[85vh] flex items-center px-6 overflow-hidden">
                <div className="absolute inset-0 bg-slate-900">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-10"></div>
                    <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
                    <div className="absolute inset-0 bg-taguig-blue/10 mix-blend-overlay"></div>
                </div>

                <div className="max-w-7xl mx-auto w-full relative z-20">
                    <div className="max-w-3xl space-y-8 animate-fade-in translate-y-10">
                        <div className="inline-flex items-center px-4 py-2 bg-taguig-blue/20 border border-taguig-blue/30 rounded-full text-white text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-md">
                            <Shield size={14} className="mr-3 text-taguig-gold" />
                            Official BGC Security Operations
                        </div>
                        
                        <h2 className="text-6xl md:text-8xl lg:text-9xl font-black text-white uppercase tracking-tighter italic leading-[0.85]">
                            Peace. <br />
                            <span className="text-taguig-gold">Order.</span> <br />
                            Security.
                        </h2>

                        <p className="text-xl text-white/60 font-medium leading-relaxed max-w-xl">
                            Establishing a framework of excellence for Barangay Post Proper Northside. 
                            The Fleetonix system ensures unified command and rapid response.
                        </p>

                        <div className="flex flex-wrap gap-4 pt-6">
                            <button 
                                onClick={() => scrollToSection('services')}
                                className="px-10 py-5 bg-white text-slate-900 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:scale-105 hover:bg-taguig-gold transition-all shadow-2xl flex items-center group"
                            >
                                <span>Learn More</span>
                                <ChevronRight size={16} className="ml-3 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button 
                                onClick={() => navigate('/login')}
                                className="px-10 py-5 bg-transparent border-2 border-white/20 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:border-white transition-all flex items-center"
                            >
                                Dispatch Portal Login
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4 animate-bounce opacity-40">
                    <div className="w-px h-12 bg-gradient-to-b from-white to-transparent"></div>
                </div>
            </section>

            {/* Services & Directory Grid */}
            <section id="services" className="py-32 px-6 relative bg-slate-50 dark:bg-slate-900/50">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-10">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 text-taguig-blue dark:text-taguig-gold uppercase tracking-widest text-[10px] font-black">
                                <Activity size={16} />
                                <span>Operational Services</span>
                            </div>
                            <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Security Network</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl">Comprehensive tracking and tactical response services for the community.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <DirectoryCard 
                            icon={Navigation}
                            title="Dispatch Guidelines"
                            desc="Institutional protocols for rapid personnel deployment and incident response hierarchy."
                            onClick={() => setModalData({
                                title: "Dispatch Protocols",
                                icon: Navigation,
                                content: "Our dispatch system follows the SOP-7 security framework. Every incident report triggers a tiered response: Tier 1 (Immediate Patrol Dispatch), Tier 2 (Tactical Command Support), and Tier 3 (Inter-agency Coordination)."
                            })}
                        />
                        <DirectoryCard 
                            icon={Smartphone}
                            title="Resource Tracking"
                            desc="Real-time asset management and field operator geolocation for maximized coverage."
                            onClick={() => setModalData({
                                title: "Resource Management",
                                icon: Smartphone,
                                content: "Bantay Bayan utilizes encrypted GPS telemetry to track all active patrol vehicles and personnel. This ensures that the nearest unit is always the first on the scene, minimizing response windows."
                            })}
                        />
                        <DirectoryCard 
                            icon={AlertTriangle}
                            title="Incident Logging"
                            desc="Digital vault for documenting operational activities and security observations."
                            onClick={() => setModalData({
                                title: "Incident Records",
                                icon: AlertTriangle,
                                content: "All operational logs are stored in a secure, immutable ledger. This data provides the core analytics for safety heatmaps and strategic deployment planning within the BGC North sectors."
                            })}
                        />
                    </div>
                </div>
            </section>

            {/* Organizational Architecture */}
            <section id="team" className="py-32 bg-white dark:bg-slate-950 px-6 border-y border-slate-100 dark:border-white/5 transition-colors duration-500">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center space-y-4 mb-24 flex flex-col items-center group">
                        <div className="p-4 bg-taguig-blue/5 dark:bg-taguig-gold/5 rounded-3xl text-taguig-blue dark:text-taguig-gold mb-2 group-hover:scale-110 transition-transform">
                            <Users size={32} />
                        </div>
                        <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Institutional Hierarchy</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">Strategic command and operational leadership for Post Proper Northside Security.</p>
                    </div>

                    <div className="flex flex-col items-center space-y-16">
                        {/* Executive Level */}
                        <div className="w-full flex justify-center">
                            <MemberNode 
                                role="Punong Barangay" 
                                name="HON. RICHARD C. PASADILLA" 
                                desc="Executive Command"
                                primary
                            />
                        </div>

                        {/* Operational Level */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                            <MemberNode role="Barangay Secretary" name="HON. [SECRETARY NAME]" desc="Administration" />
                            <MemberNode role="Barangay Treasurer" name="HON. [TREASURER NAME]" desc="Fiscal Oversight" />
                        </div>

                        {/* Legislative/Kagawad Level */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
                            <MemberNode role="Kagawad" name="HON. [NAME 1]" desc="Peace & Order" compact />
                            <MemberNode role="Kagawad" name="HON. [NAME 2]" desc="Infrastructure" compact />
                            <MemberNode role="Kagawad" name="HON. [NAME 3]" desc="Health & Safety" compact />
                            <MemberNode role="Kagawad" name="HON. [NAME 4]" desc="Social Services" compact />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-24 bg-slate-950 text-white px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col lg:flex-row items-start justify-between gap-16 pb-16 border-b border-white/5">
                        <div className="space-y-8 max-w-sm">
                            <div className="flex items-center space-x-4">
                                <img src="/taguig_seal.png" alt="Taguig Seal" className="h-16 w-auto" />
                                <img src="/brgy_seal.png" alt="Barangay Seal" className="h-16 w-auto opacity-80" />
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-xl font-black uppercase italic tracking-tight">Post Proper Northside</h4>
                                <p className="text-sm text-white/40 leading-relaxed font-medium">
                                    The official Unified Security and Incident Response gateway. Dedicated to professional excellence in community safety.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 lg:gap-24">
                            <div className="space-y-6">
                                <h5 className="text-[11px] font-black text-taguig-gold uppercase tracking-[0.3em]">Operational Hotlines</h5>
                                <div className="space-y-4 text-white/60 text-sm font-bold">
                                    <p className="flex justify-between items-center gap-10"><span>Dispatcher Unit 1:</span> <span className="text-white">0917-810-6711</span></p>
                                    <p className="flex justify-between items-center gap-10"><span>Dispatcher Unit 2:</span> <span className="text-white">0917-811-6711</span></p>
                                    <p className="flex justify-between items-center gap-10"><span>Tactical Support:</span> <span className="text-white">0917-812-6711</span></p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h5 className="text-[11px] font-black text-taguig-gold uppercase tracking-[0.3em]">Portal Information</h5>
                                <div className="space-y-4 text-white/60 text-sm font-bold">
                                    <button onClick={() => scrollToSection('about')} className="block hover:text-white transition-colors">SOP-7 Guidelines</button>
                                    <button onClick={() => scrollToSection('services')} className="block hover:text-white transition-colors">Deployment Heatmap</button>
                                    <button onClick={() => navigate('/login')} className="block hover:text-white transition-colors underline underline-offset-8">Internal Systems Access</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-12 flex flex-col md:flex-row items-center justify-between gap-6 opacity-30">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">BMS Core Command v4.0 © 2026</p>
                        <div className="flex space-x-8 text-[9px] font-black uppercase tracking-widest">
                            <a href="#" className="hover:text-taguig-gold transition-colors">Strategic Policy</a>
                            <a href="#" className="hover:text-taguig-gold transition-colors">Data Protocol</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Theme Toggle Button */}
            <button 
                onClick={toggleTheme}
                className="fixed bottom-8 right-8 z-[100] p-5 bg-slate-100 dark:bg-slate-800 text-taguig-blue dark:text-taguig-gold rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all border border-slate-200 dark:border-white/10"
            >
                {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
            </button>

            {/* Info Modal */}
            {modalData && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setModalData(null)}></div>
                    <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-premium overflow-hidden border border-white dark:border-white/10 animate-in zoom-in-95 duration-300">
                        <div className="p-10 sm:p-14 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-5">
                                    <div className="p-4 bg-taguig-blue/5 dark:bg-taguig-gold/5 rounded-2xl text-taguig-blue dark:text-taguig-gold shadow-inner">
                                        {modalData.icon && <modalData.icon size={28} />}
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic leading-none">{modalData.title}</h3>
                                </div>
                                <button onClick={() => setModalData(null)} className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-400 hover:text-red-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                {modalData.content}
                            </p>
                            <div className="pt-8 flex justify-end">
                                <button 
                                    onClick={() => setModalData(null)}
                                    className="px-10 py-5 bg-slate-900 dark:bg-taguig-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    Dismiss Documentation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DirectoryCard: React.FC<{ icon: any, title: string, desc: string, onClick: () => void }> = ({ icon: Icon, title, desc, onClick }) => (
    <div 
        onClick={onClick}
        className="group relative bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-premium hover:shadow-2xl hover:scale-[1.03] transition-all cursor-pointer overflow-hidden"
    >
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-taguig-blue/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
        <div className="relative z-10 space-y-6">
            <div className="p-4 bg-taguig-blue/5 dark:bg-taguig-gold/5 text-taguig-blue dark:text-taguig-gold rounded-2xl inline-block group-hover:bg-taguig-blue group-hover:text-white transition-colors duration-500">
                <Icon size={28} />
            </div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">{title}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">{desc}</p>
            <div className="flex items-center text-[10px] font-black text-taguig-blue dark:text-taguig-gold uppercase tracking-widest pt-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                <span>Access Documentation</span>
                <ChevronRight size={14} className="ml-2" />
            </div>
        </div>
    </div>
);

const MemberNode: React.FC<{ role: string, name: string, desc: string, primary?: boolean, compact?: boolean }> = ({ role, name, desc, primary, compact }) => (
    <div className={`
        ${primary ? 'bg-taguig-blue text-white shadow-2xl scale-110 z-10' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-white/5 shadow-premium'}
        ${compact ? 'p-6 rounded-3xl' : 'p-10 rounded-[3rem] w-full'}
        text-center flex flex-col items-center space-y-3 transition-all hover:scale-[1.05] relative group
    `}>
        <div className={`p-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${primary ? 'bg-white/10 text-taguig-gold' : 'bg-taguig-blue/5 text-taguig-blue dark:text-taguig-gold'}`}>
            {role}
        </div>
        <h4 className={`${compact ? 'text-base' : 'text-2xl'} font-black uppercase tracking-tight italic leading-none`}>{name}</h4>
        <p className={`text-xs font-bold tracking-widest opacity-60`}>{desc}</p>
    </div>
);

export default LandingPage;
