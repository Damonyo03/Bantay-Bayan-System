import React, { useState, useEffect } from 'react';
import {
    Shield,
    ChevronRight,
    ArrowUpRight,
    X,
    Menu,
    Phone,
    MapPin,
    AlertTriangle,
    Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HERO_SLIDES = [
    {
        title: "Our",
        highlight: "Vision",
        subtitle: "Future Forward.",
        description: "Barangay Post Proper Northside envisions a livable, greener, resilient, peaceful, sustainable, progressive, competitive, inclusive and gender-responsive community that is within reach by its people, and the pillar of effective and efficient delivery of quality programs and services that harness its residents to be smart, productive, empowered, and morally upright citizens of Taguig City, the Philippines and of the global community.",
        image: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&q=80",
        badge: "The Vision"
    },
    {
        title: "Our",
        highlight: "Mission",
        subtitle: "Commitment.",
        description: "Barangay Post Proper Northside shall realize its commitment to the community and its people in various sectors through its transparent, well-balanced, inclusive and gender-responsive Programs, Projects and Activities with regard to Peace and Order, Disaster Risk and Environmental management, Economic Development, Health, Social Services, Education, Infrastructure and Finance that foster a 'Strong Sense of Community' among its residents with a high-quality living and with competent and responsible public servants.",
        image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80",
        badge: "The Mission"
    }
];

const SECTIONS = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'leadership', label: 'Leadership' },
    { id: 'emergency', label: 'Emergency' }
];

const SEALS = [
    { src: '/taguig_seal.png', alt: 'Taguig Seal' },
    { src: '/brgy_seal.png', alt: 'Barangay Seal' },
    { src: '/logo.png', alt: 'BMS Logo' }
];

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Carousel States
    const [mainIndex, setMainIndex] = useState(0);
    const [heroIndex, setHeroIndex] = useState(0);
    const [hierarchyIndex, setHierarchyIndex] = useState(0);

    // Auto-advance Hero Carousel (Nested)
    useEffect(() => {
        if (mainIndex === 0) {
            const timer = setInterval(() => {
                setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
            }, 8000);
            return () => clearInterval(timer);
        }
    }, [mainIndex]);

    const navigateToSection = (index: number) => {
        setMainIndex(index);
        setIsMenuOpen(false);
    };

    return (
        <div className="flex-1 w-full bg-slate-950 font-sans selection:bg-taguig-blue/20 selection:text-taguig-blue transition-colors duration-500 overflow-x-hidden flex flex-col">

            {/* Main Navigation (Fixed) */}
            <nav className="sticky top-0 left-0 right-0 z-[90] bg-slate-900/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex-shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-6 group cursor-pointer" onClick={() => setMainIndex(0)}>
                        <div className="flex items-center -space-x-2 md:-space-x-4">
                            {SEALS.map((seal, idx) => (
                                <img 
                                    key={idx} 
                                    src={seal.src} 
                                    alt={seal.alt} 
                                    className="h-10 md:h-14 w-auto drop-shadow-2xl relative z-[5] transition-transform group-hover:scale-110" 
                                    style={{ zIndex: SEALS.length - idx }}
                                />
                            ))}
                        </div>
                        <div className="hidden sm:flex flex-col border-l-2 border-white/10 pl-6 h-full justify-center">
                            <h1 className="text-lg md:text-2xl font-black text-white uppercase italic tracking-tight leading-tight group-hover:text-taguig-gold transition-colors">Post Proper Northside</h1>
                        </div>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden lg:flex items-center space-x-12 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
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
                            className="px-10 py-3.5 bg-taguig-blue text-white rounded-full hover:bg-taguig-navy transition-all shadow-xl shadow-taguig-blue/20 flex items-center group font-black text-xs uppercase"
                        >
                            <span>Portal Login</span>
                            <ArrowUpRight size={14} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
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
            <div className="flex-1 relative overflow-x-hidden overflow-y-auto custom-scrollbar">
                <div
                    className="flex transition-transform duration-1000 ease-[cubic-bezier(0.87,0,0.13,1)] h-fit min-h-full"
                    style={{ transform: `translateX(-${mainIndex * 100}%)` }}
                >

                    {/* Slide 0: Introduction (Hero Sub-Carousel) */}
                    <div className="w-full min-h-full flex-shrink-0 relative">
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

                                <div className="max-w-7xl mx-auto h-full flex items-start w-full relative z-20 px-6 pt-24 md:pt-40 lg:pt-48">
                                    <div className={`max-w-4xl space-y-6 transition-all duration-1000 delay-300 ${index === heroIndex ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
                                        <div className="inline-block px-4 py-1.5 bg-taguig-blue text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                                            {slide.badge}
                                        </div>
                                        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter italic leading-[1.1]">
                                            {slide.title} <br />
                                            <span className="text-taguig-gold">{slide.highlight}</span>
                                        </h2>

                                        <p className="text-sm md:text-lg text-white/70 font-medium leading-relaxed max-w-3xl">
                                            {slide.description}
                                        </p>

                                        <div className="flex flex-wrap gap-4 pt-8">
                                            <button
                                                onClick={() => setMainIndex(1)}
                                                className="px-10 py-5 bg-white text-slate-900 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:scale-105 hover:bg-taguig-gold transition-all shadow-2xl flex items-center group"
                                            >
                                                <span>View Leadership</span>
                                                <ChevronRight size={16} className="ml-3 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                            <button
                                                onClick={() => navigate('/login')}
                                                className="px-10 py-5 bg-transparent border-2 border-white/20 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:border-white transition-all flex items-center"
                                            >
                                                Portal Login
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Slide 1: Leadership (Hierarchy Sub-Carousel) */}
                    <div className="w-full min-h-full flex-shrink-0 bg-slate-950 flex flex-col justify-center px-4 md:px-6 overflow-hidden py-10 md:py-20">
                        <div className="max-w-7xl mx-auto w-full">
                            <div className="text-center space-y-2 mb-6 md:mb-10 flex flex-col items-center group">
                                <h3 className="text-2xl md:text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter italic leading-none">Institutional Hierarchy</h3>
                                <p className="text-slate-400 font-bold max-w-2xl mx-auto text-xs md:text-lg tracking-wide uppercase opacity-60">Strategic command and operational leadership.</p>
                            </div>
                            <div className="relative">
                                {/* Sliding Titles */}
                                <div className="flex justify-center mb-6 md:mb-10 h-10 overflow-hidden relative">
                                    <div className={`transition-all duration-700 ${hierarchyIndex === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute'}`}>
                                        <span className="text-xs md:text-sm font-black uppercase tracking-[0.4em] text-taguig-gold/60 h-10 flex items-center">The Executive Command</span>
                                    </div>
                                    <div className={`transition-all duration-700 ${hierarchyIndex === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute'}`}>
                                        <span className="text-xs md:text-sm font-black uppercase tracking-[0.4em] text-taguig-gold/60 h-10 flex items-center">The Legislative Assembly</span>
                                    </div>
                                </div>

                                <div className="overflow-hidden flex-1">
                                    <div className="flex transition-all duration-700 ease-in-out h-full" style={{ transform: `translateX(-${hierarchyIndex * 100}%)` }}>
                                        <div className="w-full flex-shrink-0 flex items-center justify-center">
                                            <div className="flex flex-col items-center w-full max-w-5xl gap-4 md:gap-8 px-4">
                                                {/* Punong Barangay - Top Row */}
                                                <div className="w-full max-w-xs md:max-w-md">
                                                    <MemberNode role="Punong Barangay" name="HON. RICHARD C. PASADILLA" desc="Executive Command" image="/OFFICIALS/KAP-RICHARD-PASADILLA.jpg" primary />
                                                </div>
                                                
                                                {/* Connecting Line (Visual Only) */}
                                                <div className="hidden md:block h-8 w-px bg-gradient-to-b from-taguig-blue to-white/10"></div>

                                                {/* Secretary & Treasurer - Second Row */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                                                    <MemberNode role="Barangay Secretary" name="HON. ANDREA JEAN E. DELLOSA" desc="Administration" image="/OFFICIALS/SEC-ANDREA-DELLOSA.jpg" compact />
                                                    <MemberNode role="Barangay Treasurer" name="HON. ALEXANDER V. AGAWIN JR." desc="Fiscal Oversight" image="/OFFICIALS/TREAS-ALEX-AGAWIN.jpg" compact />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full flex-shrink-0 flex items-center justify-center py-6">
                                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 lg:gap-10 w-full max-w-7xl px-4 items-stretch">
                                                <MemberNode role="Kagawad" name="HON. EDNA M. BACCAY" desc="Education & Culture" image="/OFFICIALS/KAG-EDNA-BACCAY.jpg" compact />
                                                <MemberNode role="Kagawad" name="HON. CHRISTINE JAGONIO" desc="Finance & Social Services" image="/OFFICIALS/KAG-CHRISTINE-JAGONIO.jpg" compact />
                                                <MemberNode role="Kagawad" name="HON. NILDA B. CAYABYAB" desc="Health & Sanitation" image="/OFFICIALS/KAG-NILDA-CAYABYAB.jpg" compact />
                                                <MemberNode role="Kagawad" name="HON. ISAGANI M. DELGADO" desc="Livelihood" image="/OFFICIALS/KAG-ISAGANI-DELGADO.jpg" compact />
                                                <MemberNode role="Kagawad" name="HON. IRENE GRACE G. REALOSA" desc="Infrastructure & DRRM" image="/OFFICIALS/KAG-IRENE-GRACE-REALOSA.jpg" compact />
                                                <MemberNode role="Kagawad" name="HON. ARNEL P. MATUTINO" desc="Peace & Order" image="/OFFICIALS/KAG-ARNEL-MATUTINO.jpg" compact />
                                                <MemberNode role="Kagawad" name="HON. MYRNA P. MIGUEL" desc="Cleanliness & Beautification" image="/OFFICIALS/KAG-MYRNA-MIGUEL.jpg" compact />
                                                <MemberNode role="SK Chairperson" name="HON. JOSHUA DANIEL C. ESPEJO" desc="Youth Development" image="/OFFICIALS/SK-JOSHUA-ESPEJO.jpg" compact />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center space-x-6 md:space-x-12 mt-1 md:mt-2">
                                    <button
                                        onClick={() => setHierarchyIndex(0)}
                                        className={`group relative flex flex-col items-center space-y-1 transition-all ${hierarchyIndex === 0 ? 'text-taguig-gold' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        <span className="text-xs md:text-sm font-black uppercase tracking-[0.3em]">Executive</span>
                                        <div className={`h-0.5 rounded-full transition-all duration-500 ${hierarchyIndex === 0 ? 'w-10 bg-taguig-gold' : 'w-0 bg-transparent group-hover:w-6 group-hover:bg-slate-700'}`}></div>
                                    </button>
                                    <div className="h-px w-12 bg-white/10 hidden md:block"></div>
                                    <button
                                        onClick={() => setHierarchyIndex(1)}
                                        className={`group relative flex flex-col items-center space-y-2 transition-all ${hierarchyIndex === 1 ? 'text-taguig-gold' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        <span className="text-xs md:text-sm font-black uppercase tracking-[0.3em]">Legislative</span>
                                        <div className={`h-0.5 rounded-full transition-all duration-500 ${hierarchyIndex === 1 ? 'w-10 bg-taguig-gold' : 'w-0 bg-transparent group-hover:w-6 group-hover:bg-slate-700'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Slide 2: Emergency & Footer Summary */}
                    <div className="w-full min-h-full flex-shrink-0 bg-slate-950 flex flex-col justify-start px-6 text-white relative pt-16 md:pt-24 pb-20">
                        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <h3 className="text-4xl md:text-5xl font-black uppercase italic leading-tight tracking-tighter">Emergency <br /><span className="text-taguig-gold">Response Hub</span></h3>
                                    <p className="text-lg text-white/40 font-medium max-w-md leading-relaxed">Official gateway for Unified Security operations within Post Proper Northside. Rapid. Tactical. Professional.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-white/5 pt-10">
                                    <div className="space-y-4">
                                        <h5 className="text-xs md:text-sm font-black text-taguig-gold uppercase tracking-[0.2em] mb-4">24/7 City Hotlines</h5>
                                        <div className="space-y-3 text-sm md:text-lg font-bold text-white/70">
                                            <p className="flex justify-between"><span>National:</span> <span className="text-white">911</span></p>
                                            <p className="flex justify-between"><span>Taguig Emergency:</span> <span className="text-white">165-7777</span></p>
                                            <p className="flex justify-between"><span>Command Center:</span> <span className="text-white">(02) 8789-3200</span></p>
                                            <p className="flex justify-between"><span>BFP Fire:</span> <span className="text-white">(02) 8837-0740</span></p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h5 className="text-xs md:text-sm font-black text-taguig-gold uppercase tracking-[0.2em] mb-4">Barangay Contacts</h5>
                                        <div className="space-y-3 text-sm md:text-lg font-bold text-white/70 flex flex-col">
                                            <p className="flex justify-between"><span>Brgy. Hall:</span> <span className="text-white">(02) 8881 3898</span></p>
                                            <p className="flex items-center mt-4 text-xs md:text-sm text-slate-400 italic gap-3">
                                                <MapPin size={16}/> Lawton Ave, Taguig City
                                            </p>
                                            <button onClick={() => navigate('/login')} className="text-left hover:text-white transition-colors mt-6 bg-white/5 px-6 py-4 rounded-2xl border border-white/10 text-xs md:text-sm uppercase font-black tracking-widest ">Admin Portal Access</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="hidden lg:block relative group">
                                <div className="absolute inset-0 bg-taguig-blue/20 blur-[100px] rounded-full group-hover:bg-taguig-blue/30 transition-all"></div>
                                <div className="relative aspect-square border border-white/10 rounded-full flex items-center justify-center animate-pulse group-hover:animate-none">
                                    <Shield size={120} className="text-taguig-gold/20 group-hover:text-taguig-gold transition-colors duration-500" />
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
        </div>
    );
};

const MemberNode: React.FC<{ role: string, name: string, desc: string, image?: string, primary?: boolean, compact?: boolean }> = ({ role, name, desc, image, primary, compact }) => {
    const initials = name.split(' ').filter(n => n !== 'HON.' && n !== 'JR.').map(n => n[0]).join('').slice(0, 2);

    return (
        <div className={`
            group relative flex flex-col items-center transition-all duration-500 py-6 md:py-8 px-4
            ${compact
                ? 'rounded-xl md:rounded-2xl w-full'
                : 'rounded-[1.5rem] md:rounded-[2rem] w-full'}
            ${primary
                ? 'bg-taguig-blue text-white shadow-xl border border-white/20 z-10'
                : 'bg-slate-900/60 backdrop-blur-2xl text-white border border-white/10 shadow-lg hover:border-taguig-gold/50'}
            hover:scale-[1.03] active:scale-[0.98]
        `}>
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-inherit pointer-events-none"></div>

            {/* Avatar Section */}
            <div className={`relative mb-2 md:mb-4 ${compact ? 'w-10 h-10 md:w-16 md:h-16' : 'w-14 h-14 md:w-24 md:h-24'}`}>
                <div className={`absolute inset-0 rounded-full blur-md scale-110 transition-all duration-700 opacity-0 group-hover:opacity-40 ${primary ? 'bg-white' : 'bg-taguig-gold'}`}></div>
                <div className={`
                    relative w-full h-full rounded-full flex items-center justify-center border-2 md:border-4 overflow-hidden
                    ${primary ? 'bg-white/10 border-white/30' : 'bg-slate-800 border-white/10 group-hover:border-taguig-gold/50'}
                `}>
                    {image ? (
                        <img src={image} alt={name} className="w-full h-full object-cover" />
                    ) : (
                        <span className={`font-black uppercase tracking-tighter ${compact ? 'text-xs md:text-xl' : 'text-lg md:text-3xl'} ${primary ? 'text-white' : 'text-taguig-gold'}`}>
                            {initials}
                        </span>
                    )}
                    {/* Subtle Scanline Animation */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent h-1/2 w-full -translate-y-full group-hover:translate-y-full transition-transform duration-[2s] ease-linear"></div>
                </div>
                {primary && (
                    <div className="absolute -right-1 -bottom-1 bg-taguig-gold text-slate-950 p-1 md:p-2 rounded-full shadow-lg border-2 border-taguig-blue transform group-hover:rotate-12 transition-transform">
                        <Shield size={compact ? 10 : 16} fill="currentColor" />
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="text-center space-y-1 relative z-10 w-full px-2">
                <div className={`
                    inline-block px-3 py-0.5 rounded-full text-[8px] md:text-xs font-black uppercase tracking-[0.2em] mb-1
                    ${primary ? 'bg-white/10 text-white border border-white/10' : 'bg-taguig-gold/10 text-taguig-gold border border-taguig-gold/20'}
                `}>
                    {role}
                </div>
                <h4 className={`${compact ? 'text-sm md:text-xl' : 'text-base md:text-2xl'} font-extrabold text-white uppercase tracking-tight italic leading-tight group-hover:text-taguig-gold transition-colors duration-300`}>
                    {name}
                </h4>
                <p className={`text-[10px] md:text-sm font-bold tracking-[0.1em] uppercase transition-all duration-300 mt-2 ${primary ? 'text-white/80' : 'text-slate-300 group-hover:text-white'}`}>
                    {desc}
                </p>
            </div>

            {/* Hover Glow Background */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-2/3 h-1/2 bg-taguig-gold/20 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        </div>
    );
};

export default LandingPage;
