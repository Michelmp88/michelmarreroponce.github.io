import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Calendar, Home, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AssignmentModal({ open, onClose, cell, staff, onComplete }) {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [loading, setLoading] = useState(false);
  const [absences, setAbsences] = useState([]);

  useEffect(() => {
    if (open && cell) {
      fetchAbsences();
    }
  }, [open, cell]);

  const fetchAbsences = async () => {
    try {
      const response = await axios.get(`${API}/absences`);
      setAbsences(response.data);
    } catch (error) {
      console.error('Error fetching absences:', error);
    }
  };

  if (!cell) return null;

  const { house, date, coverageType, entry } = cell;

  const isStaffAvailable = (staffId) => {
    return !absences.some(absence => 
      absence.staff_id === staffId &&
      absence.start_date <= date &&
      absence.end_date >= date
    );
  };

  const availableStaff = staff.filter(s => {
    if (coverageType === 'caregiver_24h') {
      return s.staff_type === 'caregiver' && isStaffAvailable(s.staff_id);
    } else {
      return s.staff_type === 'assistant' && isStaffAvailable(s.staff_id);
    }
  });

  const encargadas = availableStaff.filter(s => s.subtype === 'encargada');
  const rotativas = availableStaff.filter(s => s.subtype === 'rotativa_mensual');
  const jornaleras = availableStaff.filter(s => s.subtype === 'jornalera');
  const mensuales = availableStaff.filter(s => s.subtype === 'mensual');

  const handleAssign = async () => {
    if (!selectedStaff) {
      toast.error('Por favor selecciona un miembro del personal');
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API}/coverage/${entry.coverage_id}`, {
        assigned_staff_id: selectedStaff
      });
      toast.success('Personal asignado correctamente');
      onComplete();
    } catch (error) {
      console.error('Error assigning staff:', error);
      toast.error('Error al asignar personal');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/coverage/${entry.coverage_id}`, {
        assigned_staff_id: null
      });
      toast.success('Asignación eliminada');
      onComplete();
    } catch (error) {
      console.error('Error unassigning staff:', error);
      toast.error('Error al eliminar asignación');
    } finally {
      setLoading(false);
    }
  };

  const unavailableCount = staff.filter(s => {
    if (coverageType === 'caregiver_24h') {
      return s.staff_type === 'caregiver' && !isStaffAvailable(s.staff_id);
    } else {
      return s.staff_type === 'assistant' && !isStaffAvailable(s.staff_id);
    }
  }).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="assignment-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">
            Asignar Personal
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Selecciona un miembro del personal para asignar a esta cobertura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <Home className="w-4 h-4" />
              <span className="font-semibold">{house?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(date).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-semibold">
                {coverageType === 'caregiver_24h' ? 'Cuidadora 24 horas' : 'Asistente 8 horas'}
              </span>
            </div>
          </div>

          {entry?.assigned_staff_name && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-700 mb-1">Actualmente asignado:</p>
              <p className="font-bold text-emerald-900">{entry.assigned_staff_name}</p>
            </div>
          )}

          {unavailableCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>{unavailableCount}</strong> {unavailableCount === 1 ? 'persona' : 'personas'} no disponible{unavailableCount === 1 ? '' : 's'} por ausencias registradas
              </p>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">
              Seleccionar Personal Disponible
            </label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger data-testid="staff-select">
                <SelectValue placeholder="Selecciona un miembro del personal" />
              </SelectTrigger>
              <SelectContent>
                {coverageType === 'caregiver_24h' && (
                  <>
                    {encargadas.length > 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Encargadas
                        </div>
                        {encargadas.map(s => (
                          <SelectItem key={s.staff_id} value={s.staff_id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </div>
                    )}
                    {rotativas.length > 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Rotativas Mensuales
                        </div>
                        {rotativas.map(s => (
                          <SelectItem key={s.staff_id} value={s.staff_id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </div>
                    )}
                    {jornaleras.length > 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Jornaleras
                        </div>
                        {jornaleras.map(s => (
                          <SelectItem key={s.staff_id} value={s.staff_id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {coverageType === 'assistant_8h' && (
                  <>
                    {mensuales.length > 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Mensuales (40h/semana)
                        </div>
                        {mensuales.map(s => (
                          <SelectItem key={s.staff_id} value={s.staff_id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </div>
                    )}
                    {jornaleras.length > 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Jornaleras (5/2)
                        </div>
                        {jornaleras.map(s => (
                          <SelectItem key={s.staff_id} value={s.staff_id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {availableStaff.length === 0 && (
                  <div className="px-2 py-4 text-center text-sm text-slate-500">
                    No hay personal disponible para esta fecha
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {entry?.assigned_staff_name && (
            <Button
              onClick={handleUnassign}
              disabled={loading}
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-50"
              data-testid="unassign-btn"
            >
              Eliminar Asignación
            </Button>
          )}
          <Button
            onClick={onClose}
            disabled={loading}
            variant="outline"
            data-testid="cancel-btn"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={loading || !selectedStaff}
            className="bg-indigo-600 hover:bg-indigo-700"
            data-testid="assign-btn"
          >
            {loading ? 'Asignando...' : 'Asignar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}