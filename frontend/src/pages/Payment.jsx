import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Lock, CreditCard, CheckCircle, Smartphone, Wallet, Building } from 'lucide-react';

const TEST_CARDS = [
  { number: '4111 1111 1111 1111', type: 'Visa',       color: 'bg-blue-600' },
  { number: '5500 0000 0000 0004', type: 'Mastercard', color: 'bg-red-600'  },
];

const UPI_IDS = ['success@demo', 'test@upi', 'demo@paytm'];

export default function Payment() {
  const { rideId } = useParams();
  const navigate   = useNavigate();
  const [ride,     setRide]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [method,   setMethod]   = useState('card');
  const [paying,   setPaying]   = useState(false);
  const [paid,     setPaid]     = useState(false);
  const [step,     setStep]     = useState('select'); // select | form | processing | done
  const [card,     setCard]     = useState({ number:'', expiry:'', cvv:'', name:'' });
  const [upi,      setUpi]      = useState('');

  useEffect(() => {
    api.get(`/rides/${rideId}`)
      .then(({ data }) => setRide(data.data))
      .catch(() => toast.error('Ride not found'))
      .finally(() => setLoading(false));
  }, [rideId]);

  const formatCard = (val) => val.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExpiry = (val) => { const v = val.replace(/\D/g,'').slice(0,4); return v.length>=3 ? v.slice(0,2)+'/'+v.slice(2) : v; };

  const processPayment = async () => {
    setStep('processing');
    // Simulate payment processing delay (realistic UX)
    await new Promise(r => setTimeout(r, 2500));
    try {
      await api.post('/payments/mock-complete', { ride_id: rideId, method });
      setStep('done');
      setPaid(true);
      setTimeout(() => navigate('/history'), 3000);
    } catch { toast.error('Payment failed'); setStep('form'); }
  };

  const handleCash = async () => {
    setPaying(true);
    try {
      await api.post('/payments/mock-complete', { ride_id: rideId, method });
      toast.success('Cash payment recorded!');
      navigate('/history');
    } catch { toast.error('Failed'); }
    finally { setPaying(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );
  if (!ride) return <div className="page-container text-center text-gray-400">Ride not found</div>;

  const amount = parseFloat(ride.final_fare || ride.estimated_fare);

  // ── Processing screen ──────────────────────────────────────────────────────
  if (step === 'processing') return (
    <div className="page-container max-w-md">
      <div className="card text-center py-12 fade-in">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"/>
        <h2 className="text-xl font-bold mb-2">Processing Payment</h2>
        <p className="text-gray-400 text-sm mb-1">Connecting to bank...</p>
        <p className="text-amber-400 font-bold text-2xl mt-4">₹{amount}</p>
      </div>
    </div>
  );

  // ── Success screen ─────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div className="page-container max-w-md">
      <div className="card text-center py-10 fade-in">
        <div className="w-20 h-20 bg-green-500/10 border-2 border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-green-400"/>
        </div>
        <h2 className="text-2xl font-bold mb-1">Payment Successful!</h2>
        <p className="text-4xl font-bold text-green-400 my-3">₹{amount}</p>
        <p className="text-gray-400 text-sm mb-1">Transaction ID: TXN{Date.now().toString().slice(-8)}</p>
        <p className="text-gray-500 text-xs">Redirecting to history...</p>
      </div>
    </div>
  );

  return (
    <div className="page-container max-w-md">
      <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>

      {/* Ride summary */}
      <div className="card mb-5">
        <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3">Ride Summary</h2>
        <div className="flex flex-col gap-2 text-sm mb-4">
          <div className="flex justify-between"><span className="text-gray-400">From</span><span className="truncate max-w-48 font-medium">{ride.pickup_address}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">To</span><span className="truncate max-w-48 font-medium">{ride.dropoff_address}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Distance</span><span>{ride.distance_km} km</span></div>
          {ride.driver_name && <div className="flex justify-between"><span className="text-gray-400">Driver</span><span>{ride.driver_name}</span></div>}
        </div>
        <div className="border-t border-gray-800 pt-3 flex justify-between items-center">
          <span className="font-bold text-lg">Total</span>
          <span className="font-bold text-2xl text-amber-400">₹{amount}</span>
        </div>
      </div>

      {/* Payment method selector */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { id:'card',  icon:<CreditCard size={18}/>,  label:'Card' },
          { id:'upi',   icon:<Smartphone size={18}/>,  label:'UPI' },
          { id:'wallet',icon:<Wallet size={18}/>,      label:'Wallet' },
          { id:'cash',  icon:'💵',                     label:'Cash' },
        ].map(m => (
          <button key={m.id} onClick={() => setMethod(m.id)}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${method===m.id ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
            <span>{m.icon}</span>{m.label}
          </button>
        ))}
      </div>

      {/* Card form */}
      {method === 'card' && (
        <div className="card mb-4 fade-in">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><CreditCard size={15} className="text-amber-400"/>Card Details</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Card Number</label>
              <input value={card.number} onChange={e => setCard({...card, number: formatCard(e.target.value)})}
                placeholder="1234 5678 9012 3456" className="input-field font-mono tracking-wider" maxLength={19}/>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Cardholder Name</label>
              <input value={card.name} onChange={e => setCard({...card, name: e.target.value})}
                placeholder="Name on card" className="input-field"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Expiry</label>
                <input value={card.expiry} onChange={e => setCard({...card, expiry: formatExpiry(e.target.value)})}
                  placeholder="MM/YY" className="input-field" maxLength={5}/>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">CVV</label>
                <input value={card.cvv} onChange={e => setCard({...card, cvv: e.target.value.replace(/\D/g,'').slice(0,3)})}
                  placeholder="123" className="input-field" maxLength={3} type="password"/>
              </div>
            </div>
            {/* Test cards hint */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <p className="text-xs text-amber-400 font-semibold mb-2">Demo test cards:</p>
              {TEST_CARDS.map(tc => (
                <button key={tc.number} onClick={() => setCard({...card, number: tc.number, expiry:'12/26', cvv:'123', name:'Test User'})}
                  className="flex items-center gap-2 text-xs text-gray-300 hover:text-white mb-1 w-full">
                  <span className={`${tc.color} text-white px-1.5 py-0.5 rounded text-xs`}>{tc.type}</span>
                  {tc.number} <span className="text-amber-400 text-xs ml-auto">Use this →</span>
                </button>
              ))}
            </div>
            <button onClick={processPayment} disabled={!card.number || !card.expiry || !card.cvv}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
              <Lock size={14}/> Pay ₹{amount}
            </button>
          </div>
        </div>
      )}

      {/* UPI form */}
      {method === 'upi' && (
        <div className="card mb-4 fade-in">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Smartphone size={15} className="text-amber-400"/>UPI Payment</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">UPI ID</label>
              <input value={upi} onChange={e => setUpi(e.target.value)}
                placeholder="yourname@upi" className="input-field"/>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <p className="text-xs text-amber-400 font-semibold mb-2">Demo UPI IDs:</p>
              {UPI_IDS.map(id => (
                <button key={id} onClick={() => setUpi(id)}
                  className="block text-xs text-gray-300 hover:text-amber-400 mb-1">{id}</button>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap justify-center my-2">
              {['GPay','PhonePe','Paytm','BHIM'].map(app => (
                <button key={app} onClick={() => { setUpi('success@demo'); processPayment(); }}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm hover:border-amber-500 hover:text-amber-400 transition-all">
                  {app}
                </button>
              ))}
            </div>
            <button onClick={processPayment} disabled={!upi}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
              <Lock size={14}/> Verify & Pay ₹{amount}
            </button>
          </div>
        </div>
      )}

      {/* Wallet */}
      {method === 'wallet' && (
        <div className="card mb-4 fade-in">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Wallet size={15} className="text-amber-400"/>Select Wallet</h3>
          <div className="grid grid-cols-2 gap-3">
            {['Paytm Wallet','Amazon Pay','Mobikwik','Ola Money'].map(w => (
              <button key={w} onClick={processPayment}
                className="p-4 bg-gray-800 border border-gray-700 rounded-xl text-sm font-medium hover:border-amber-500 hover:text-amber-400 transition-all text-center">
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cash */}
      {method === 'cash' && (
        <div className="card mb-4 fade-in">
          <h3 className="font-semibold mb-3 flex items-center gap-2">💵 Pay Cash to Driver</h3>
          <p className="text-gray-400 text-sm mb-4">Hand over the exact amount to your driver after the ride. The driver will confirm receipt.</p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center mb-4">
            <p className="text-xs text-gray-400 mb-1">Amount to pay</p>
            <p className="text-3xl font-bold text-amber-400">₹{amount}</p>
          </div>
          <button onClick={handleCash} disabled={paying} className="btn-primary w-full">
            {paying ? 'Recording...' : 'Confirm Cash Payment'}
          </button>
        </div>
      )}

      <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1 mt-2">
        <Lock size={10}/> 256-bit SSL encrypted · Your data is safe
      </p>
    </div>
  );
}
