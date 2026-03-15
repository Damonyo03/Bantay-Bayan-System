
import React, { useEffect, useState } from 'react';
import { systemService } from '../services/systemService';
import { CalendarActivity, UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
    Shield, 
    Bell, 
    Activity, 
    Users, 
    Calendar, 
    ChevronRight, 
    ArrowRight,
    MapPin,
    Building2,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Eye,
    Truck,
    LayoutDashboard
} from 'lucide-react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
    const { user } = useAuth();
    const [recentActivities, setRecentActivities] = useState<CalendarActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const activities = await systemService.getActivities();
                setRecentActivities(activities.slice(0, 4));
            } catch (error) {
                console.error("Failed to fetch landing page data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="space-y-12 pb-20 animate-fade-in">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-taguig-blue via-taguig-navy to-slate-900 text-white shadow-premium">
                {/* Abstract Background Polygons */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-taguig-gold/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-taguig-blue/30 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 p-8 sm:p-12 md:p-16 flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="max-w-2xl space-y-6 text-center lg:text-left">
                        <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-taguig-gold text-xs font-black uppercase tracking-widest animate-slide-up">
                            <Shield size={14} className="mr-2" />
                            Official Control Center
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight italic leading-[1.1] animate-slide-up delay-75">
                            Bantay Bayan <br />
                            <span className="text-taguig-gold">Post Proper Northside</span>
                        </h1>
                        <p className="text-lg text-slate-300 font-medium leading-relaxed max-w-xl animate-slide-up delay-150">
                            Unified Security and Incident Response Management System. 
                            Empowering our community through modern surveillance, rapid dispatch, 
                            and seamless resource coordination.
                        </p>
                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4 animate-slide-up delay-200">
                            <Link to="/" className="px-8 py-4 bg-taguig-gold text-taguig-navy font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-xl shadow-taguig-gold/30 flex items-center group">
                                Open Dashboard
                                <ChevronRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link to="/guidelines" className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-white/20 transition-all flex items-center">
                                System Guidelines
                            </Link>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 w-full lg:max-w-md animate-fade-in delay-300">
                        <StatCard icon={Bell} value="24/7" label="Response" color="amber" />
                        <StatCard icon={Activity} value="Live" label="Monitoring" color="emerald" />
                        <StatCard icon={Users} value="Elite" label="Personnel" color="blue" />
                        <StatCard icon={Shield} value="Secure" label="Infrastructure" color="taguig-gold" />
                    </div>
                </div>
            </div>

            {/* Quick Actions / Featured Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FeatureBox 
                    icon={LayoutDashboard} 
                    title="Command Center" 
                    desc="Real-time incident monitoring and tactical overview."
                    link="/"
                    color="blue"
                />
                <FeatureBox 
                    icon={Eye} 
                    title="CCTV Network" 
                    desc="Surveillance request management and coordination."
                    link="/cctv-request"
                    color="purple"
                />
                <FeatureBox 
                    icon={Truck} 
                    title="Resource Tracking" 
                    desc="Official equipment and vehicle deployment logs."
                    link="/resources"
                    color="amber"
                />
                <FeatureBox 
                    icon={Activity} 
                    title="Incident Reports" 
                    desc="Digitized filing and archiving of community reports."
                    link="/archives"
                    color="emerald"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* About Barangay Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 sm:p-10 border border-slate-100 dark:border-white/10 shadow-premium relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center space-x-4 mb-8">
                                <div className="p-4 bg-taguig-blue/10 dark:bg-white/10 text-taguig-blue dark:text-taguig-gold rounded-2xl">
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-taguig-blue dark:text-white uppercase italic tracking-tight">Our Jurisdiction</h2>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Post Proper Northside, Taguig City</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-taguig-blue dark:text-taguig-gold uppercase tracking-widest">Our Vision</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
                                        To transform Post Proper Northside into a leading model of community safety and governance, 
                                        where every resident feels secure and protected through the integration of elite personnel 
                                        and state-of-the-art technology.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-taguig-blue dark:text-taguig-gold uppercase tracking-widest">Our Mission</h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
                                        We are committed to providing reliable 24/7 security response, maintain lawful order 
                                        in our streets, and facilitate transparent resource management for all our constituents 
                                        and visitors.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-10 pt-8 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-6">
                                <div className="flex items-center text-slate-500 dark:text-slate-400">
                                    <MapPin size={18} className="mr-2 text-taguig-blue dark:text-taguig-gold" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Bonifacio Global City District</span>
                                </div>
                                <div className="flex items-center text-slate-500 dark:text-slate-400">
                                    <Building2 size={18} className="mr-2 text-taguig-blue dark:text-taguig-gold" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Barangay Hall Official Annex</span>
                                </div>
                                <div className="flex items-center text-slate-500 dark:text-slate-400">
                                    <Shield size={18} className="mr-2 text-taguig-blue dark:text-taguig-gold" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Bantay Bayan Division</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activities Feed */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/10 shadow-premium">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-black text-taguig-blue dark:text-white uppercase italic">Operations</h2>
                            <Calendar size={20} className="text-slate-400" />
                        </div>

                        <div className="space-y-6">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="animate-pulse flex items-start space-x-4">
                                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-3/4"></div>
                                            <div className="h-2 bg-slate-50 dark:bg-slate-700/50 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                ))
                            ) : recentActivities.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No recent entries</p>
                                </div>
                            ) : (
                                recentActivities.map((activity) => (
                                    <div key={activity.id} className="flex items-start space-x-4 group cursor-default">
                                        <div className="p-3 bg-taguig-blue/5 dark:bg-white/5 text-taguig-blue dark:text-taguig-gold rounded-xl group-hover:bg-taguig-blue group-hover:text-white transition-all">
                                            <Clock size={16} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-taguig-blue transition-colors line-clamp-1">{activity.title}</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">
                                                {new Date(activity.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {activity.shift}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <Link to="/guidelines" className="mt-10 w-full inline-flex items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-taguig-blue transition-all group">
                            View All Operations
                            <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: any, value: string, label: string, color: string }> = ({ icon: Icon, value, label, color }) => {
    return (
        <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-3xl hover:bg-white/20 transition-all hover:scale-[1.02] cursor-default">
            <div className="flex items-center justify-between mb-3">
                <Icon size={20} className={`text-${color === 'taguig-gold' ? 'taguig-gold' : color + '-400'}`} />
                <div className={`w-2 h-2 rounded-full bg-${color === 'taguig-gold' ? 'taguig-gold' : color + '-400'} animate-pulse`}></div>
            </div>
            <div className="text-2xl font-black">{value}</div>
            <div className="text-[10px] uppercase font-black tracking-widest text-white/60">{label}</div>
        </div>
    );
};

const FeatureBox: React.FC<{ icon: any, title: string, desc: string, link: string, color: string }> = ({ icon: Icon, title, desc, link, color }) => {
    const colors: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
    };

    return (
        <Link to={link} className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-premium hover:shadow-2xl hover:-translate-y-1 transition-all group">
            <div className={`inline-flex items-center justify-center p-4 rounded-2xl mb-6 ${colors[color]} dark:bg-white/5 dark:text-white dark:border-white/10 group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight italic mb-2">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{desc}</p>
        </Link>
    );
};

export default LandingPage;
