import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MapPin, Clock, LayoutDashboard, User, LogOut, Menu, X, Wifi, WifiOff, Car } from 'lucide-react';
export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const riderLinks  = [{ to: '/book', icon: <MapPin size={16}/>, label: 'Book Ride' }, { to: '/history', icon: <Clock size={16}/>, label: 'History' }, { to: '/profile', icon: <User size={16}/>, label: 'Profile' }];
  const driverLinks = [{ to: '/driver', icon: <Car size={16}/>, label: 'Dashboard' }, { to: '/profile', icon: <User size={16}/>, label: 'Profile' }];
  const adminLinks  = [{ to: '/admin', icon: <LayoutDashboard size={16}/>, label: 'Admin' }];
  const links = user?.role === 'driver' ? driverLinks : user?.role === 'admin' ? adminLinks : riderLinks;
  const isActive = (to) => location.pathname === to;
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl"><span className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-black">🚖</span><span>Cab<span className="text-amber-400">App</span></span></Link>
        {user && <div className="hidden md:flex items-center gap-1">{links.map(l => <Link key={l.to} to={l.to} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(l.to) ? 'bg-amber-500/10 text-amber-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>{l.icon}{l.label}</Link>)}</div>}
        <div className="flex items-center gap-3">
          {user && <div className="hidden md:flex items-center gap-1 text-xs">{connected ? <><Wifi size={12} className="text-green-400"/><span className="text-green-400">Live</span></> : <><WifiOff size={12} className="text-red-400"/><span className="text-red-400">Offline</span></>}</div>}
          {user ? <>
            <div className="hidden md:flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold">{user.name[0].toUpperCase()}</div><div className="hidden lg:block"><p className="text-sm font-medium">{user.name}</p><p className="text-xs text-gray-500 capitalize">{user.role}</p></div></div>
            <button onClick={logout} className="hidden md:flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 px-2 py-1.5 rounded hover:bg-red-500/10"><LogOut size={15}/>Logout</button>
          </> : <div className="hidden md:flex gap-2"><Link to="/login" className="btn-secondary text-sm py-1.5 px-4">Login</Link><Link to="/register" className="btn-primary text-sm py-1.5 px-4">Sign Up</Link></div>}
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-gray-400">{open ? <X size={20}/> : <Menu size={20}/>}</button>
        </div>
      </div>
      {open && <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 py-4 flex flex-col gap-2">
        {user && links.map(l => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${isActive(l.to) ? 'bg-amber-500/10 text-amber-400' : 'text-gray-300 hover:bg-gray-800'}`}>{l.icon}{l.label}</Link>)}
        {user ? <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-sm text-red-400"><LogOut size={14}/>Logout</button>
          : <><Link to="/login" onClick={() => setOpen(false)} className="btn-secondary text-sm">Login</Link><Link to="/register" onClick={() => setOpen(false)} className="btn-primary text-sm">Sign Up</Link></>}
      </div>}
    </nav>
  );
}
