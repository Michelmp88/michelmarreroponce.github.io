import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Home, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [stats, setStats] = useState(null);
  const [coverage, setCoverage] = useState([]);
  const [houses, setHouses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    try {
      const [statsRes, coverageRes, housesRes, staffRes, absencesRes] = await Promise.all([
        axios.get(`${API}/stats/${year}/${month}`),
        axios.get(`${API}/coverage/${year}/${month}`),
        axios.get(`${API}/houses`),
        axios.get(`${API}/staff`),
        axios.get(`${API}/absences`)
      ]);
      setStats(statsRes.data);
      setCoverage(coverageRes.data);
      setHouses(housesRes.data);
      setStaff(staffRes.data);
      setAbsences(absencesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">Cargando métricas...</div>
      </div>
    );
  }

  // Métricas por casa
  const houseMetrics = houses.map(house => {
    const houseCoverage = coverage.filter(c => c.house_id === house.house_id);
    const complete = houseCoverage.filter(c => c.status === 'complete').length;
    const total = houseCoverage.length;
    return {
      name: house.name,
      completitud: total > 0 ? Math.round((complete / total) * 100) : 0,
      total,
      complete,
      incomplete: total - complete
    };
  });

  // Distribución de trabajo por personal
  const staffWorkload = staff.map(s => {
    const assignments = coverage.filter(c => c.assigned_staff_id === s.staff_id).length;
    return {
      name: s.name.split(' ').slice(0, 2).join(' '),
      assignments,
      type: s.staff_type === 'caregiver' ? 'Cuidadora' : 'Asistente'
    };
  }).filter(s => s.assignments > 0).sort((a, b) => b.assignments - a.assignments).slice(0, 10);

  // Ausencias activas
  const today = new Date().toISOString().split('T')[0];
  const activeAbsences = absences.filter(a => a.end_date >= today);
  const upcomingAbsences = absences.filter(a => {
    const daysUntil = Math.ceil((new Date(a.start_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 7;
  });

  // Datos para gráfico de pastel (estado general)
  const pieData = [
    { name: 'Completas', value: stats?.complete || 0, color: '#10B981' },
    { name: 'Incompletas', value: stats?.incomplete || 0, color: '#F43F5E' }
  ];

  // Distribución por tipo de cobertura
  const coverageTypeData = [
    {
      name: 'Cuidadoras',
      count: coverage.filter(c => c.coverage_type === 'caregiver_24h' && c.status === 'complete').length
    },
    {
      name: 'Asistentes',
      count: coverage.filter(c => c.coverage_type === 'assistant_8h' && c.status === 'complete').length
    }
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight" data-testid="reports-title">
              Métricas y Reportes
            </h1>
            <p className="text-slate-500 mt-2">Análisis de eficiencia operativa</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={String(month)} onValueChange={(value) => setMonth(parseInt(value))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(value) => setYear(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Tasa de Completitud</p>
              <p className="text-3xl font-bold text-slate-900">{stats?.completion_rate || 0}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Personal Activo</p>
              <p className="text-3xl font-bold text-slate-900">{staff.length - activeAbsences.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Ausencias Activas</p>
              <p className="text-3xl font-bold text-slate-900">{activeAbsences.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 rounded-lg">
              <Home className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Casas Gestionadas</p>
              <p className="text-3xl font-bold text-slate-900">{houses.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Alertas */}
      {(upcomingAbsences.length > 0 || stats?.incomplete > 50) && (
        <Card className="p-6 border-amber-200 bg-amber-50 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-900 mb-2">Notificaciones Importantes</h3>
              <ul className="space-y-2 text-sm text-amber-800">
                {upcomingAbsences.length > 0 && (
                  <li>
                    • <strong>{upcomingAbsences.length}</strong> ausencia(s) programada(s) en los próximos 7 días
                  </li>
                )}
                {stats?.incomplete > 50 && (
                  <li>
                    • <strong>{stats.incomplete}</strong> brechas de cobertura requieren atención urgente
                  </li>
                )}
                {stats?.completion_rate < 50 && (
                  <li>
                    • La tasa de completitud está por debajo del 50% - se recomienda acción inmediata
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Gráfico de Estado General */}
        <Card className="p-6 border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Estado General de Coberturas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribución por Tipo */}
        <Card className="p-6 border-slate-200">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Coberturas por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={coverageTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#4F46E5" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Completitud por Casa */}
      <Card className="p-6 border-slate-200 mb-8">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Tasa de Completitud por Casa</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={houseMetrics} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip />
            <Legend />
            <Bar dataKey="completitud" fill="#10B981" name="% Completitud" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Top 10 Personal Más Activo */}
      <Card className="p-6 border-slate-200">
        <h3 className="text-xl font-bold text-slate-900 mb-4">Top 10 Personal Más Activo</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={staffWorkload}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="assignments" fill="#4F46E5" name="Asignaciones" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
