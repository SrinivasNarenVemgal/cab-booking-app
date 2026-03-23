import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/profile');
      setUser(data.data.user);
      setDriverInfo(data.data.driverInfo || null);
    } catch { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadProfile(); }, [loadProfile]);
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    setUser(data.data.user); setDriverInfo(data.data.driverInfo || null);
    return data.data;
  };
  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    setUser(data.data.user); return data.data;
  };
  const logout = () => { localStorage.clear(); setUser(null); setDriverInfo(null); window.location.href = '/login'; };
  return (
    <AuthContext.Provider value={{ user, driverInfo, loading, login, register, logout, refreshProfile: loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used inside AuthProvider'); return ctx; };
