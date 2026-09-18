import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Chart from './pages/Chart';
import Login from './pages/Login';

function AppContent() {
  const location = useLocation();
  const showNavbar = location.pathname !== '/login';

  return (
    <div className="app-container" style={{ fontFamily: 'Inter, sans-serif' }}>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate replace to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chart" element={<Chart />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

