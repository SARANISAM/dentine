import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Chart from './pages/Chart';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import { supabase } from './src/lib/supabase';
import type { Session } from '@supabase/supabase-js';

// Wraps protected routes — redirects to /login when there is no active session.
function ProtectedRoute({ session, children }: { session: Session | null; children: React.ReactNode }) {
  if (session === undefined) {
    // Still checking session — render nothing to avoid flash
    return null;
  }
  if (!session) {
    return <Navigate replace to="/login" />;
  }
  return <>{children}</>;
}

function AppContent({ session }: { session: Session | null | undefined }) {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const showNavbar = !isAuthPage;

  return (
    <div className="app-container" style={{ fontFamily: 'Inter, sans-serif' }}>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate replace to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chart"
          element={
            <ProtectedRoute session={session}>
              <Chart />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <AppContent session={session} />
    </Router>
  );
}

export default App;
