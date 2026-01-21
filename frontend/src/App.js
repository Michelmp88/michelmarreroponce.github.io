import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginView from '@/pages/LoginView';
import Dashboard from '@/pages/Dashboard';
import CalendarView from '@/pages/CalendarView';
import GapsView from '@/pages/GapsView';
import StaffManagement from '@/pages/StaffManagement';
import HousesManagement from '@/pages/HousesManagement';
import AbsencesView from '@/pages/AbsencesView';
import ReportsView from '@/pages/ReportsView';
import HoursTrackingView from '@/pages/HoursTrackingView';
import Sidebar from '@/components/Sidebar';
import { Toaster } from '@/components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/gaps" element={<GapsView />} />
          <Route path="/staff" element={<StaffManagement />} />
          <Route path="/houses" element={<HousesManagement />} />
          <Route path="/absences" element={<AbsencesView />} />
          <Route path="/reports" element={<ReportsView />} />
          <Route path="/hours" element={<HoursTrackingView />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <ProtectedRoutes />
        </BrowserRouter>
        <Toaster position="top-right" />
      </AuthProvider>
    </div>
  );
}

export default App;