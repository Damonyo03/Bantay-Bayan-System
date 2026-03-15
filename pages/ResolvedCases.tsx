
import React, { useEffect, useState } from 'react';
import { incidentService } from '../services/incidentService';
import { resourceService } from '../services/resourceService';
import { IncidentWithDetails, CCTVRequest } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Archive, MapPin, Clock, Printer, RotateCcw, FileCheck, Video, Search, Filter, FolderOpen, Calendar, User, Eye, ArrowUpDown, ChevronDown, ChevronUp, Users, Phone, MessageSquare } from 'lucide-react';
import { generateOfficialReport, reprintCCTVForm } from '../utils/pdfGenerator';
import { supabase } from '../lib/supabaseClient';
import PageHeader from '../components/PageHeader';

type TabType = 'incidents' | 'cctv';
type SortOption = 'date_desc' | 'date_asc' | 'case_asc' | 'case_desc';

const ResolvedCases: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<TabType>('incidents');
    const [archives, setArchives] = useState<IncidentWithDetails[]>([]);
    const [cctvRequests, setCctvRequests] = useState<CCTVRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Sorting and Filtering
    const [filterType, setFilterType] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortOption, setSortOption] = useState<SortOption>('date_desc');

    const fetchArchives = async () => {
        setIsLoading(true);
        try {
            const [incidentData, cctvData] = await Promise.all([
                incidentService.getIncidentsByStatus(['Resolved', 'Closed']),
                resourceService.getCCTVRequests()
            ]);
            setArchives(incidentData);
            setCctvRequests(cctvData);
        } catch (error) {
            console.error("Failed to fetch archives", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchArchives();

        const channel = supabase
            .channel('archives_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => fetchArchives())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cctv_requests' }, () => fetchArchives())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleReopen = async (incident: IncidentWithDetails) => {
        if (!confirm(`Are you sure you want to reopen Case #${incident.case_number}? It will be moved back to the Active Dashboard.`)) return;

        try {
            await incidentService.updateIncident(incident.id, { status: 'Pending' });
            showToast("Case reopened and moved to Active Dashboard", "success");
            fetchArchives();
        } catch (err: any) {
            console.error(err);
            showToast("Failed to reopen case", "error");
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    // --- FILTER & SORT LOGIC ---
    const getFilteredData = () => {
        let data: (IncidentWithDetails | CCTVRequest)[] = [];

        // 1. Filter
        if (activeTab === 'incidents') {
            data = archives.filter((item: IncidentWithDetails) => {
                const matchesType = filterType === 'All' || item.type === filterType;
                const matchesSearch = item.narrative.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.location.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesType && matchesSearch;
            });
        } else {
            data = cctvRequests.filter((item: CCTVRequest) => {
                const matchesType = filterType === 'All' || item.incident_type.includes(filterType);
                const matchesSearch = item.requester_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.request_number.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesType && matchesSearch;
            });
        }

        // 2. Sort
        return data.sort((a, b) => {
            if (sortOption === 'date_desc') {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            if (sortOption === 'date_asc') {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }

            const numA = activeTab === 'incidents' ? (a as IncidentWithDetails).case_number : (a as CCTVRequest).request_number;
            const numB = activeTab === 'incidents' ? (b as IncidentWithDetails).case_number : (b as CCTVRequest).request_number;

            if (sortOption === 'case_asc') {
                return numA.localeCompare(numB);
            }
            if (sortOption === 'case_desc') {
                return numB.localeCompare(numA);
            }
            return 0;
        });
    };

    const getIncidentOptions = () => ['Medical', 'Fire', 'Theft', 'Disturbance', 'Traffic', 'Other'];

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            <PageHeader
                title="Finished Cases"
                subtitle="Old reports and case history storage."
                icon={FolderOpen}
            >
                {/* TABS */}
                <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-xl flex space-x-1 w-full md:w-auto">
                    <button
                        onClick={() => { setActiveTab('incidents'); setFilterType('All'); }}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${activeTab === 'incidents'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        <Archive size={16} className="mr-2" />
                        Incidents
                    </button>
                    <button
                        onClick={() => { setActiveTab('cctv'); setFilterType('All'); }}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${activeTab === 'cctv'
                            ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        <Video size={16} className="mr-2" />
                        CCTV
                    </button>
                </div>
            </PageHeader>

            {/* FILTER & SORT BAR */}
            <div className="glass-panel p-4 rounded-2xl border border-white/60 dark:border-white/10 flex flex-col lg:flex-row gap-4 items-center">
                {/* Search */}
                <div className="relative flex-1 w-full">
                    <label htmlFor="searchQuery" className="sr-only">Search case #, names, or details</label>
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                        id="searchQuery"
                        type="text"
                        placeholder="Search case #, names, or details..."
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    {/* Filter */}
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                        <Filter size={18} className="text-gray-400" />
                        <label htmlFor="filterType" className="text-sm font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Filter:</label>
                        <select
                            id="filterType"
                            value={filterType}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value)}
                            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none text-sm font-bold text-slate-900 dark:text-white w-full sm:w-48 transition-colors cursor-pointer"
                        >
                            <option value="All" className="dark:bg-slate-800">All Types</option>
                            {getIncidentOptions().map(opt => <option key={opt} value={opt} className="dark:bg-slate-800">{opt}</option>)}
                        </select>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                        <ArrowUpDown size={18} className="text-gray-400" />
                        <label htmlFor="sortOption" className="text-sm font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">Sort:</label>
                        <select
                            id="sortOption"
                            value={sortOption}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortOption(e.target.value as SortOption)}
                            className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 px-4 outline-none text-sm font-bold text-slate-900 dark:text-white w-full sm:w-48 transition-colors cursor-pointer"
                        >
                            <option value="date_desc" className="dark:bg-slate-800">Date (Newest)</option>
                            <option value="date_asc" className="dark:bg-slate-800">Date (Oldest)</option>
                            <option value="case_asc" className="dark:bg-slate-800">{activeTab === 'incidents' ? 'Case #' : 'Request #'} (Asc)</option>
                            <option value="case_desc" className="dark:bg-slate-800">{activeTab === 'incidents' ? 'Case #' : 'Request #'} (Desc)</option>
                        </select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 dark:border-white"></div>
                </div>
            ) : (
                <div className="space-y-6">
                    {getFilteredData().length === 0 && (
                        <div className="glass-panel p-16 text-center rounded-3xl border-dashed border-gray-300 dark:border-slate-700 text-slate-400">
                            <FileCheck size={48} className="mx-auto mb-4 opacity-30" />
                            <p>No records found matching your criteria.</p>
                        </div>
                    )}

                    {/* INCIDENTS LIST */}
                    {activeTab === 'incidents' && (getFilteredData() as IncidentWithDetails[]).map((incident) => (
                        <div key={incident.id} className="glass-panel p-6 rounded-3xl border border-white/60 dark:border-white/10 hover:shadow-lg transition-all relative overflow-hidden group">
                            <div className={`absolute left-0 top-0 bottom-0 w-2 ${incident.status === 'Resolved' ? 'bg-green-500' : 'bg-gray-500'}`} />

                            <div className="pl-4 flex flex-col lg:flex-row justify-between lg:items-start gap-6">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center space-x-3 mb-2 flex-wrap">
                                        <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{incident.case_number}</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${incident.status === 'Resolved'
                                            ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                                            : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                                            }`}>
                                            {incident.status}
                                        </span>
                                        {incident.is_restricted_entry && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                                                Restricted
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{incident.type}</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-2xl">{incident.narrative}</p>

                                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 font-bold pt-2 space-x-4 flex-wrap">
                                        <span className="flex items-center"><MapPin size={14} className="mr-1" />{incident.location}</span>
                                        <span className="flex items-center"><Clock size={14} className="mr-1" />{new Date(incident.created_at).toLocaleDateString()}</span>
                                        <span className="flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-md">Officer: {incident.officer_name}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                                    <button
                                        onClick={async () => await generateOfficialReport(incident)}
                                        className="flex-1 lg:w-40 flex items-center justify-center space-x-2 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                                    >
                                        <Printer size={16} />
                                        <span>Print Report</span>
                                    </button>

                                    <button
                                        onClick={() => toggleExpand(incident.id)}
                                        className={`flex-1 lg:w-40 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-colors border ${expandedId === incident.id
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-white border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                                            }`}
                                    >
                                        {expandedId === incident.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        <span>{expandedId === incident.id ? 'Hide Details' : 'View Details'}</span>
                                    </button>

                                    {user?.role === 'supervisor' && (
                                        <button
                                            onClick={() => handleReopen(incident)}
                                            className="flex-1 lg:w-40 flex items-center justify-center space-x-2 py-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-xl text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                                        >
                                            <RotateCcw size={16} />
                                            <span>{t.reopenCase}</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* EXPANDED DETAILS SECTION */}
                            {expandedId === incident.id && (
                                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 animate-slide-down">
                                    <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                                        <Users size={16} className="mr-2" />
                                        Involved Parties
                                    </h4>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {incident.parties && incident.parties.length > 0 ? (
                                            incident.parties.map((party) => (
                                                <div key={party.id} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white">{party.name}</p>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">{party.role} • {party.age} yo</p>
                                                        </div>
                                                        {party.contact_info && (
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center bg-white dark:bg-slate-800 px-2 py-1 rounded">
                                                                <Phone size={12} className="mr-1" />
                                                                {party.contact_info}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {party.statement && (
                                                        <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 italic flex items-start">
                                                            <MessageSquare size={14} className="mr-2 mt-1 flex-shrink-0 opacity-50" />
                                                            <p>"{party.statement}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-400 italic">No specific parties recorded.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* CCTV LOGS LIST */}
                    {activeTab === 'cctv' && (getFilteredData() as CCTVRequest[]).map((req) => (
                        <div key={req.id} className="glass-panel p-6 rounded-3xl border border-white/60 dark:border-white/10 hover:shadow-lg transition-all relative group">
                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-red-500" />

                            <div className="pl-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2 flex-wrap">
                                        <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">{req.request_number}</span>
                                        <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">CCTV Request</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <User size={18} className="text-slate-400" />
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{req.requester_name}</h3>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 italic line-clamp-1">"{req.purpose}"</p>

                                    <div className="flex flex-wrap gap-4 mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                                            <Eye size={12} className="mr-1" /> Type: {req.incident_type}
                                        </span>
                                        <span className="flex items-center bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                                            <Calendar size={12} className="mr-1" /> {req.incident_date} {req.incident_time}
                                        </span>
                                        <span className="flex items-center bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">
                                            <MapPin size={12} className="mr-1" /> {req.location}
                                        </span>
                                    </div>
                                </div>

                                <div className="shrink-0 flex flex-col gap-3 items-end w-full md:w-auto mt-4 md:mt-0">
                                    <div className="text-right hidden md:block">
                                        <span className="text-xs text-gray-400 font-mono block mb-1">Filed On</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(req.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row w-full gap-2">
                                        <button
                                            onClick={() => toggleExpand(req.id)}
                                            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-white dark:bg-slate-700 border rounded-xl text-xs font-bold transition-colors shadow-sm ${expandedId === req.id
                                                ? 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-200 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600'
                                                }`}
                                        >
                                            {expandedId === req.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            <span>{expandedId === req.id ? 'Hide Details' : 'View Details'}</span>
                                        </button>
                                        <button
                                            onClick={async () => await reprintCCTVForm(req)}
                                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            <Printer size={16} />
                                            <span>Print Form</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* EXPANDED CCTV DETAILS SECTION */}
                            {expandedId === req.id && (
                                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700 animate-slide-down">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Information</p>
                                                <div className="flex items-center text-sm font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                    <Phone size={14} className="mr-2 text-slate-400" />
                                                    {req.contact_info || <span className="text-slate-400 italic">Not provided</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Exact Incident Time</p>
                                                <div className="flex items-center text-sm font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                    <Clock size={14} className="mr-2 text-slate-400" />
                                                    {req.incident_time}
                                                </div>
                                            </div>
                                            <div className="md:hidden">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filed On</p>
                                                <div className="flex items-center text-sm font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                    <Calendar size={14} className="mr-2 text-slate-400" />
                                                    {new Date(req.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Purpose of Request</p>
                                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 h-full">
                                                {req.purpose ? (
                                                    <p className="leading-relaxed whitespace-pre-wrap">"{req.purpose}"</p>
                                                ) : (
                                                    <span className="text-slate-400 italic">No purpose statement provided.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResolvedCases;
