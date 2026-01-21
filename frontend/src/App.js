import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import Dashboard from '@/pages/Dashboard';
import CalendarView from '@/pages/CalendarView';
import GapsView from '@/pages/GapsView';
import StaffManagement from '@/pages/StaffManagement';
import AbsencesView from '@/pages/AbsencesView';
import ReportsView from '@/pages/ReportsView';
import Sidebar from '@/components/Sidebar';
import { Toaster } from '@/components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/gaps" element={<GapsView />} />
              <Route path="/staff" element={<StaffManagement />} />
              <Route path="/absences" element={<AbsencesView />} />
              <Route path="/reports" element={<ReportsView />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;