import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, AlertTriangle, CheckCircle, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function HoursTrackingView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [staff, setStaff] = useState([]);
  const [hoursData, setHoursData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    max_hours_daily: '',
    max_hours_monthly: '',
    hours_per_shift: ''
  });

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    try {
      const staffRes = await axios.get(`${API}/staff`);
      setStaff(staffRes.data);

      const hoursPromises = staffRes.data.map(s =>
        axios.get(`${API}/staff/${s.staff_id}/hours/${year}/${month}`)
          .catch(err => ({ data: null }))
      );

      const hoursResults = await Promise.all(hoursPromises);
      const validHours = hoursResults
        .filter(r => r.data)
        .map(r => r.data)
        .filter(h => h.total_hours > 0);

      setHoursData(validHours);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos de horas');
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
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight" data-testid="hours-title">
              Control de Horas Trabajadas
            </h1>
            <p className="text-slate-500 mt-2">Monitoreo de límites y descansos del personal</p>
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

      {hoursData.length === 0 ? (
        <Card className="p-12 text-center border-slate-200">
          <div className="max-w-md mx-auto">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">No hay registros de horas</h3>
            <p className="text-slate-500">
              No hay personal con horas asignadas en este período
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hoursData.map(data => (
            <Card
              key={data.staff_id}
              className={`p-6 border-2 ${
                data.is_over_limit
                  ? 'border-rose-300 bg-rose-50'
                  : data.remaining_hours < 20
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-slate-200'
              }`}
              data-testid={`hours-card-${data.staff_id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{data.staff_name}</h3>
                  <p className="text-sm text-slate-600">{data.period}</p>
                </div>
                <div className={`p-2 rounded-lg ${
                  data.is_over_limit
                    ? 'bg-rose-100'
                    : data.remaining_hours < 20
                    ? 'bg-amber-100'
                    : 'bg-emerald-100'
                }`}>
                  {data.is_over_limit ? (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm text-slate-600">Horas Trabajadas</span>
                  <span className="text-lg font-bold text-slate-900">{data.total_hours}h</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm text-slate-600">Días Trabajados</span>
                  <span className="text-lg font-bold text-slate-900">{data.days_worked}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm text-slate-600">Máximo Mensual</span>
                  <span className="text-lg font-bold text-slate-900">{data.max_hours_monthly}h</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm text-slate-600">Horas Restantes</span>
                  <span className={`text-lg font-bold ${
                    data.is_over_limit ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {data.remaining_hours}h
                  </span>
                </div>

                {data.is_over_limit && (
                  <div className="p-3 bg-rose-100 border border-rose-300 rounded-lg">
                    <p className="text-xs text-rose-800 font-medium">
                      ⚠️ EXCEDE LÍMITE MENSUAL
                    </p>
                  </div>
                )}

                {!data.is_over_limit && data.remaining_hours < 20 && (
                  <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg">
                    <p className="text-xs text-amber-800 font-medium">
                      ⚠️ Cerca del límite mensual
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
