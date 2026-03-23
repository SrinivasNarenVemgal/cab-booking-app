import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('rider');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', vehicle_model:'', vehicle_plate:'', vehicle_type:'sedan', license_number:'' });
  const set = (k) => (e) => setForm({...form, [k]: e.target.value});

  const handle = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const data = await register({ ...form, role });
      toast.success('Account created!');
      navigate(data.user.role === 'driver' ? '/driver' : '/book');
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🚖</div>
          <h1 className="text-3xl font-bold">Create account</h1>
          <p className="text-gray-400 mt-2">Join CabApp today</p>
        </div>
        <div className="card">
          {/* Role selector */}
          <div className="flex gap-2 mb-5 bg-gray-800 p-1 rounded-xl">
            {['rider','driver'].map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${role===r ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}>
                {r === 'rider' ? '🧑 Rider' : '🚖 Driver'}
              </button>
            ))}
          </div>
          <form onSubmit={handle} className="flex flex-col gap-3">
            <input required placeholder="Full name" value={form.name} onChange={set('name')} className="input-field"/>
            <input required type="email" placeholder="Email" value={form.email} onChange={set('email')} className="input-field"/>
            <input required type="password" placeholder="Password (min 8 chars)" minLength={8} value={form.password} onChange={set('password')} className="input-field"/>
            <input placeholder="Phone number" value={form.phone} onChange={set('phone')} className="input-field"/>
            {role === 'driver' && <>
              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs text-amber-400 font-semibold mb-3 uppercase tracking-wider">Vehicle Details</p>
              </div>
              <input required placeholder="Vehicle model (e.g. Swift Dzire)" value={form.vehicle_model} onChange={set('vehicle_model')} className="input-field"/>
              <input required placeholder="License plate (e.g. TS09AB1234)" value={form.vehicle_plate} onChange={set('vehicle_plate')} className="input-field"/>
              <select value={form.vehicle_type} onChange={set('vehicle_type')} className="input-field">
                {['sedan','suv','auto','bike'].map(v => <option key={v} value={v} className="bg-gray-900 capitalize">{v.toUpperCase()}</option>)}
              </select>
              <input required placeholder="Driving license number" value={form.license_number} onChange={set('license_number')} className="input-field"/>
            </>}
            <button type="submit" disabled={loading} className="btn-primary w-full mt-1">{loading ? 'Creating...' : 'Create Account'}</button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-4">Have an account? <Link to="/login" className="text-amber-400 hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
