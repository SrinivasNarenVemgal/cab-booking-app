import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, MapPin, Clock, IndianRupee, Filter } from 'lucide-react';

const STATUS_CLASS = { completed:'badge-green', cancelled:'badge-red', in_progress:'badge-amber', requested:'badge-blue' };

export default function RideHistory() {
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetch = async (p = 1, status = filter) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 8 };
      if (status !== 'all') params.status = status;
      const { data } = await api.get('/rides/history', { params });
      setRides(data.data);
      setPagination(data.pagination);
    } catch { toast.error('Failed to load rides'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(1, filter); }, [filter]);

  const downloadReceipt = async (rideId) => {
    try {
      const res = await api.get(`/rides/${rideId}/receipt`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = `receipt-${rideId.slice(0,8)}.pdf`;
      a.click(); window.URL.revokeObjectURL(url);
    } catch { toast.error('Receipt not available for this ride'); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ride History</h1>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400"/>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500">
            {['all','completed','cancelled','in_progress','requested'].map(s => <option key={s} value={s} className="capitalize">{s === 'all' ? 'All Rides' : s.replace('_',' ')}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : rides.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🚖</p>
          <p className="text-lg font-medium text-gray-400">No rides yet</p>
          <p className="text-sm">Your ride history will appear here</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rides.map(ride => (
            <div key={ride.id} className="card hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${STATUS_CLASS[ride.status] || 'badge-gray'} capitalize`}>{ride.status?.replace('_',' ')}</span>
                    <span className="text-xs text-gray-500">{new Date(ride.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                  </div>
                  <div className="flex flex-col gap-1 mb-3">
                    <div className="flex items-center gap-2 text-sm"><MapPin size={13} className="text-green-400 shrink-0"/><span className="truncate text-gray-300">{ride.pickup_address}</span></div>
                    <div className="flex items-center gap-2 text-sm"><MapPin size={13} className="text-red-400 shrink-0"/><span className="truncate text-gray-300">{ride.dropoff_address}</span></div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {ride.distance_km && <span className="flex items-center gap-1"><MapPin size={11}/>{ride.distance_km} km</span>}
                    {ride.duration_minutes && <span className="flex items-center gap-1"><Clock size={11}/>{ride.duration_minutes} min</span>}
                    {ride.driver_name && <span>Driver: {ride.driver_name}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-amber-400">₹{ride.final_fare || ride.estimated_fare}</p>
                  <p className="text-xs text-gray-500 capitalize mb-2">{ride.vehicle_type}</p>
                  {ride.status === 'completed' && (
                    <div className="flex flex-col gap-1 items-end">
                      <button onClick={() => downloadReceipt(ride.id)} className="flex items-center gap-1 text-xs text-amber-400 hover:underline">
                        <Download size={12}/>Receipt
                      </button>
                      {ride.payment_status !== 'completed' && ride.payment_method === 'card' && (
                        <button onClick={() => navigate(`/payment/${ride.id}`)} className="flex items-center gap-1 text-xs bg-amber-500 text-black px-2 py-1 rounded-lg font-semibold hover:bg-amber-400">
                          💳 Pay Now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button disabled={page === 1} onClick={() => { setPage(p => p-1); fetch(page-1); }} className="btn-secondary px-4 py-1.5 text-sm disabled:opacity-40">← Prev</button>
              <span className="flex items-center text-sm text-gray-400">Page {page} of {pagination.pages}</span>
              <button disabled={page === pagination.pages} onClick={() => { setPage(p => p+1); fetch(page+1); }} className="btn-secondary px-4 py-1.5 text-sm disabled:opacity-40">Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
