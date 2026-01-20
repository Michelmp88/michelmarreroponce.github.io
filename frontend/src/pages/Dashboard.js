import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentYear = 2025;
  const currentMonth = 1;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, gapsRes] = await Promise.all([
        axios.get(`${API}/stats/${currentYear}/${currentMonth}`),
        axios.get(`${API}/coverage/gaps/${currentYear}/${currentMonth}`)
      ]);
      setStats(statsRes.data);
      setGaps(gapsRes.data.slice(0, 10));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight" data-testid="dashboard-title">
          Centro de Control
        </h1>
        <p className="text-slate-500 mt-2">Enero 2025</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Total Coberturas</p>
              <p className="text-3xl font-bold text-slate-900" data-testid="total-coverage">{stats?.total || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-700 uppercase tracking-wider">Completas</p>
              <p className="text-3xl font-bold text-emerald-900" data-testid="complete-coverage">{stats?.complete || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-rose-200 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-rose-50 to-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-rose-700 uppercase tracking-wider">Incompletas</p>
              <p className="text-3xl font-bold text-rose-900" data-testid="incomplete-coverage">{stats?.incomplete || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-8 border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Brechas Urgentes</h2>
            <p className="text-sm text-slate-500 mt-1">Coberturas que requieren asignación</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/gaps'}
            data-testid="view-all-gaps-btn"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Ver Todas
          </Button>
        </div>

        <div className="space-y-3">
          {gaps.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
              <p>No hay brechas de cobertura</p>
            </div>
          ) : (
            gaps.map((gap, idx) => (
              <div
                key={gap.coverage_id}
                data-testid={`gap-item-${idx}`}
                className="flex items-center justify-between p-4 border border-rose-200 rounded-lg bg-rose-50/50 hover:bg-rose-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse" />
                  <div>
                    <p className="font-semibold text-slate-900">{gap.house_id.replace('house_', 'Casa ').replace('_', ' ')}</p>
                    <p className="text-sm text-slate-600">
                      {new Date(gap.date).toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-white border border-rose-200 rounded-md text-sm text-rose-700 font-medium">
                  {gap.coverage_type === 'caregiver_24h' ? 'Cuidadora 24h' : 'Asistente 8h'}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Tasa de Completitud</h3>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-bold text-indigo-600" data-testid="completion-rate">
              {stats?.completion_rate || 0}%
            </span>
            <span className="text-slate-500 mb-2">del mes</span>
          </div>
          <div className="mt-4 w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats?.completion_rate || 0}%` }}
            />
          </div>
        </Card>

        <Card className="p-6 border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Acciones Rápidas</h3>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/calendar'}
              data-testid="quick-calendar-btn"
              className="w-full justify-start bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Ir al Calendario
            </Button>
            <Button 
              onClick={() => window.location.href = '/staff'}
              data-testid="quick-staff-btn"
              className="w-full justify-start bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300"
            >
              <Users className="w-4 h-4 mr-2" />
              Ver Personal
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}