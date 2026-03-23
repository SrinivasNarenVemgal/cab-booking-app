import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import BookRide from './pages/BookRide';
import RideHistory from './pages/RideHistory';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ActiveRide from './pages/ActiveRide';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import Payment from './pages/Payment';

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-gray-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-amber-400 font-semibold">Loading CabApp...</p>
    </div>
  </div>
);

// Only redirects if NOT loading
const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    // Redirect to correct home based on role
    if (user.role === 'driver') return <Navigate to="/driver" replace />;
    if (user.role === 'admin')  return <Navigate to="/admin"  replace />;
    return <Navigate to="/book" replace />;
  }
  return children;
};

// Only redirects logged-in users away from login/register
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) {
    if (user.role === 'driver') return <Navigate to="/driver" replace />;
    if (user.role === 'admin')  return <Navigate to="/admin"  replace />;
    return <Navigate to="/book" replace />;
  }
  return children;
};

const Layout = ({ children }) => (
  <div className="min-h-screen bg-gray-950 text-white">
    <Navbar />
    <main className="pt-16">{children}</main>
  </div>
);

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Rider routes */}
        <Route path="/book" element={
          <PrivateRoute roles={['rider']}>
            <Layout><BookRide /></Layout>
          </PrivateRoute>
        } />
        <Route path="/ride/active" element={
          <PrivateRoute roles={['rider']}>
            <Layout><ActiveRide /></Layout>
          </PrivateRoute>
        } />
        <Route path="/history" element={
          <PrivateRoute roles={['rider']}>
            <Layout><RideHistory /></Layout>
          </PrivateRoute>
        } />

        {/* Driver routes */}
        <Route path="/driver" element={
          <PrivateRoute roles={['driver']}>
            <Layout><DriverDashboard /></Layout>
          </PrivateRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin" element={
          <PrivateRoute roles={['admin']}>
            <Layout><AdminDashboard /></Layout>
          </PrivateRoute>
        } />

        {/* Payment */}
        <Route path="/payment/:rideId" element={
          <PrivateRoute roles={['rider']}>
            <Layout><Payment /></Layout>
          </PrivateRoute>
        } />

        {/* Shared */}
        <Route path="/profile" element={
          <PrivateRoute>
            <Layout><Profile /></Layout>
          </PrivateRoute>
        } />

        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

// Smart root redirect - waits for auth to load
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user)              return <Navigate to="/login"  replace />;
  if (user.role === 'driver') return <Navigate to="/driver" replace />;
  if (user.role === 'admin')  return <Navigate to="/admin"  replace />;
  return <Navigate to="/book" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1f2937', color: '#fff', border: '1px solid #374151' },
            success: { iconTheme: { primary: '#f59e0b', secondary: '#fff' } },
          }}
        />
      </SocketProvider>
    </AuthProvider>
  );
}
