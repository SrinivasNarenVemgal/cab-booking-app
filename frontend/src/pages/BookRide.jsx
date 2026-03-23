import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import RideMap from '../components/RideMap';
import { MapPin, Navigation, Car, Clock, IndianRupee, Zap, Tag } from 'lucide-react';

const VEHICLE_ICONS = { sedan: '🚗', suv: '🚙', auto: '🛺', bike: '🏍️' };

export default function BookRide() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=locations, 2=estimates, 3=confirm
  const [pickup,  setPickup]  = useState({ address:'', lat:'', lng:'' });
  const [dropoff, setDropoff] = useState({ address:'', lat:'', lng:'' });
  const [estimates, setEstimates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [promo, setPromo] = useState('');
  const [payMethod, setPayMethod] = useState('card');
  const [loading, setLoading] = useState(false);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => setPickup({ address: 'Current Location', lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }),
      () => toast.error('Could not get location')
    );
  };

  const getEstimates = async () => {
    if (!pickup.lat || !dropoff.lat) return toast.error('Enter pickup & drop-off locations');
    setLoading(true);
    try {
      const { data } = await api.get('/rides/estimate', { params: { pickup_lat: pickup.lat, pickup_lng: pickup.lng, dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng } });
      setEstimates(data.data);
      setSelected(data.data[0]);
      setStep(2);
    } catch { toast.error('Failed to get estimates'); }
    finally { setLoading(false); }
  };

  const bookRide = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/rides/book', {
        pickup_address: pickup.address, pickup_lat: pickup.lat, pickup_lng: pickup.lng,
        dropoff_address: dropoff.address, dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng,
        vehicle_type: selected.vehicleType, payment_method: payMethod, promo_code: promo
      });
      toast.success('🚖 Ride requested! Looking for driver...');
      navigate('/ride/active');
    } catch (err) { toast.error(err.response?.data?.message || 'Booking failed'); }
    finally { setLoading(false); }
  };

  // Demo: quick fill coords for testing
  const fillDemo = () => {
    setPickup({ address: 'Vijayawada Bus Stand', lat: '16.5062', lng: '80.6480' });
    setDropoff({ address: 'Vijayawada Airport', lat: '16.5300', lng: '80.7967' });
  };

  return (
    <div className="page-container">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left panel */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Book a Ride</h1>
            <button onClick={fillDemo} className="text-xs text-amber-400 hover:underline">Use demo locations</button>
          </div>

          {/* Step 1: Locations */}
          <div className="card">
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Pickup</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400"/>
                  <input placeholder="Enter pickup location" value={pickup.address}
                    onChange={e => setPickup({...pickup, address: e.target.value})}
                    className="input-field pl-9"/>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input placeholder="Latitude" value={pickup.lat} onChange={e => setPickup({...pickup, lat: e.target.value})} className="input-field text-sm"/>
                  <input placeholder="Longitude" value={pickup.lng} onChange={e => setPickup({...pickup, lng: e.target.value})} className="input-field text-sm"/>
                </div>
                <button onClick={useCurrentLocation} className="flex items-center gap-1.5 text-xs text-amber-400 hover:underline mt-2"><Navigation size={12}/>Use current location</button>
              </div>
              <div className="border-t border-gray-800"/>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Drop-off</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400"/>
                  <input placeholder="Enter drop-off location" value={dropoff.address}
                    onChange={e => setDropoff({...dropoff, address: e.target.value})}
                    className="input-field pl-9"/>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input placeholder="Latitude" value={dropoff.lat} onChange={e => setDropoff({...dropoff, lat: e.target.value})} className="input-field text-sm"/>
                  <input placeholder="Longitude" value={dropoff.lng} onChange={e => setDropoff({...dropoff, lng: e.target.value})} className="input-field text-sm"/>
                </div>
              </div>
              <button onClick={getEstimates} disabled={loading} className="btn-primary w-full">{loading ? 'Getting estimates...' : 'See Prices'}</button>
            </div>
          </div>

          {/* Step 2: Vehicle selection */}
          {step >= 2 && estimates.length > 0 && (
            <div className="card fade-in">
              <h2 className="section-title text-base">Choose Vehicle</h2>
              <div className="flex flex-col gap-2">
                {estimates.map(est => (
                  <button key={est.vehicleType} onClick={() => setSelected(est)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selected?.vehicleType === est.vehicleType ? 'border-amber-500 bg-amber-500/10' : 'border-gray-700 hover:border-gray-600'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{VEHICLE_ICONS[est.vehicleType]}</span>
                      <div className="text-left">
                        <p className="font-semibold capitalize">{est.vehicleType}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10}/>{est.durationMinutes} min · {est.distanceKm} km</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-amber-400">₹{est.estimatedFare}</p>
                      {est.breakdown.surgeFactor > 1 && <p className="text-xs text-orange-400 flex items-center gap-1 justify-end"><Zap size={10}/>Surge</p>}
                    </div>
                  </button>
                ))}
              </div>

              {/* Promo + Payment */}
              <div className="mt-4 flex flex-col gap-3">
                <div className="relative">
                  <Tag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input placeholder="Promo code (optional)" value={promo} onChange={e => setPromo(e.target.value)} className="input-field pl-9 text-sm"/>
                </div>
                <div className="flex gap-2">
                  {['card','cash'].map(m => (
                    <button key={m} onClick={() => setPayMethod(m)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize transition-all ${payMethod===m ? 'border-amber-500 text-amber-400 bg-amber-500/10' : 'border-gray-700 text-gray-400'}`}>
                      {m === 'card' ? '💳 Card' : '💵 Cash'}
                    </button>
                  ))}
                </div>
                <button onClick={bookRide} disabled={loading || !selected} className="btn-primary w-full">
                  {loading ? 'Booking...' : `Book ${selected?.vehicleType?.toUpperCase()} · ₹${selected?.estimatedFare}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Map */}
        <div className="lg:sticky lg:top-20 h-fit">
          <RideMap
            pickup={pickup.lat ? pickup : null}
            dropoff={dropoff.lat ? dropoff : null}
            height="520px"
          />
          {selected && (
            <div className="card mt-4 fade-in">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-xs text-gray-400">Distance</p><p className="font-bold text-white">{selected.distanceKm} km</p></div>
                <div><p className="text-xs text-gray-400">ETA</p><p className="font-bold text-white">{selected.durationMinutes} min</p></div>
                <div><p className="text-xs text-gray-400">Fare</p><p className="font-bold text-amber-400">₹{selected.estimatedFare}</p></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
