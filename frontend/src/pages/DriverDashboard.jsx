import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import RideMap from '../components/RideMap';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { ToggleLeft, ToggleRight, MapPin, Clock, IndianRupee, Star, TrendingUp, CheckCircle, X } from 'lucide-react';

export default function DriverDashboard() {
  const { user, driverInfo, refreshProfile } = useAuth();
  const { onEvent, offEvent, sendLocation } = useSocket();
  const [available, setAvailable] = useState(driverInfo?.is_available || false);
  const [pendingRides, setPendingRides] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [activeRide, setActiveRide] = useState(null);
  const [tab, setTab] = useState('requests');

  const fetchEarnings = useCallback(async () => {
    try { const { data } = await api.get('/drivers/earnings?period=week'); setEarnings(data.data); } catch {}
  }, []);

  const fetchPending = useCallback(async () => {
    try { const { data } = await api.get(`/drivers/pending-rides?t=${Date.now()}`); setPendingRides(data.data); } catch {}
  }, []);

  const fetchActiveRide = useCallback(async () => {
    try { const { data } = await api.get('/rides/active'); setActiveRide(data.data); } catch {}
  }, []);

  useEffect(() => { fetchEarnings(); fetchPending(); fetchActiveRide(); const interval = setInterval(fetchPending, 5000); return () => clearInterval(interval); }, []);

  // Listen for new ride requests via socket
  useEffect(() => {
    const onNewRide = (data) => {
      if (available) {
        toast(`New ride request! ₹${data.fare}`, { icon: '🚖' });
        fetchPending();
      }
    };
    onEvent('new:ride:request', onNewRide);
    return () => offEvent('new:ride:request', onNewRide);
  }, [available]);

  // Location broadcasting
  useEffect(() => {
    if (!available || !activeRide) return;
    const id = setInterval(() => {
      navigator.geolocation?.getCurrentPosition(pos => {
        sendLocation({ driverId: driverInfo?.id, lat: pos.coords.latitude, lng: pos.coords.longitude, rideId: activeRide?.id });
        api.patch('/drivers/location', { lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => {});
      });
    }, 5000);
    return () => clearInterval(id);
  }, [available, activeRide]);

  const toggleAvailability = async () => {
    try {
      await api.patch('/drivers/availability', { is_available: !available });
      setAvailable(v => !v);
      toast.success(!available ? '🟢 You are now online' : '🔴 You are now offline');
    } catch { toast.error('Failed to update availability'); }
  };

  const acceptRide = async (rideId) => {
    try {
      await api.post(`/rides/${rideId}/accept`);
      toast.success('Ride accepted!');
      fetchPending(); fetchActiveRide();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not accept'); }
  };

  const startRide = async () => {
    const otp = window.prompt('Enter OTP from rider:');
    if (!otp) return;
    try {
      await api.post(`/rides/${activeRide.id}/start`, { otp });
      toast.success('🚀 Ride started!');
      fetchActiveRide();
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid OTP'); }
  };

  const completeRide = async () => {
    if (!window.confirm('Mark ride as completed?')) return;
    try {
      await api.post(`/rides/${activeRide.id}/complete`);
      toast.success('✅ Ride completed!');
      setActiveRide(null); fetchEarnings(); fetchPending();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Driver Dashboard</h1>
          <p className="text-gray-400 text-sm">{driverInfo?.vehicle_model} · {driverInfo?.vehicle_plate}</p>
        </div>
        <button onClick={toggleAvailability} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all border ${available ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
          {available ? <><ToggleRight size={20}/>Online</> : <><ToggleLeft size={20}/>Offline</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'This Week', value: `₹${earnings?.summary?.totalEarnings?.toFixed(0) || 0}`, icon: <IndianRupee size={18}/>, color: 'text-amber-400' },
          { label: 'Rides', value: earnings?.summary?.totalRides || 0, icon: <CheckCircle size={18}/>, color: 'text-green-400' },
          { label: 'Rating', value: driverInfo?.rating ? `${driverInfo.rating}★` : 'N/A', icon: <Star size={18}/>, color: 'text-yellow-400' },
          { label: 'All Earnings', value: `₹${driverInfo?.total_earnings || 0}`, icon: <TrendingUp size={18}/>, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="card-sm flex flex-col gap-1">
            <div className={`${s.color}`}>{s.icon}</div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-4">
            {['requests','active'].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${tab===t ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}>{t === 'active' ? '🚗 Active Ride' : `📋 Requests (${pendingRides.length})`}</button>
            ))}
          </div>

          {tab === 'requests' && (
            <div className="flex flex-col gap-3">
              {pendingRides.length === 0 ? (
                <div className="card text-center py-10 text-gray-500">
                  <p className="text-3xl mb-2">📭</p>
                  <p>{available ? 'No ride requests right now' : 'Go online to receive requests'}</p>
                </div>
              ) : pendingRides.map(r => (
                <div key={r.id} className="card">
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex items-center gap-2"><MapPin size={13} className="text-green-400"/><span className="text-sm truncate">{r.pickup_address}</span></div>
                    <div className="flex items-center gap-2"><MapPin size={13} className="text-red-400"/><span className="text-sm truncate">{r.dropoff_address}</span></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-gray-400">
                      <span>{r.distance_km} km</span>
                      <span>{r.duration_minutes} min</span>
                      <span className="text-amber-400 font-bold">₹{r.estimated_fare}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptRide(r.id)} className="btn-primary text-sm px-4 py-1.5">Accept</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'active' && (
            <div>
              {!activeRide ? (
                <div className="card text-center py-10 text-gray-500"><p className="text-3xl mb-2">🚖</p><p>No active ride</p></div>
              ) : (
                <div className="card flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className={`badge ${activeRide.status === 'in_progress' ? 'badge-amber' : 'badge-blue'} capitalize`}>{activeRide.status?.replace('_',' ')}</span>
                    <span className="text-amber-400 font-bold">₹{activeRide.estimated_fare}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm"><MapPin size={13} className="text-green-400"/>{activeRide.pickup_address}</div>
                    <div className="flex items-center gap-2 text-sm"><MapPin size={13} className="text-red-400"/>{activeRide.dropoff_address}</div>
                  </div>
                  {activeRide.rider_name && <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl"><div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">{activeRide.rider_name[0]}</div><div><p className="font-medium text-sm">{activeRide.rider_name}</p><p className="text-xs text-gray-400">{activeRide.rider_phone}</p></div></div>}
                  <div className="flex gap-2">
                    {activeRide.status === 'accepted' && <button onClick={startRide} className="btn-primary flex-1">Start Ride (Enter OTP)</button>}
                    {activeRide.status === 'in_progress' && <button onClick={completeRide} className="btn-primary flex-1 bg-green-500 hover:bg-green-400">Complete Ride ✓</button>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="lg:sticky lg:top-20 h-fit">
          <RideMap
            pickup={activeRide ? { lat: activeRide.pickup_lat, lng: activeRide.pickup_lng, address: activeRide.pickup_address } : null}
            dropoff={activeRide ? { lat: activeRide.dropoff_lat, lng: activeRide.dropoff_lng, address: activeRide.dropoff_address } : null}
            height="480px"
          />
        </div>
      </div>
    </div>
  );
}
