
import React, { useEffect, useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MoreHorizontal,
  Calendar,
  User,
  Phone,
  MapPin
} from 'lucide-react';
import { supabaseService } from '../services/supabaseService';
import { AssetRequest } from '../types';
import { useToast } from '../contexts/ToastContext';
import { Link } from 'react-router-dom';

const ResourceTracking: React.FC = () => {
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const data = await supabaseService.getAssetRequests();
      setRequests(data);
    } catch (error: any) {
      console.error(error);
      showToast("Failed to load asset requests", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => 
    r.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.purpose.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Approved': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Released': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'Returned': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center">
            <Package className="mr-3 text-blue-600" />
            Resource Tracking
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 font-medium">Manage and monitor community asset loans.</p>
        </div>
        <Link 
          to="/resources/new"
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>New Request</span>
        </Link>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by borrower or purpose..." 
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-800 dark:text-white transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRequests.map((req) => (
          <div key={req.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{req.borrower_name}</h3>
                  <div className="flex items-center text-xs text-slate-500 mt-1">
                    <Clock size={12} className="mr-1" />
                    Requested {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(req.status)}`}>
                {req.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pickup Date</p>
                <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Calendar size={14} className="mr-2 text-slate-400" />
                  {new Date(req.pickup_date).toLocaleDateString()}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Return Date</p>
                <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Calendar size={14} className="mr-2 text-slate-400" />
                  {new Date(req.return_date).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Items Requested</p>
              <div className="flex flex-wrap gap-2">
                {req.items_requested.map((item, idx) => (
                  <span key={idx} className="px-2 py-1 bg-white dark:bg-slate-700 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600">
                    {item.quantity}x {item.item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-4 text-xs text-slate-500">
                <div className="flex items-center">
                  <Phone size={14} className="mr-1" />
                  {req.contact_number}
                </div>
                <div className="flex items-center">
                  <MapPin size={14} className="mr-1" />
                  {req.address.length > 20 ? req.address.substring(0, 20) + '...' : req.address}
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="lg:col-span-2 py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <Package size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Requests Found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your search or create a new resource request.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceTracking;
