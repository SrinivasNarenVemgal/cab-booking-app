import React from 'react';
import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
      <div>
        <p className="text-8xl mb-6">🚖</p>
        <h1 className="text-6xl font-bold text-amber-400 mb-3">404</h1>
        <p className="text-xl text-gray-400 mb-6">This road doesn't exist.</p>
        <Link to="/" className="btn-primary inline-flex">Go Home</Link>
      </div>
    </div>
  );
}
