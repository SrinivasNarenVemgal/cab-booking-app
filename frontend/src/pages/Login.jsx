import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      toast.success(`Welcome back, ${data.user.name}!`);
      if (data.user.role === 'driver') navigate('/driver');
      else if (data.user.role === 'admin') navigate('/admin');
      else navigate('/book');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🚖</div>
          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-400 mt-2">Sign in to your CabApp account</p>
        </div>
        <div className="card">
          <form onSubmit={handle} className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Email</label>
              <input type="email" required placeholder="you@example.com" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Password</label>
              <input type="password" required placeholder="••••••••" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} className="input-field" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-4">
            No account? <Link to="/register" className="text-amber-400 hover:underline">Create one</Link>
          </p>
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-500">
            <p className="font-semibold text-gray-400 mb-1">Demo credentials:</p>
            <p>Admin: admin@cabapp.com / Admin@123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
