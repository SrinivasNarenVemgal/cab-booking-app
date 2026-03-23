import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Users, Car, IndianRupee, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users?limit=20'),
      api.get('/admin/rides?limit=20'),
      api.get('/admin/support-tickets'),
    ]).then(([s, u, r, t]) => {
      setStats(s.data.data);
      setUsers(u.data.data);
      setRides(r.data.data);
      setTickets(t.data.data);
    }).catch(() => toast.error('Failed to load admin data'))
    .finally(() => setLoading(false));
  }, []);

  const toggleUser = async (id, isActive) => {
    try { await api.patch(`/admin/users/${id}/suspend`, { is_active: !isActive }); toast.success('User updated'); setUsers(u => u.map(x => x.id === id ? {...x, is_active: !isActive} : x)); }
    catch { toast.error('Failed'); }
  };

  const replyTicket = async (id) => {
    const reply = window.prompt('Your reply:'); if (!reply) return;
    try { await api.patch(`/admin/support-tickets/${id}`, { admin_reply: reply, status: 'resolved' }); toast.success('Replied!'); setTickets(t => t.map(x => x.id === id ? {...x, admin_reply: reply, status: 'resolved'} : x)); }
    catch { toast.error('Failed'); }
  };

  const TABS = ['overview','users','rides','tickets'];
  const STATUS_COLOR = { completed:'text-green-400', cancelled:'text-red-400', in_progress:'text-amber-400', requested:'text-blue-400' };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-all ${tab===t ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}>{t}</button>)}
      </div>

      {/* Overview */}
      {tab === 'overview' && stats && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Total Users',    value: stats.users?.total,           sub:`${stats.users?.riders} riders · ${stats.users?.drivers} drivers`, icon:<Users size={20}/>, color:'text-blue-400' },
            { label:'Total Rides',    value: stats.rides?.total,           sub:`${stats.rides?.completed} completed`, icon:<Car size={20}/>, color:'text-green-400' },
            { label:'Revenue',        value:`₹${parseFloat(stats.payments?.total_revenue||0).toFixed(0)}`, sub:`${stats.payments?.total_payments} payments`, icon:<IndianRupee size={20}/>, color:'text-amber-400' },
            { label:'Drivers Online', value: stats.driversOnline,          sub:'Right now', icon:<Activity size={20}/>, color:'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="card">
              <div className={`${s.color} mb-2`}>{s.icon}</div>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm font-medium text-white mt-1">{s.label}</p>
              <p className="text-xs text-gray-500">{s.sub}</p>
            </div>
          ))}
          <div className="card md:col-span-2">
            <h3 className="font-semibold mb-3">Ride Status Breakdown</h3>
            <div className="grid grid-cols-2 gap-3">
              {[['Completed', stats.rides?.completed, 'text-green-400'], ['Cancelled', stats.rides?.cancelled, 'text-red-400'], ['Active', stats.rides?.active, 'text-amber-400']].map(([l,v,c]) => (
                <div key={l} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
                  <span className="text-sm text-gray-400">{l}</span>
                  <span className={`font-bold ${c}`}>{v || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-left">
              {['Name','Email','Role','Status','Action'].map(h => <th key={h} className="pb-3 text-gray-400 font-medium pr-4">{h}</th>)}
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 pr-4 font-medium">{u.name}</td>
                  <td className="py-3 pr-4 text-gray-400">{u.email}</td>
                  <td className="py-3 pr-4"><span className={`badge capitalize ${u.role==='admin'?'badge-amber':u.role==='driver'?'badge-blue':'badge-gray'}`}>{u.role}</span></td>
                  <td className="py-3 pr-4"><span className={`badge ${u.is_active?'badge-green':'badge-red'}`}>{u.is_active?'Active':'Suspended'}</span></td>
                  <td className="py-3">
                    {u.role !== 'admin' && (
                      <button onClick={() => toggleUser(u.id, u.is_active)} className={`text-xs font-medium px-3 py-1 rounded-lg ${u.is_active?'bg-red-500/10 text-red-400 hover:bg-red-500/20':'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                        {u.is_active ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rides */}
      {tab === 'rides' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-left">
              {['ID','Rider','Driver','From → To','Fare','Status'].map(h => <th key={h} className="pb-3 text-gray-400 font-medium pr-4">{h}</th>)}
            </tr></thead>
            <tbody>
              {rides.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 pr-4 text-gray-500 font-mono text-xs">{r.id.slice(0,8)}</td>
                  <td className="py-3 pr-4">{r.rider_name || '—'}</td>
                  <td className="py-3 pr-4">{r.driver_name || '—'}</td>
                  <td className="py-3 pr-4 max-w-xs"><p className="truncate text-xs text-gray-300">{r.pickup_address} → {r.dropoff_address}</p></td>
                  <td className="py-3 pr-4 text-amber-400 font-bold">₹{r.final_fare || r.estimated_fare}</td>
                  <td className="py-3"><span className={`text-xs font-semibold capitalize ${STATUS_COLOR[r.status]||'text-gray-400'}`}>{r.status?.replace('_',' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tickets */}
      {tab === 'tickets' && (
        <div className="flex flex-col gap-3">
          {tickets.length === 0 && <div className="card text-center py-10 text-gray-500">No support tickets</div>}
          {tickets.map(t => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${t.status==='resolved'?'badge-green':t.status==='open'?'badge-red':'badge-amber'}`}>{t.status}</span>
                    <span className="text-sm font-semibold">{t.subject}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{t.message}</p>
                  <p className="text-xs text-gray-500">From: {t.user_name} · {new Date(t.created_at).toLocaleDateString()}</p>
                  {t.admin_reply && <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400">Reply: {t.admin_reply}</div>}
                </div>
                {t.status !== 'resolved' && (
                  <button onClick={() => replyTicket(t.id)} className="btn-secondary text-xs px-3 py-1.5 shrink-0">Reply</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
