
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
    Sun,
    Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const LandingPage: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-taguig-blue/20 selection:text-taguig-blue transition-colors duration-500">
            {/* Top Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-6 py-3 transition-colors duration-500">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center space-x-4 group cursor-pointer">
                        <div className="flex items-center -space-x-2">
                            <img src="/taguig_seal.png" alt="Taguig Seal" className="h-12 w-auto drop-shadow-md z-20 group-hover:scale-110 transition-transform" />
                            <img src="/brgy_seal.png" alt="Barangay Seal" className="h-10 w-auto drop-shadow-md z-10 opacity-80" />
                        </div>
                        <div className="hidden sm:block border-l border-slate-200 dark:border-white/10 pl-4">
                            <h1 className="text-xl font-black text-taguig-blue dark:text-white uppercase italic leading-none tracking-tight">Bantay Bayan</h1>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mt-1">Unified Security & Incident Response</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-8">
                        <div className="hidden lg:flex items-center space-x-8 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                            <a href="#about" className="hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors">About</a>
                            <a href="#hotlines" className="text-taguig-blue dark:text-taguig-gold">Hotlines</a>
                            <a href="#systems" className="hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors">Directory</a>
                            <a href="#notices" className="hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors">Bulletins</a>
                            <a href="#team" className="hover:text-taguig-blue dark:hover:text-taguig-gold transition-colors">Hierarchy</a>
                        </div>
                        <Link 
                            to="/login" 
                            className="px-8 py-3 bg-taguig-blue text-white font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-taguig-navy hover:scale-105 active:scale-95 transition-all shadow-xl shadow-taguig-blue/20 flex items-center"
                        >
                            <span>Staff Login</span>
                            <ArrowUpRight size={14} className="ml-2" />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section with Emergency Hotlines */}
            <section id="about" className="pt-32 pb-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                        {/* Left Content */}
                        <div className="lg:col-span-7 space-y-10 animate-fade-in">
                            <div className="inline-flex items-center px-4 py-2 bg-taguig-blue/5 dark:bg-taguig-gold/5 border border-taguig-blue/10 dark:border-taguig-gold/20 rounded-full text-taguig-blue dark:text-taguig-gold text-[10px] font-black uppercase tracking-[0.2em]">
                                <Shield size={14} className="mr-2" />
                                Official Public Information Portal
                            </div>
                            
                            <h2 className="text-5xl md:text-8xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-[0.9]">
                                Securing the <br />
                                <span className="text-taguig-blue dark:text-taguig-gold">Post Proper</span> <br />
                                Northside
                            </h2>

                            <div className="space-y-6 text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl">
                                <p>
                                    Welcome to the official Unified Security and Incident Response Management gateway for 
                                    Barangay Post Proper Northside. We are dedicated to maintaining peace, order, and 
                                    safety for all residents and visitors within the Bonifacio Global City district.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-4 pt-4">
                                <a href="#hotlines" className="px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl flex items-center">
                                    <Bell size={16} className="mr-3 text-taguig-gold" />
                                    Emergency Hotlines
                                </a>
                                <a href="#team" className="px-10 py-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xl flex items-center">
                                    <span>Leadership Chart</span>
                                </a>
                            </div>
                        </div>

                        {/* Right Content: Primary Contact Card */}
                        <div id="hotlines" className="lg:col-span-5 relative animate-fade-in delay-200">
                            <div className="absolute inset-0 bg-taguig-blue/10 dark:bg-taguig-gold/5 blur-[120px] rounded-full"></div>
                            <div className="relative bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl p-8 sm:p-10 rounded-[3rem] border border-white dark:border-white/10 shadow-premium">
                                <div className="space-y-8">
                                    <div className="flex items-center space-x-4 mb-6">
                                        <div className="p-4 bg-red-500 rounded-2xl text-white shadow-lg shadow-red-500/30 animate-pulse">
                                            <Smartphone size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Emergency Center</h3>
                                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">24/7 Rapid Response</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <ContactCard 
                                            icon={Mail}
                                            label="Official Email"
                                            value="barangaypostpropernorthside@gmail.com"
                                        />
                                        <ContactCard 
                                            icon={FileText}
                                            label="Tel./Fax Numbers"
                                            value="8710-6711 / 8788-1764"
                                        />
                                        
                                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Dispatcher Unit Hotlines</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <HotlineButton label="Bantay Bayan 1" number="0917-810-6711" />
                                                <HotlineButton label="Bantay Bayan 2" number="0917-811-6711" />
                                                <HotlineButton label="Rescue Unit" number="0917-812-6711" />
                                                <HotlineButton label="Office Admin" number="0917-813-6711" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* Connected Systems Directory */}
            <section id="systems" className="py-24 bg-slate-50/50 dark:bg-slate-900/50 px-6 backdrop-blur-sm transition-colors duration-500 border-t border-slate-100 dark:border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 space-y-4 animate-fade-in">
                        <div className="inline-flex items-center px-4 py-1.5 bg-blue-500/10 dark:bg-taguig-gold/10 rounded-full text-blue-600 dark:text-taguig-gold text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                            <Globe size={14} className="mr-2" />
                            Village Network Directory
                        </div>
                        <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Connected Systems</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                            Bantay Bayan integrates with various public and local services to provide a seamless coordination network for the Post Proper Northside community.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <SystemCard 
                            icon={Building2} 
                            title="BGC Command" 
                            desc="Real-time emergency monitoring and tactical coordination hub for the whole district."
                            url="/login"
                        />
                        <SystemCard 
                            icon={Globe} 
                            title="City Hall Online" 
                            desc="Official e-services portal for permits, licenses, and local government certification."
                            url="/login"
                        />
                        <SystemCard 
                            icon={Users} 
                            title="Resident Portal" 
                            desc="Digital gateway for public assistance, community programs, and official requests."
                            url="/login"
                        />
                        <SystemCard 
                            icon={Shield} 
                            title="Health Hub" 
                            desc="Emergency medical data access and barangay health center appointment system."
                            url="/login"
                        />
                    </div>
                </div>
            </section>

            {/* Notices & Announcements */}
            <section id="notices" className="py-24 px-6 border-y border-slate-200 dark:border-white/10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-10 animate-fade-in">
                        <div className="space-y-4">
                            <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Public Bulletins</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl leading-relaxed">Official updates and operational notices from the Office of the Bantay Bayan and Barangay Leadership.</p>
                        </div>
                        <Link to="/login" className="px-8 py-4 bg-slate-900 dark:bg-taguig-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-taguig-navy transition-all flex items-center w-fit shadow-xl group">
                            <span>Access Archives</span>
                            <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <NoticeItem 
                            date="March 16, 2026"
                            type="Operational"
                            title="Strategic Deployment: Night Patrol Enhancement"
                            desc="Our tactical response units have implemented a high-visibility rotation tonight to ensure community-wide safety."
                        />
                        <NoticeItem 
                            date="March 12, 2026"
                            type="Advisory"
                            title="CCTV Infrastructure Upgrades"
                            desc="Phase 4 of our smart-surveillance expansion is now complete. Expect improved coverage in North residential corridors."
                        />
                        <NoticeItem 
                            date="March 08, 2026"
                            type="Community"
                            title="Security Readiness Briefing"
                            desc="Join the upcoming quarterly seminar on neighborhood safety protocols and disaster response procedures."
                        />
                    </div>
                </div>
            </section>

            {/* Organizational Chart */}
            <section id="team" className="py-24 bg-white dark:bg-slate-950 px-6 border-t border-slate-100 dark:border-white/5 transition-colors duration-500">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center space-y-4 mb-24 flex flex-col items-center animate-fade-in">
                        <div className="p-3 bg-taguig-blue/5 dark:bg-taguig-gold/5 rounded-full text-taguig-blue dark:text-taguig-gold mb-2">
                            <Users size={24} />
                        </div>
                        <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic whitespace-nowrap leading-none">Leadership Matrix</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">The strategic command structure guiding the safety and welfare of Barangay Post Proper Northside.</p>
                    </div>

                    <div className="flex flex-col items-center space-y-20">
                        {/* Tier 1: Punong Barangay */}
                        <OrgMember 
                            role="Punong Barangay" 
                            name="HON. RICHARD C. PASADILLA" 
                            desc="Executive Command & Administrative Governance"
                            isLeader
                        />

                        {/* Tier 2: Secretary & Treasurer */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl relative">
                            {/* Connector line for large screens */}
                            <div className="hidden md:block absolute -top-10 left-1/2 w-px h-10 bg-slate-200 dark:bg-white/10" />
                            
                            <OrgMember 
                                role="Barangay Secretary" 
                                name="HON. [SECRETARY NAME]" 
                                desc="Administrative Oversight & Records Management"
                            />
                            <OrgMember 
                                role="Barangay Treasurer" 
                                name="HON. [TREASURER NAME]" 
                                desc="Fiscal Management & Resource Allocation"
                            />
                        </div>

                        {/* Tier 3: Kagawads (The Council) */}
                        <div className="w-full relative pt-10">
                            <div className="hidden md:block absolute top-0 left-1/2 w-px h-10 bg-slate-200 dark:bg-white/10" />
                            <div className="text-center mb-10">
                                <span className="px-4 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">Barangay Council</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mx-auto">
                                <OrgMember role="Kagawad" name="HON. [NAME 1]" desc="Chairperson: Peace & Order" sm />
                                <OrgMember role="Kagawad" name="HON. [NAME 2]" desc="Chairperson: Infrastructure" sm />
                                <OrgMember role="Kagawad" name="HON. [NAME 3]" desc="Chairperson: Health & Safety" sm />
                                <OrgMember role="Kagawad" name="HON. [NAME 4]" desc="Chairperson: Education" sm />
                                <OrgMember role="Kagawad" name="HON. [NAME 5]" desc="Chairperson: Environment" sm />
                                <OrgMember role="Kagawad" name="HON. [NAME 6]" desc="Chairperson: Finance" sm />
                                <OrgMember role="Kagawad" name="HON. [NAME 7]" desc="Chairperson: Social Services" sm />
                                <OrgMember role="SK Chairman" name="HON. [SK NAME]" desc="Sangguniang Kabataan Oversight" sm />
                            </div>
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

const ContactCard: React.FC<{ icon: any, label: string, value: string }> = ({ icon: Icon, label, value }) => (
    <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 transition-all shadow-sm">
        <div className="flex items-center space-x-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-slate-400 group-hover:text-taguig-blue dark:group-hover:text-taguig-gold transition-colors">
                <Icon size={20} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate lg:max-w-xs">{value}</p>
            </div>
        </div>
    </div>
);

const HotlineButton: React.FC<{ label: string, number: string }> = ({ label, number }) => (
    <div className="flex flex-col p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-2xl transition-all shadow-sm">
        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{label}</span>
        <span className="text-xs font-black tracking-tight">{number}</span>
    </div>
);

export default LandingPage;


