
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
    ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-taguig-blue/20 selection:text-taguig-blue">
            {/* Top Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <img src="/logo.png" alt="Bantay Bayan Logo" className="h-10 w-auto" />
                    <div className="hidden sm:block">
                        <h1 className="text-lg font-black text-taguig-blue dark:text-white uppercase italic leading-none">Bantay Bayan</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Post Proper Northside</p>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="hidden md:flex items-center space-x-6 text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        <a href="#about" className="hover:text-taguig-blue transition-colors">About</a>
                        <a href="#systems" className="hover:text-taguig-blue transition-colors">Systems</a>
                        <a href="#notices" className="hover:text-taguig-blue transition-colors">Notices</a>
                        <a href="#team" className="hover:text-taguig-blue transition-colors">Our Team</a>
                    </div>
                    <Link 
                        to="/login" 
                        className="px-6 py-2.5 bg-taguig-blue text-white font-black uppercase tracking-widest text-xs rounded-full hover:bg-taguig-navy hover:scale-105 active:scale-95 transition-all shadow-lg shadow-taguig-blue/20"
                    >
                        Login
                    </Link>
                </div>
            </nav>

            {/* Hero & About Section */}
            <section id="about" className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8 animate-fade-in">
                        <div className="inline-flex items-center px-4 py-2 bg-taguig-blue/10 dark:bg-white/10 border border-taguig-blue/20 dark:border-white/20 rounded-full text-taguig-blue dark:text-taguig-gold text-xs font-black uppercase tracking-widest">
                            <Shield size={14} className="mr-2" />
                            Official Community Portal
                        </div>
                        <h2 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic leading-[1.1]">
                            Protecting <br />
                            <span className="text-taguig-blue dark:text-taguig-gold">Our Community</span>
                        </h2>
                        <div className="space-y-6 text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            <p>
                                The Bantay Bayan of Post Proper Northside is the community's primary civil security force. 
                                We are dedicated to maintaining peace, order, and safety within our jurisdiction, 
                                working hand-in-hand with local law enforcement and the Barangay Council.
                            </p>
                            <p>
                                Our organization leverages modern management systems to streamline incident reporting, 
                                resource tracking, and surveillance coordination, ensuring that every resident 
                                of Bonifacio Global City District feels secure.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/10 shadow-premium flex items-center space-x-4">
                                <MapPin className="text-taguig-blue dark:text-taguig-gold" size={24} />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Headquarters</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">BGC Northside Tower</p>
                                </div>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/10 shadow-premium flex items-center space-x-4">
                                <Smartphone className="text-taguig-blue dark:text-taguig-gold" size={24} />
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emergency Hotline</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">02-888-BANTAY</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="relative animate-fade-in delay-200">
                        <div className="absolute inset-0 bg-taguig-blue/5 dark:bg-taguig-gold/5 blur-[100px] rounded-full"></div>
                        <div className="relative bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-white/10 shadow-premium">
                            <div className="grid grid-cols-2 gap-6">
                                <StatsBox value="24/7" label="Active Response" />
                                <StatsBox value="150+" label="Elite Personnel" />
                                <StatsBox value="500+" label="Patrol Hours/Week" />
                                <StatsBox value="100%" label="Commitment" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Connected Systems Directory */}
            <section id="systems" className="py-24 bg-slate-100 dark:bg-slate-900 px-6">
                <div className="max-w-7xl mx-auto text-center space-y-4 mb-16">
                    <h3 className="text-sm font-black text-taguig-blue dark:text-taguig-gold uppercase tracking-[0.2em]">Service Network</h3>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Our Integrated Ecosystem</h2>
                    <p className="text-slate-500 font-medium max-w-2xl mx-auto">Explore the various technological services that empower our community's safety operations.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    <SystemCard 
                        icon={Globe} 
                        title="Command Center" 
                        desc="Centralized real-time monitoring and coordination for field personnel." 
                        url="/dashboard"
                    />
                    <SystemCard 
                        icon={FileText} 
                        title="Incident Logging" 
                        desc="Digitized reporting system for official community incident documentation." 
                        url="/report"
                    />
                    <SystemCard 
                        icon={Smartphone} 
                        title="Field Dispatch" 
                        desc="Advanced mobile interface for rapid tactical response teams." 
                        url="/mobile-app"
                    />
                    <SystemCard 
                        icon={TrendingUp} 
                        title="Audit Systems" 
                        desc="Transparency tracking for all official actions and resource usage." 
                        url="/audit-logs"
                    />
                    <SystemCard 
                        icon={MessageSquare} 
                        title="Resident Portal" 
                        desc="Direct communication channel between constituents and security forces." 
                        url="/resident-portal"
                    />
                    <SystemCard 
                        icon={Building2} 
                        title="Resource Hub" 
                        desc="Logistics management for official equipment and fleet operations." 
                        url="/resources"
                    />
                </div>
            </section>

            {/* Notices & Announcements */}
            <section id="notices" className="py-24 px-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-black text-taguig-blue dark:text-taguig-gold uppercase tracking-[0.2em]">Official Feed</h3>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Notices & Announcements</h2>
                    </div>
                    <button className="flex items-center space-x-2 text-taguig-blue font-black uppercase tracking-widest text-xs hover:underline decoration-2 underline-offset-4">
                        <span>Archive Feed</span>
                        <ArrowUpRight size={16} />
                    </button>
                </div>
                <div className="space-y-6">
                    <NoticeItem 
                        date="MAR 16, 2026" 
                        type="ADVISORY" 
                        title="Increased Night Patrols in BGC Northside District"
                        desc="In response to recent community requests, we are deploying additional mobile units from 10 PM to 4 AM starting this week."
                    />
                    <NoticeItem 
                        date="MAR 12, 2026" 
                        type="UPDATE" 
                        title="New Digital Reporting System Launch"
                        desc="Constituents can now report non-emergency incidents through our official mobile application for faster verification."
                    />
                    <NoticeItem 
                        date="MAR 08, 2026" 
                        type="EVENT" 
                        title="Community Safety Seminar at Barangay Hall"
                        desc="Join us this Saturday for a comprehensive briefing on basic self-defense and emergency preparedness."
                    />
                </div>
            </section>

            {/* Organizational Chart */}
            <section id="team" className="py-24 bg-white dark:bg-slate-900 px-6 border-t border-slate-100 dark:border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center space-y-4 mb-20">
                        <h3 className="text-sm font-black text-taguig-blue dark:text-taguig-gold uppercase tracking-[0.2em]">Our Leadership</h3>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Organizational Structure</h2>
                    </div>

                    <div className="flex flex-col items-center space-y-16">
                        {/* Top Tier */}
                        <OrgMember 
                            role="District Supervisor" 
                            name="Hon. Ricardo S. Delos Santos" 
                            desc="Strategic Oversight & Policy Direction"
                            isLeader
                        />

                        {/* Middle Tier */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl relative">
                            <div className="hidden md:block absolute top-[-3.5rem] left-1/2 w-0.5 h-16 bg-slate-200 dark:bg-white/10"></div>
                            <div className="hidden md:block absolute top-[-3.5rem] left-1/4 right-1/4 h-0.5 bg-slate-200 dark:bg-white/10"></div>
                            
                            <OrgMember 
                                role="Chief of Operations" 
                                name="Col. Manuel V. Garcia" 
                                desc="Tactical Deployment & Personnel Management"
                            />
                            <OrgMember 
                                role="Chief of Logistics" 
                                name="Capt. Sarah Jane Robles" 
                                desc="Resource Management & Tech Infrastructure"
                            />
                        </div>

                        {/* Bottom Tier */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
                            <OrgMember role="Patrol Lead" name="Sgt. Mateo Cruz" sm />
                            <OrgMember role="Surveillance Lead" name="Insp. Elena White" sm />
                            <OrgMember role="Intelligence Lead" name="Sgt. Robert Tan" sm />
                            <OrgMember role="Community Liaison" name="Ms. Ana Mendoza" sm />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-taguig-navy text-white px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center space-x-4">
                        <img src="/taguig_seal.png" alt="Taguig Seal" className="h-12 w-auto" />
                        <img src="/brgy_seal.png" alt="Barangay Seal" className="h-12 w-auto" />
                        <div className="border-l border-white/20 pl-4">
                            <p className="text-xs font-black uppercase tracking-widest text-taguig-gold">City of Taguig</p>
                            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Post Proper Northside District</p>
                        </div>
                    </div>
                    <div className="text-center md:text-right">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">Bantay Bayan Management System © 2026</p>
                        <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] mt-2">Official Property of the Barangay Government</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const StatsBox: React.FC<{ value: string, label: string }> = ({ value, label }) => (
    <div className="space-y-2">
        <h4 className="text-3xl font-black text-taguig-blue dark:text-taguig-gold tabular-nums">{value}</h4>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-tight">{label}</p>
    </div>
);

const SystemCard: React.FC<{ icon: any, title: string, desc: string, url: string }> = ({ icon: Icon, title, desc, url }) => (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 shadow-premium hover:shadow-2xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center">
        <div className="mb-6 p-4 bg-taguig-blue/5 dark:bg-white/5 text-taguig-blue dark:text-taguig-gold rounded-3xl group-hover:bg-taguig-blue group-hover:text-white transition-all transform group-hover:rotate-6">
            <Icon size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic mb-3">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-6">{desc}</p>
        <Link to={url} className="mt-auto inline-flex items-center space-x-2 text-xs font-black text-taguig-blue dark:text-taguig-gold uppercase tracking-widest group-hover:translate-x-1 transition-transform">
            <span>Access Portal</span>
            <ChevronRight size={14} />
        </Link>
    </div>
);

const NoticeItem: React.FC<{ date: string, type: string, title: string, desc: string }> = ({ date, type, title, desc }) => (
    <div className="bg-white dark:bg-slate-800/50 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-start">
        <div className="md:w-32 flex-shrink-0">
            <p className="text-xs font-black text-taguig-blue dark:text-taguig-gold mb-1">{date}</p>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{type}</span>
        </div>
        <div className="flex-1 space-y-2">
            <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{title}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{desc}</p>
        </div>
        <button className="p-3 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-taguig-blue transition-colors">
            <Info size={18} />
        </button>
    </div>
);

const OrgMember: React.FC<{ role: string, name: string, desc?: string, isLeader?: boolean, sm?: boolean }> = ({ role, name, desc, isLeader, sm }) => (
    <div className={`
        ${isLeader ? 'bg-taguig-blue text-white shadow-xl shadow-taguig-blue/20 scale-110' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-premium border border-slate-100 dark:border-white/10'}
        ${sm ? 'p-4 rounded-xl' : 'p-6 md:p-8 rounded-[2rem] w-full'}
        text-center space-y-2 transition-all hover:scale-[1.02]
    `}>
        <p className={`text-[10px] font-black uppercase tracking-widest ${isLeader ? 'text-taguig-gold' : 'text-taguig-blue dark:text-taguig-gold'}`}>{role}</p>
        <h4 className={`${sm ? 'text-sm' : 'text-xl'} font-black uppercase tracking-tight italic`}>{name}</h4>
        {desc && <p className={`text-xs font-medium ${isLeader ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>{desc}</p>}
    </div>
);

export default LandingPage;
