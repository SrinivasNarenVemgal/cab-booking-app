import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import RideMap from '../components/RideMap';
import { useSocket } from '../context/SocketContext';
import { Phone, Shield, X, CheckCircle, MapPin } from 'lucide-react';

const STATUS_STEPS  = ['requested','accepted','in_progress','completed'];
const STATUS_LABELS = { requested:'Finding Driver...', accepted:'Driver Assigned ✅', in_progress:'Ride In Progress 🚗', completed:'Completed!' };

export default function ActiveRide() {
  const navigate = useNavigate();
  const { joinRide, leaveRide, onEvent, offEvent } = useSocket();
  const [ride,      setRide]      = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showRating,setShowRating]= useState(false);
  const [rating,    setRating]    = useState(5);
  const [comment,   setComment]   = useState('');
  const fetchingRef = useRef(false);

  const fetchRide = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data } = await api.get('/rides/active');
      if (data.data) {
        setRide(data.data);
        if (data.data.driver_lat) setDriverLoc({ lat: data.data.driver_lat, lng: data.data.driver_lng });
      } else {
        setRide(null);
      }
    } catch (err) {
      console.error('Fetch ride error:', err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchRide();
    const interval = setInterval(fetchRide, 8000);
    return () => clearInterval(interval);
  }, [fetchRide]);

  useEffect(() => {
    if (!ride?.id) return;
    joinRide(ride.id);
    const onAccepted  = (d) => { toast.success('🚖 Driver found!'); fetchRide(); };
    const onStarted   = ()  => { toast.success('🚀 Ride started!'); fetchRide(); };
    const onCompleted = ()  => { toast.success('✅ Ride completed!'); fetchRide(); setShowRating(true); };
    const onCancelled = (d) => { toast.error('Ride cancelled'); setTimeout(() => navigate('/book'), 2000); };
    const onLocation  = (d) => setDriverLoc({ lat: d.lat, lng: d.lng });
    onEvent('ride:accepted', onAccepted);
    onEvent('ride:started',  onStarted);
    onEvent('ride:completed',onCompleted);
    onEvent('ride:cancelled',onCancelled);
    onEvent('driver:location:update', onLocation);
    return () => {
      leaveRide(ride.id);
      offEvent('ride:accepted', onAccepted);
      offEvent('ride:started',  onStarted);
      offEvent('ride:completed',onCompleted);
      offEvent('ride:cancelled',onCancelled);
      offEvent('driver:location:update', onLocation);
    };
  }, [ride?.id]);

  const cancelRide = async () => {
    if (!window.confirm('Cancel this ride?')) return;
    try {
      await api.post(`/rides/${ride.id}/cancel`, { reason: 'Rider cancelled' });
      toast.success('Ride cancelled');
      setTimeout(() => navigate('/book'), 1500);
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot cancel'); }
  };

  const submitRating = async () => {
    try { await api.post('/ratings', { ride_id: ride.id, driver_rating: rating, rider_comment: comment }); }
    catch {}
    navigate('/history');
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/>
        <p className="text-gray-400 text-sm">Loading ride...</p>
      </div>
    </div>
  );

  // ── No active ride ─────────────────────────────────────────────────────────
  if (!ride) return (
    <div className="page-container max-w-md">
      <div className="card text-center py-12">
        <p className="text-5xl mb-4">🚖</p>
        <h2 className="text-xl font-bold mb-2">No Active Ride</h2>
        <p className="text-gray-400 mb-6 text-sm">You don't have an active ride right now.</p>
        <button onClick={() => navigate('/book')} className="btn-primary w-full">Book a Ride</button>
        <button onClick={fetchRide} className="btn-secondary w-full mt-2 text-sm">Refresh</button>
      </div>
    </div>
  );

  const stepIndex = STATUS_STEPS.indexOf(ride.status);

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Active Ride</h1>
        <button onClick={fetchRide} className="text-xs text-amber-400 hover:underline">🔄 Refresh</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">

          {/* Status bar */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <span className="live-dot"/>
              <span className="text-sm font-semibold text-green-400">{STATUS_LABELS[ride.status] || ride.status}</span>
            </div>
            <div className="status-steps mb-4">
              {STATUS_STEPS.map((s,i) => <div key={s} className={`status-step ${i<=stepIndex?'active':''}`}/>)}
            </div>

            {/* OTP — show for requested AND accepted */}
            {ride.otp && (ride.status === 'requested' || ride.status === 'accepted') && (
              <div className="bg-amber-500/10 border-2 border-amber-500 rounded-2xl p-5 text-center mt-2">
                <p className="text-sm text-gray-300 mb-2 font-medium">
                  {ride.status === 'accepted' ? '📋 Share OTP with driver to start ride' : '🔑 Your OTP (share when driver arrives)'}
                </p>
                <p className="text-6xl font-bold text-amber-400 tracking-widest">{ride.otp}</p>
                <p className="text-xs text-gray-500 mt-2">Do not share this with anyone else</p>
              </div>
            )}

            {ride.status === 'in_progress' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <p className="text-green-400 font-semibold">🚗 Ride is in progress!</p>
                <p className="text-xs text-gray-400 mt-1">Sit back and enjoy your ride</p>
              </div>
            )}
          </div>

          {/* Ride details */}
          <div className="card flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-green-400 mt-0.5 shrink-0"/>
              <div><p className="text-xs text-gray-400">Pickup</p><p className="text-sm font-medium">{ride.pickup_address}</p></div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-red-400 mt-0.5 shrink-0"/>
              <div><p className="text-xs text-gray-400">Drop-off</p><p className="text-sm font-medium">{ride.dropoff_address}</p></div>
            </div>
            <div className="border-t border-gray-800 pt-3 grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xs text-gray-400">Distance</p><p className="font-bold">{ride.distance_km} km</p></div>
              <div><p className="text-xs text-gray-400">ETA</p><p className="font-bold">{ride.duration_minutes} min</p></div>
              <div><p className="text-xs text-gray-400">Fare</p><p className="font-bold text-amber-400">₹{ride.estimated_fare}</p></div>
            </div>
          </div>

          {/* Driver info */}
          {ride.driver_name && (
            <div className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-black font-bold text-xl">{ride.driver_name[0]}</div>
                <div>
                  <p className="font-semibold">{ride.driver_name}</p>
                  <p className="text-xs text-gray-400">{ride.vehicle_model} · {ride.vehicle_plate}</p>
                </div>
              </div>
              {ride.driver_phone && (
                <a href={`tel:${ride.driver_phone}`} className="w-10 h-10 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center text-green-400 hover:bg-green-500/20"><Phone size={16}/></a>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {['requested','accepted'].includes(ride.status) && (
              <button onClick={cancelRide} className="btn-danger flex items-center gap-2 flex-1"><X size={15}/>Cancel</button>
            )}
            <button onClick={() => toast.success('SOS sent to admin!')} className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 font-semibold text-sm">
              <Shield size={15}/>SOS
            </button>
          </div>
        </div>

        {/* Map */}
        <RideMap
          pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng, address: ride.pickup_address }}
          dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lng, address: ride.dropoff_address }}
          driverLocation={driverLoc}
          height="480px"
        />
      </div>

      {/* Rating modal */}
      {showRating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm text-center fade-in">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-3"/>
            <h2 className="text-xl font-bold mb-1">Ride Completed! 🎉</h2>
            <p className="text-gray-400 text-sm mb-4">How was your experience?</p>
            <div className="flex justify-center gap-2 mb-4">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)} className={`text-4xl transition-transform hover:scale-110 ${s<=rating?'opacity-100':'opacity-25'}`}>⭐</button>
              ))}
            </div>
            <textarea placeholder="Comment (optional)" value={comment} onChange={e=>setComment(e.target.value)} className="input-field text-sm mb-4 resize-none" rows={2}/>
            <button onClick={submitRating} className="btn-primary w-full">Submit Rating</button>
            <button onClick={() => navigate('/history')} className="text-xs text-gray-500 mt-3 hover:text-gray-300 block w-full">Skip</button>
          </div>
        </div>
      )}
    </div>
  );
}
