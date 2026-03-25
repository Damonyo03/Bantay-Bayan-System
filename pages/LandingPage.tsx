import React, { useState, useEffect, useCallback } from 'react';
import { 
    Shield, 
    Bell, 
    Users, 
    ChevronRight, 
    ChevronLeft,
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
    Activity,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HERO_SLIDES = [
    {
        title: "Peace.",
        highlight: "Order.",
        subtitle: "Security.",
        description: "Establishing a framework of excellence for Barangay Post Proper Northside. The Fleetonix system ensures unified command and rapid response.",
        image: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&q=80",
        badge: "Official BGC Security Operations"
    },
    {
        title: "Tactical.",
        highlight: "Rapid.",
        subtitle: "Response.",
        description: "Our dispatcher units are equipped with real-time telemetry for maximum efficiency. Every second counts in community safety.",
        image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80",
        badge: "24/7 Dispatch Control"
    },
    {
        title: "Unified.",
        highlight: "Smart.",
        subtitle: "Governance.",
        description: "Bantay Bayan integrates city-wide resources into a single point of command. Professional excellence in every operation.",
        image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80",
        badge: "Smart City Infrastructure"
    }
];

const SERVICES = [
    {
        icon: Navigation,
        title: "Dispatch Guidelines",
        desc: "Institutional protocols for rapid personnel deployment and incident response hierarchy.",
        content: "Our dispatch system follows the SOP-7 security framework. Every incident report triggers a tiered response: Tier 1 (Immediate Patrol Dispatch), Tier 2 (Tactical Command Support), and Tier 3 (Inter-agency Coordination)."
    },
    {
        icon: Smartphone,
        title: "Resource Tracking",
        desc: "Real-time asset management and field operator geolocation for maximized coverage.",
        content: "Bantay Bayan utilizes encrypted GPS telemetry to track all active patrol vehicles and personnel. This ensures that the nearest unit is always the first on the scene, minimizing response windows."
    },
    {
        icon: AlertTriangle,
        title: "Incident Logging",
        desc: "Digital vault for documenting operational activities and security observations.",
        content: "All operational logs are stored in a secure, immutable ledger. This data provides the core analytics for safety heatmaps and strategic deployment planning within the BGC North sectors."
    }
];

const SECTIONS = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'services', label: 'Operations' },
    { id: 'team', label: 'Leadership' },
    { id: 'emergency', label: 'Emergency' }
];

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [modalData, setModalData] = useState<{ title: string, content: string, icon?: any } | null>(null);
    
    // Carousel States
    const [mainIndex, setMainIndex] = useState(0);
    const [heroIndex, setHeroIndex] = useState(0);
    const [servicesIndex, setServicesIndex] = useState(0);
    const [hierarchyIndex, setHierarchyIndex] = useState(0);

    // Auto-advance Hero Carousel (Nested)
    useEffect(() => {
        if (mainIndex === 0) {
            const timer = setInterval(() => {
                setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
            }, 6000);
            return () => clearInterval(timer);
        }
    }, [mainIndex]);

    const navigateToSection = (index: number) => {
        setMainIndex(index);
        setIsMenuOpen(false);
    };

    return (
        <div className="h-screen w-screen bg-slate-950 font-sans selection:bg-taguig-blue/20 selection:text-taguig-blue transition-colors duration-500 overflow-hidden flex flex-col">
            
            {/* Main Navigation (Fixed) */}
            <nav className="sticky top-0 left-0 right-0 z-[90] bg-slate-900/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex-shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-4 group cursor-pointer" onClick={() => setMainIndex(0)}>
                        <div className="flex items-center space-x-2">
                            <img src="/taguig_seal.png" alt="Taguig Seal" className="h-10 w-auto drop-shadow-md group-hover:rotate-12 transition-transform" />
                            <img src="/brgy_seal.png" alt="Barangay Seal" className="h-10 w-auto drop-shadow-md" />
                        </div>
                        <div className="hidden sm:block border-l border-white/10 pl-4">
                            <h1 className="text-base font-black text-white uppercase italic leading-none tracking-tight">Post Proper Northside</h1>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Peace & Security Operations</p>
                        </div>
                    </div>
                    
                    {/* Desktop Menu */}
                    <div className="hidden lg:flex items-center space-x-10 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {SECTIONS.map((sec, idx) => (
                            <button 
                                key={sec.id}
                                onClick={() => navigateToSection(idx)} 
                                className={`transition-colors ${mainIndex === idx ? 'text-taguig-gold' : 'hover:text-taguig-gold'}`}
                            >
                                {sec.label}
                            </button>
                        ))}
                        <button 
                            onClick={() => navigate('/login')}
                            className="px-6 py-2.5 bg-taguig-blue text-white rounded-full hover:bg-taguig-navy transition-all shadow-xl shadow-taguig-blue/20 flex items-center group"
                        >
                            <span>Portal Login</span>
                            <ArrowUpRight size={12} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button 
                        className="lg:hidden p-2 bg-white/5 rounded-xl text-white hover:bg-taguig-blue hover:text-white transition-all"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Mobile Dropdown */}
                {isMenuOpen && (
                    <div className="lg:hidden absolute top-full left-0 right-0 bg-slate-900 border-b border-white/10 p-6 space-y-2 animate-in slide-in-from-top-4 duration-300">
                        {SECTIONS.map((sec, idx) => (
                            <button 
                                key={sec.id}
                                onClick={() => navigateToSection(idx)} 
                                className={`block w-full text-left py-3 text-[10px] font-black uppercase tracking-widest border-b border-white/5 ${mainIndex === idx ? 'text-taguig-gold' : 'text-slate-400'}`}
                            >
                                {sec.label}
                            </button>
                        ))}
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full mt-4 py-4 bg-taguig-blue text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl"
                        >
                            Portal Login
                        </button>
                    </div>
                )}
            </nav>

            {/* Master Carousel Container */}
            <div className="flex-1 relative overflow-hidden">
                <div 
                    className="h-full flex transition-transform duration-1000 ease-[cubic-bezier(0.87,0,0.13,1)]"
                    style={{ transform: `translateX(-${mainIndex * 100}%)` }}
                >
                    
                    {/* Slide 0: Introduction (Hero Sub-Carousel) */}
                    <div className="w-full h-full flex-shrink-0 relative">
                        {HERO_SLIDES.map((slide, index) => (
                            <div 
                                key={index}
                                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === heroIndex ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-110 z-0'}`}
                            >
                                <div className="absolute inset-0 bg-slate-900">
                                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-10"></div>
                                    <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url('${slide.image}')` }}></div>
                                    <div className="absolute inset-0 bg-taguig-blue/10 mix-blend-overlay"></div>
                                </div>

                                <div className="max-w-7xl mx-auto h-full flex items-center w-full relative z-20 px-6">
                                    <div className={`max-w-3xl space-y-6 transition-all duration-1000 delay-300 ${index === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                                        <h2 className="text-6xl md:text-8xl lg:text-9xl font-black text-white uppercase tracking-tighter italic leading-[0.85]">
                                            {slide.title} <br />
                                            <span className="text-taguig-gold">{slide.highlight}</span> <br />
                                            {slide.subtitle}
                                        </h2>

                                        <p className="text-lg text-white/60 font-medium leading-relaxed max-w-xl">
                                            {slide.description}
                                        </p>

                                        <div className="flex flex-wrap gap-4 pt-4">
                                            <button 
                                                onClick={() => setMainIndex(1)}
                                                className="px-10 py-5 bg-white text-slate-900 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:scale-105 hover:bg-taguig-gold transition-all shadow-2xl flex items-center group"
                                            >
                                                <span>Learn More</span>
                                                <ChevronRight size={16} className="ml-3 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                            <button 
                                                onClick={() => navigate('/login')}
                                                className="px-10 py-5 bg-transparent border-2 border-white/20 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:border-white transition-all flex items-center"
                                            >
                                                Dispatch Portal
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Slide 1: Operations (Services Sub-Carousel) */}
                    <div className="w-full h-full flex-shrink-0 bg-slate-900/50 flex flex-col justify-center px-6">
                        <div className="max-w-7xl mx-auto w-full">
                                <div className="space-y-3 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start space-x-3 text-taguig-gold uppercase tracking-widest text-[10px] font-black">
                                        <Activity size={16} />
                                        <span>Operational Services</span>
                                    </div>
                                    <h3 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic leading-none">Security Network</h3>
                                    <p className="text-slate-400 font-medium max-w-xl text-sm">Comprehensive tracking and tactical response services.</p>
                                </div>
                            <div className="relative overflow-hidden py-4">
                                <div className="flex transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ transform: `translateX(-${servicesIndex * (100 / (window.innerWidth >= 1024 ? 3 : 1))}%)` }}>
                                    {SERVICES.map((s, idx) => (
                                        <div key={idx} className="w-full lg:w-1/3 flex-shrink-0 px-3">
                                            <DirectoryCard icon={s.icon} title={s.title} desc={s.desc} onClick={() => setModalData({ title: s.title, icon: s.icon, content: s.content })} active={idx === servicesIndex} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Slide 2: Leadership (Hierarchy Sub-Carousel) */}
                    <div className="w-full h-full flex-shrink-0 bg-slate-950 flex flex-col justify-center px-6 overflow-hidden">
                        <div className="max-w-7xl mx-auto w-full">
                            <div className="text-center space-y-3 mb-12 flex flex-col items-center group">
                                <div className="p-3 bg-taguig-gold/5 rounded-2xl text-taguig-gold group-hover:scale-110 transition-transform"><Users size={28} /></div>
                                <h3 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter italic leading-none">Institutional Hierarchy</h3>
                                <p className="text-slate-400 font-medium max-w-2xl mx-auto text-sm">Strategic command and operational leadership.</p>
                            </div>
                            <div className="relative">
                                {/* Sliding Titles */}
                                <div className="flex justify-center mb-8 h-8 overflow-hidden">
                                    <div className="flex flex-col items-center transition-transform duration-700 ease-in-out" style={{ transform: `translateY(-${hierarchyIndex * 100}%)` }}>
                                        <span className="text-xs font-black uppercase tracking-[0.4em] text-taguig-gold/60 h-8 flex items-center">The Executive Command</span>
                                        <span className="text-xs font-black uppercase tracking-[0.4em] text-taguig-gold/60 h-8 flex items-center">The Legislative Assembly</span>
                                    </div>
                                </div>

                                <div className="overflow-hidden">
                                    <div className="flex transition-all duration-700 ease-in-out" style={{ transform: `translateX(-${hierarchyIndex * 100}%)` }}>
                                        <div className="w-full flex-shrink-0 flex flex-col items-center space-y-12 py-4">
                                            <div className="w-full flex justify-center"><MemberNode role="Punong Barangay" name="HON. RICHARD C. PASADILLA" desc="Executive Command" primary /></div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
                                                <MemberNode role="Barangay Secretary" name="HON. ANDREA JEAN E. DELLOSA" desc="Administration" />
                                                <MemberNode role="Barangay Treasurer" name="HON. ALEXANDER V. AGAWIN JR." desc="Fiscal Oversight" />
                                            </div>
                                        </div>
                                        <div className="w-full flex-shrink-0 flex flex-col items-center overflow-y-auto max-h-[55vh] transition-scrollbar py-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl px-4 pb-20">
                                                <MemberNode role="Kagawad" name="HON. EDNA M. BACCAY" desc="Education & Culture" compact />
                                                <MemberNode role="Kagawad" name="HON. CHRISTINE JAGONIO" desc="Finance & Social Services" compact />
                                                <MemberNode role="Kagawad" name="HON. NILDA B. CAYABYAB" desc="Health & Sanitation" compact />
                                                <MemberNode role="Kagawad" name="HON. ISAGANI M. DELGADO" desc="Livelihood" compact />
                                                <MemberNode role="Kagawad" name="HON. IRENE GRACE G. REALOSA" desc="Infrastructure & DRRM" compact />
                                                <MemberNode role="Kagawad" name="HON. ARNEL P. MATUTINO" desc="Peace & Order" compact />
                                                <MemberNode role="Kagawad" name="HON. MYRNA P. MIGUEL" desc="Cleanliness & Beautification" compact />
                                                <MemberNode role="SK Chairperson" name="HON. JOSHUA DANIEL C. ESPEJO" desc="Youth Development" compact />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center space-x-12 mt-12 mb-8">
                                    <button 
                                        onClick={() => setHierarchyIndex(0)} 
                                        className={`group relative flex flex-col items-center space-y-2 transition-all ${hierarchyIndex === 0 ? 'text-taguig-gold' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Executive</span>
                                        <div className={`h-1 rounded-full transition-all duration-500 ${hierarchyIndex === 0 ? 'w-12 bg-taguig-gold' : 'w-0 bg-transparent group-hover:w-6 group-hover:bg-slate-700'}`}></div>
                                    </button>
                                    <div className="h-px w-16 bg-white/10 hidden md:block"></div>
                                    <button 
                                        onClick={() => setHierarchyIndex(1)} 
                                        className={`group relative flex flex-col items-center space-y-2 transition-all ${hierarchyIndex === 1 ? 'text-taguig-gold' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Legislative</span>
                                        <div className={`h-1 rounded-full transition-all duration-500 ${hierarchyIndex === 1 ? 'w-12 bg-taguig-gold' : 'w-0 bg-transparent group-hover:w-6 group-hover:bg-slate-700'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Slide 3: Emergency & Footer Summary */}
                    <div className="w-full h-full flex-shrink-0 bg-slate-950 flex flex-col justify-center px-6 text-white relative">
                        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div className="space-y-10">
                                <div className="flex items-center space-x-4">
                                    <img src="/taguig_seal.png" alt="Taguig Seal" className="h-16 w-auto" />
                                    <img src="/brgy_seal.png" alt="Barangay Seal" className="h-16 w-auto opacity-80" />
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-5xl font-black uppercase italic leading-none tracking-tighter">Emergency <br /><span className="text-taguig-gold">Response Hub</span></h3>
                                    <p className="text-white/40 font-medium max-w-md leading-relaxed">Official gateway for Unified Security operations within Post Proper Northside. Rapid. Tactical. Professional.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-white/5 pt-10">
                                    <div className="space-y-4">
                                        <h5 className="text-[10px] font-black text-taguig-gold uppercase tracking-widest">24/7 Hotlines</h5>
                                        <div className="space-y-2 text-sm font-bold text-white/70">
                                            <p className="flex justify-between"><span>Unit 1:</span> <span className="text-white">0917-810-6711</span></p>
                                            <p className="flex justify-between"><span>Unit 2:</span> <span className="text-white">0917-811-6711</span></p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h5 className="text-[10px] font-black text-taguig-gold uppercase tracking-widest">Portal Links</h5>
                                        <div className="space-y-2 text-sm font-bold text-white/70 flex flex-col">
                                            <button onClick={() => setMainIndex(1)} className="text-left hover:text-white transition-colors">Operational SOPs</button>
                                            <button onClick={() => navigate('/login')} className="text-left hover:text-white transition-colors">Admin Portal Access</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="hidden lg:block relative group">
                                <div className="absolute inset-0 bg-taguig-blue/20 blur-[100px] rounded-full group-hover:bg-taguig-blue/30 transition-all"></div>
                                <div className="relative aspect-square border border-white/10 rounded-full flex items-center justify-center animate-pulse">
                                    <Shield size={120} className="text-taguig-gold/20" />
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-10 left-6 right-6 flex items-center justify-between opacity-30 text-[9px] font-black uppercase tracking-[0.4em]">
                            <p>BMS Core Command v4.0 © 2026</p>
                            <div className="flex space-x-6"><span>Terms</span> <span>Privacy</span></div>
                        </div>
                    </div>

                </div>


            </div>


            {/* Info Modal */}
            {modalData && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setModalData(null)}></div>
                    <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-premium overflow-hidden border border-white dark:border-white/10 animate-in zoom-in-95 duration-300">
                        <div className="p-10 sm:p-14 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-5">
                                    <div className="p-4 bg-taguig-gold/5 rounded-2xl text-taguig-gold shadow-inner">
                                        {modalData.icon && <modalData.icon size={28} />}
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight italic leading-none">{modalData.title}</h3>
                                </div>
                                <button onClick={() => setModalData(null)} className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-red-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-lg text-slate-400 font-medium leading-relaxed">
                                {modalData.content}
                            </p>
                            <div className="pt-8 flex justify-end">
                                <button 
                                    onClick={() => setModalData(null)}
                                    className="px-10 py-5 bg-taguig-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
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

const DirectoryCard: React.FC<{ icon: any, title: string, desc: string, onClick: () => void, active?: boolean }> = ({ icon: Icon, title, desc, onClick, active }) => (
    <div 
        onClick={onClick}
        className={`group relative bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border shadow-2xl transition-all cursor-pointer overflow-hidden ${active ? 'border-taguig-gold ring-1 ring-taguig-gold/20' : 'border-white/5 opacity-60 hover:opacity-100 hover:border-white/20'}`}
    >
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-taguig-blue/10 rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
        <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-taguig-gold/5 rounded-full group-hover:scale-150 transition-transform duration-1000 delay-100"></div>
        <div className="relative z-10 space-y-4">
            <div className="p-4 bg-taguig-gold/10 text-taguig-gold rounded-2xl inline-block group-hover:bg-taguig-gold group-hover:text-slate-950 transition-all duration-500 shadow-lg">
                <Icon size={24} />
            </div>
            <h4 className="text-xl font-black text-white uppercase tracking-tight italic group-hover:text-taguig-gold transition-colors">{title}</h4>
            <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2">{desc}</p>
            <div className="flex items-center text-[9px] font-black text-taguig-gold uppercase tracking-widest pt-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                <span>Access Details</span>
                <ChevronRight size={12} className="ml-1" />
            </div>
        </div>
    </div>
);

const MemberNode: React.FC<{ role: string, name: string, desc: string, primary?: boolean, compact?: boolean }> = ({ role, name, desc, primary, compact }) => {
    const initials = name.split(' ').filter(n => n !== 'HON.' && n !== 'JR.').map(n => n[0]).join('').slice(0, 2);
    
    return (
        <div className={`
            group relative flex flex-col items-center transition-all duration-500
            ${compact ? 'p-6 rounded-3xl w-full' : 'p-10 rounded-[3rem] w-full max-w-sm'}
            ${primary 
                ? 'bg-taguig-blue text-white shadow-[0_20px_50px_rgba(0,56,168,0.4)] border border-white/20 scale-110 z-10' 
                : 'bg-slate-900/40 backdrop-blur-2xl text-white border border-white/10 shadow-2xl hover:border-taguig-gold/50'}
            hover:scale-[1.05] active:scale-[0.98]
        `}>
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-inherit pointer-events-none"></div>
            
            {/* Avatar Section */}
            <div className={`relative mb-6 ${compact ? 'w-16 h-16' : 'w-24 h-24'}`}>
                <div className={`absolute inset-0 rounded-full blur-xl scale-110 transition-all duration-700 opacity-0 group-hover:opacity-50 ${primary ? 'bg-white' : 'bg-taguig-gold'}`}></div>
                <div className={`
                    relative w-full h-full rounded-full flex items-center justify-center border-2 overflow-hidden
                    ${primary ? 'bg-white/10 border-white/30' : 'bg-slate-800 border-white/10 group-hover:border-taguig-gold/50'}
                `}>
                    <span className={`font-black uppercase tracking-tighter ${compact ? 'text-lg' : 'text-3xl'} ${primary ? 'text-white' : 'text-taguig-gold'}`}>
                        {initials}
                    </span>
                    {/* Subtle Scanline Animation */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent h-1/2 w-full -translate-y-full group-hover:translate-y-full transition-transform duration-[2s] ease-linear"></div>
                </div>
                {primary && (
                    <div className="absolute -right-1 -bottom-1 bg-taguig-gold text-slate-950 p-1.5 rounded-full shadow-lg border-2 border-taguig-blue transform group-hover:rotate-12 transition-transform">
                        <Shield size={12} fill="currentColor" />
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="text-center space-y-2 relative z-10">
                <div className={`
                    inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-2
                    ${primary ? 'bg-white/10 text-white border border-white/10' : 'bg-taguig-gold/10 text-taguig-gold border border-taguig-gold/20'}
                `}>
                    {role}
                </div>
                <h4 className={`${compact ? 'text-base' : 'text-2xl'} font-black uppercase tracking-tight italic leading-tight group-hover:text-taguig-gold transition-colors duration-300`}>
                    {name}
                </h4>
                <p className={`text-[10px] font-bold tracking-[0.25em] uppercase transition-all duration-300 ${primary ? 'text-white/60' : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {desc}
                </p>
            </div>

            {/* Hover Glow Background */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-2/3 h-1/2 bg-taguig-gold/20 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        </div>
    );
};

export default LandingPage;
