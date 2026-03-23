import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
const SocketContext = createContext(null);
export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!user) { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; setConnected(false); } return; }
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { transports: ['websocket', 'polling'], reconnectionAttempts: 5 });
    socket.on('connect', () => { setConnected(true); socket.emit('register', { userId: user.id, role: user.role }); });
    socket.on('disconnect', () => setConnected(false));
    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; setConnected(false); };
  }, [user]);
  const joinRide = (rideId) => socketRef.current?.emit('join:ride', { rideId });
  const leaveRide = (rideId) => socketRef.current?.emit('leave:ride', { rideId });
  const sendLocation = (data) => socketRef.current?.emit('driver:location', data);
  const onEvent = (event, cb) => socketRef.current?.on(event, cb);
  const offEvent = (event, cb) => socketRef.current?.off(event, cb);
  return <SocketContext.Provider value={{ socket: socketRef.current, connected, joinRide, leaveRide, sendLocation, onEvent, offEvent }}>{children}</SocketContext.Provider>;
};
export const useSocket = () => { const ctx = useContext(SocketContext); if (!ctx) throw new Error('useSocket must be inside SocketProvider'); return ctx; };
