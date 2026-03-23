import React, { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { User, Phone, Mail, Car, Star, Lock, Save } from 'lucide-react';

export default function Profile() {
  const { user, driverInfo, refreshProfile } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm({...form, [k]: e.target.value});
  const setPw = k => e => setPwForm({...pwForm, [k]: e.target.value});

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.patch('/auth/profile', form); await refreshProfile(); toast.success('Profile updated!'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try { await api.post('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }); toast.success('Password changed!'); setPwForm({ currentPassword:'', newPassword:'', confirm:'' }); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-container max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      <div className="flex flex-col gap-6">
        {/* Avatar + info */}
        <div className="card flex items-center gap-5">
          <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center text-black text-4xl font-bold shrink-0">{user?.name[0]?.toUpperCase()}</div>
          <div>
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-gray-400">{user?.email}</p>
            <span className={`badge mt-1 capitalize ${user?.role==='driver'?'badge-blue':user?.role==='admin'?'badge-amber':'badge-gray'}`}>{user?.role}</span>
          </div>
        </div>

        {/* Driver info */}
        {driverInfo && (
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Car size={16} className="text-amber-400"/>Vehicle Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[['Model', driverInfo.vehicle_model], ['Plate', driverInfo.vehicle_plate], ['Type', driverInfo.vehicle_type?.toUpperCase()], ['Rating', `${driverInfo.rating || 0} ⭐`], ['Total Rides', driverInfo.total_rides], ['Earnings', `₹${driverInfo.total_earnings || 0}`]].map(([l,v]) => (
                <div key={l} className="bg-gray-800 p-3 rounded-xl"><p className="text-xs text-gray-400 mb-0.5">{l}</p><p className="font-semibold">{v}</p></div>
              ))}
            </div>
          </div>
        )}

        {/* Edit profile */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><User size={16} className="text-amber-400"/>Edit Profile</h3>
          <form onSubmit={saveProfile} className="flex flex-col gap-3">
            <div><label className="text-xs text-gray-400 mb-1 block">Full Name</label><input value={form.name} onChange={set('name')} className="input-field"/></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Phone</label><input value={form.phone} onChange={set('phone')} className="input-field"/></div>
            <div><label className="text-xs text-gray-400 mb-1 block">Email</label><input value={user?.email} disabled className="input-field opacity-50 cursor-not-allowed"/></div>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 w-fit"><Save size={15}/>{saving ? 'Saving...' : 'Save Changes'}</button>
          </form>
        </div>

        {/* Change password */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Lock size={16} className="text-amber-400"/>Change Password</h3>
          <form onSubmit={changePassword} className="flex flex-col gap-3">
            <input type="password" placeholder="Current password" value={pwForm.currentPassword} onChange={setPw('currentPassword')} className="input-field"/>
            <input type="password" placeholder="New password (min 8)" minLength={8} value={pwForm.newPassword} onChange={setPw('newPassword')} className="input-field"/>
            <input type="password" placeholder="Confirm new password" value={pwForm.confirm} onChange={setPw('confirm')} className="input-field"/>
            <button type="submit" disabled={saving} className="btn-primary w-fit">{saving ? 'Updating...' : 'Update Password'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
