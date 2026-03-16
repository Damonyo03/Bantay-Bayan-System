
import React from 'react';
import { 
    Shield, 
    Bell, 
    Users, 
    ChevronRight, 
    Building2,
    Calendar,
    MessageSquare,
    Globe,
    FileText,
    TrendingUp,
    MapPin,
    Smartphone,
    Info,
    ArrowUpRight,
    Moon,
    Sun
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const LandingPage: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-taguig-blue/20 selection:text-taguig-blue transition-colors duration-500">
            {/* Top Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-6 py-4 flex items-center justify-between transition-colors duration-500">
                <div className="flex items-center space-x-3 group cursor-pointer">
                    <img src="/logo.png" alt="Bantay Bayan Logo" className="h-10 w-auto group-hover:rotate-12 transition-transform" />
                    <div className="hidden sm:block">
                        <h1 className="text-lg font-black text-taguig-blue dark:text-white uppercase italic leading-none">Bantay Bayan</h1>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mt-1">Post Proper Northside</p>
                    </div>
                </div>
                <div className="flex items-center space-x-8">
                    <div className="hidden md:flex items-center space-x-8 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                        <a href="#about" className="hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors">About</a>
                        <a href="#systems" className="hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors">Systems</a>
                        <a href="#notices" className="hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors">Notices</a>
                        <a href="#team" className="hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors">Our Team</a>
                    </div>
                    <Link 
                        to="/login" 
                        className="px-8 py-3 bg-taguig-blue text-white font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-taguig-navy hover:scale-105 active:scale-95 transition-all shadow-xl shadow-taguig-blue/20"
                    >
                        Login
                    </Link>
                </div>
            </nav>

            {/* Hero & About Section */}
            <section id="about" className="pt-40 pb-24 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-10 animate-fade-in text-center lg:text-left flex flex-col items-center lg:items-start">
                        <div className="inline-flex items-center px-4 py-2 bg-taguig-blue/5 dark:bg-white/5 border border-taguig-blue/10 dark:border-white/10 rounded-full text-taguig-blue dark:text-taguig-gold text-[10px] font-black uppercase tracking-widest">
                            <Shield size={14} className="mr-2" />
                            Official Community Portal
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic leading-[1] max-w-xl">
                            Elite Security <br />
                            <span className="text-taguig-blue dark:text-taguig-gold">Defined</span>
                        </h2>
                        <div className="space-y-6 text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-lg">
                            <p>
                                The Bantay Bayan of Post Proper Northside represents the pinnacle of community protection. 
                                We merge discipline with advanced technology to safeguard Bonifacio Global City's premier district.
                            </p>
                            <p>
                                Every resident and visitor is protected by our proactive surveillance network and rapid 
                                tactical response units, operating 24/7 with unwavering commitment.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 shadow-premium flex items-center space-x-4 hover:border-taguig-blue/30 transition-colors">
                                <div className="p-3 bg-taguig-blue/5 dark:bg-taguig-gold/5 rounded-2xl text-taguig-blue dark:text-taguig-gold">
                                    <MapPin size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">HQ Access</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">BGC Northside Tower</p>
                                </div>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5 shadow-premium flex items-center space-x-4 hover:border-taguig-blue/30 transition-colors">
                                <div className="p-3 bg-taguig-blue/5 dark:bg-taguig-gold/5 rounded-2xl text-taguig-blue dark:text-taguig-gold">
                                    <Smartphone size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Hotline</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">02-888-BANTAY</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="relative animate-fade-in delay-200">
                        <div className="absolute inset-0 bg-taguig-blue/10 dark:bg-taguig-gold/10 blur-[120px] rounded-full"></div>
                        <div className="relative bg-white/50 dark:bg-slate-900/50 backdrop-blur-3xl p-10 rounded-[4rem] border border-white dark:border-white/5 shadow-premium">
                            <div className="grid grid-cols-2 gap-10">
                                <StatsBox value="24/7" label="Tactical Response" />
                                <StatsBox value="150+" label="Elite Force" />
                                <StatsBox value="500+" label="Patrol Cycles" />
                                <StatsBox value="100%" label="Area Coverage" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Connected Systems Directory */}
            <section id="systems" className="py-24 bg-slate-100/50 dark:bg-slate-900/50 px-6 backdrop-blur-sm transition-colors duration-500">
                <div className="max-w-7xl mx-auto space-y-4 mb-20 flex flex-col items-center text-center">
                    <div className="p-2 bg-taguig-blue/10 dark:bg-taguig-gold/10 rounded-xl text-taguig-blue dark:text-taguig-gold mb-2">
                        <Globe size={20} />
                    </div>
                    <h3 className="text-xs font-black text-taguig-blue dark:text-taguig-gold uppercase tracking-[0.3em]">Command Infrastructure</h3>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Unified Digital Network</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl">State-of-the-art tools enabling precision and speed across our entire jurisdiction.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    <SystemCard 
                        icon={TrendingUp} 
                        title="Command Center" 
                        desc="Real-time strategic oversight and personnel dispatch coordination." 
                        url="/dashboard"
                    />
                    <SystemCard 
                        icon={FileText} 
                        title="Incident Matrix" 
                        desc="Secure digitized documentation and community blotter management." 
                        url="/report"
                    />
                    <SystemCard 
                        icon={Smartphone} 
                        title="Tactical App" 
                        desc="Advanced mobile interface for field personnel and rapid-response units." 
                        url="/mobile-app"
                    />
                    <SystemCard 
                        icon={Shield} 
                        title="Verification Hub" 
                        desc="Identity and background access for secure area operations." 
                        url="/audit-logs"
                    />
                    <SystemCard 
                        icon={MessageSquare} 
                        title="Resident Pulse" 
                        desc="Direct feedback and alert portal for every community member." 
                        url="/resident-portal"
                    />
                    <SystemCard 
                        icon={Building2} 
                        title="Logisti-Track" 
                        desc="End-to-end management for fleet and official security equipment." 
                        url="/resources"
                    />
                </div>
            </section>

            {/* Notices & Announcements */}
            <section id="notices" className="py-24 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center md:items-end justify-between mb-16 gap-8 text-center md:text-left">
                    <div className="space-y-4 flex flex-col items-center md:items-start">
                        <h3 className="text-xs font-black text-taguig-blue dark:text-taguig-gold uppercase tracking-[0.3em]">Strategic Briefings</h3>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Operations & Advisories</h2>
                    </div>
                    <button className="flex items-center space-x-3 px-6 py-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest text-[10px] hover:bg-taguig-blue hover:text-white transition-all">
                        <span>Archive Access</span>
                        <ArrowUpRight size={16} />
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                    <NoticeItem 
                        date="MAR 16, 2026" 
                        type="ADVISORY" 
                        title="Strategic Deployment: Night Patrol Enhancement"
                        desc="Increased mobile units deployed in the BGC Northside corridor to ensure total safety during late-shift rotations."
                    />
                    <NoticeItem 
                        date="MAR 12, 2026" 
                        type="TECH-UP" 
                        title="Mobile Dispatch System Version 2.0"
                        desc="Implementation of low-latency field tracking for even faster incident response accuracy."
                    />
                    <NoticeItem 
                        date="MAR 08, 2026" 
                        type="COMMUNITY" 
                        title="Quarterly Security Readiness Briefing"
                        desc="A comprehensive seminar on community safety standards and proactive emergency reporting."
                    />
                </div>
            </section>

            {/* Organizational Chart */}
            <section id="team" className="py-24 bg-white dark:bg-slate-950 px-6 border-t border-slate-100 dark:border-white/5 transition-colors duration-500">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center space-y-4 mb-24 flex flex-col items-center">
                        <div className="p-3 bg-taguig-blue/5 dark:bg-taguig-gold/5 rounded-full text-taguig-blue dark:text-taguig-gold mb-2">
                            <Users size={24} />
                        </div>
                        <h3 className="text-xs font-black text-taguig-blue dark:text-taguig-gold uppercase tracking-[0.3em]">Chain of Command</h3>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Leadership Structure</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">The strategic minds guiding our mission to protect and serve.</p>
                    </div>

                    <div className="flex flex-col items-center space-y-16">
                        <OrgMember 
                            role="District Supervisor" 
                            name="Hon. Ricardo S. Delos Santos" 
                            desc="Executive Oversight & Strategic Governance"
                            isLeader
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-5xl relative">
                            <div className="hidden md:block absolute top-[-4rem] left-1/2 w-px h-16 bg-slate-200 dark:bg-white/10"></div>
                            <div className="hidden md:block absolute top-[-4rem] left-1/4 right-1/4 h-px bg-slate-200 dark:bg-white/10"></div>
                            
                            <OrgMember 
                                role="Chief of Operations" 
                                name="Col. Manuel V. Garcia" 
                                desc="Tactical Execution & Force Management"
                            />
                            <OrgMember 
                                role="Chief of Logistics" 
                                name="Capt. Sarah Jane Robles" 
                                desc="Asset Management & Systems Integration"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-6xl">
                            <OrgMember role="Patrol Lead" name="Sgt. Mateo Cruz" sm />
                            <OrgMember role="S-V Lead" name="Insp. Elena White" sm />
                            <OrgMember role="Intel Lead" name="Sgt. Robert Tan" sm />
                            <OrgMember role="Liaison" name="Ms. Ana Mendoza" sm />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 bg-slate-900 dark:bg-black text-white px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
                        <div className="flex items-center space-x-3">
                            <img src="/taguig_seal.png" alt="Taguig Seal" className="h-14 w-auto" />
                            <img src="/brgy_seal.png" alt="Barangay Seal" className="h-14 w-auto" />
                        </div>
                        <div className="md:border-l border-white/10 md:pl-8 space-y-1">
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-taguig-gold">City of Taguig</h3>
                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Post Proper Northside Government</p>
                            <p className="text-[9px] font-medium text-white/30 italic">Bonifacio Global City District, MM</p>
                        </div>
                    </div>
                    <div className="space-y-4 md:text-right">
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">BMS Command Interface © 2026</p>
                        <div className="flex flex-wrap justify-center md:justify-end gap-6 text-[9px] font-black text-white/20 uppercase tracking-widest">
                            <a href="#" className="hover:text-taguig-gold transition-colors">Safety Code</a>
                            <a href="#" className="hover:text-taguig-gold transition-colors">Privacy</a>
                            <a href="#" className="hover:text-taguig-gold transition-colors">Sitemap</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Floating Theme Toggle */}
            <button 
                onClick={toggleTheme}
                className="fixed bottom-8 right-8 z-[60] p-5 bg-white dark:bg-slate-800 text-taguig-blue dark:text-taguig-gold rounded-full shadow-premium hover:scale-110 active:scale-95 transition-all group border border-slate-100 dark:border-white/10"
                aria-label="Toggle Theme"
            >
                {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
                <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap">
                    Switch to {theme === 'dark' ? 'Day' : 'Night'} Mode
                </span>
            </button>
        </div>
    );
};

const StatsBox: React.FC<{ value: string, label: string }> = ({ value, label }) => (
    <div className="space-y-3 text-center">
        <h4 className="text-4xl md:text-5xl font-black text-taguig-blue dark:text-taguig-gold tabular-nums leading-none">{value}</h4>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-tight">{label}</p>
    </div>
);

const SystemCard: React.FC<{ icon: any, title: string, desc: string, url: string }> = ({ icon: Icon, title, desc, url }) => (
    <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-premium hover:shadow-2xl hover:-translate-y-2 transition-all group flex flex-col items-center text-center">
        <div className="mb-8 p-5 bg-taguig-blue/5 dark:bg-taguig-gold/5 text-taguig-blue dark:text-taguig-gold rounded-[2rem] group-hover:bg-taguig-blue group-hover:text-white transition-all transform group-hover:rotate-6">
            <Icon size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic mb-4">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">{desc}</p>
        <Link to={url} className="mt-auto px-6 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-taguig-blue dark:hover:text-taguig-gold transition-all uppercase tracking-widest flex items-center space-x-2">
            <span>Terminal Access</span>
            <ChevronRight size={14} />
        </Link>
    </div>
);

const NoticeItem: React.FC<{ date: string, type: string, title: string, desc: string }> = ({ date, type, title, desc }) => (
    <div className="bg-white dark:bg-slate-900/30 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-premium transition-all flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-left">
        <div className="md:w-36 flex-shrink-0 flex flex-col items-center md:items-start">
            <p className="text-[11px] font-black text-taguig-blue dark:text-taguig-gold mb-2 tabular-nums">{date}</p>
            <span className="px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{type}</span>
        </div>
        <div className="flex-1 space-y-3">
            <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic leading-tight">{title}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{desc}</p>
        </div>
        <button className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-taguig-blue transition-colors flex-shrink-0">
            <Info size={24} />
        </button>
    </div>
);

const OrgMember: React.FC<{ role: string, name: string, desc?: string, isLeader?: boolean, sm?: boolean }> = ({ role, name, desc, isLeader, sm }) => (
    <div className={`
        ${isLeader ? 'bg-taguig-blue text-white shadow-2xl shadow-taguig-blue/30 scale-110' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-premium border border-slate-100 dark:border-white/5'}
        ${sm ? 'p-6 rounded-2xl' : 'p-10 rounded-[3rem] w-full max-w-xl'}
        text-center space-y-3 transition-all hover:scale-[1.02] flex flex-col items-center
    `}>
        <div className={`p-2 rounded-lg mb-1 inline-block ${isLeader ? 'bg-white/10 text-taguig-gold' : 'bg-taguig-blue/5 text-taguig-blue dark:text-taguig-gold'}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">{role}</p>
        </div>
        <h4 className={`${sm ? 'text-base' : 'text-2xl'} font-black uppercase tracking-tight italic leading-none`}>{name}</h4>
        {desc && <p className={`text-xs font-medium max-w-xs ${isLeader ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>{desc}</p>}
    </div>

);

export default LandingPage;

