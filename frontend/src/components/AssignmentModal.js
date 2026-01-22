import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Calendar, Home, AlertCircle, CalendarDays, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';

export default function AssignmentModal({ open, onClose, cell, staff, onComplete, year, month }) {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedPosition, setSelectedPosition] = useState(''); // 'caregiver' or 'assistant'
  const [applyMode, setApplyMode] = useState('single'); // single, all, alternate, week, biweekly
  const [alternateStart, setAlternateStart] = useState(1);
  const [alternateInterval, setAlternateInterval] = useState(2);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedBiweekly, setSelectedBiweekly] = useState('first'); // first or second
  const [loading, setLoading] = useState(false);
  const [absences, setAbsences] = useState([]);

  useEffect(() => {
    if (open && cell) {
      fetchAbsences();
      // Set initial position based on clicked cell
      setSelectedPosition(cell.coverageType === 'caregiver_24h' ? 'caregiver' : 'assistant');
      setSelectedStaff('');
      setApplyMode('single');
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

  // Calculate days in month
  const daysInMonth = useMemo(() => {
    if (!year || !month) return 31;
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // Get dates based on apply mode
  const getTargetDates = () => {
    if (!cell) return [];
    const baseDate = cell.date;
    const dates = [];
    
    switch (applyMode) {
      case 'single':
        return [baseDate];
      
      case 'all':
        for (let day = 1; day <= daysInMonth; day++) {
          dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        }
        return dates;
      
      case 'alternate':
        for (let day = alternateStart; day <= daysInMonth; day += alternateInterval) {
          dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        }
        return dates;
      
      case 'week':
        // Week 1: days 1-7, Week 2: days 8-14, etc.
        const weekStart = (selectedWeek - 1) * 7 + 1;
        const weekEnd = Math.min(selectedWeek * 7, daysInMonth);
        for (let day = weekStart; day <= weekEnd; day++) {
          dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        }
        return dates;
      
      case 'biweekly':
        const biweeklyStart = selectedBiweekly === 'first' ? 1 : 16;
        const biweeklyEnd = selectedBiweekly === 'first' ? 15 : daysInMonth;
        for (let day = biweeklyStart; day <= biweeklyEnd; day++) {
          dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        }
        return dates;
      
      default:
        return [baseDate];
    }
  };

  if (!cell) return null;

  const { house, date, coverageType, entry } = cell;

  const isStaffAvailable = (staffId, checkDate) => {
    return !absences.some(absence => {
      const isIndefinite = absence.is_indefinite;
      if (isIndefinite) {
        return absence.staff_id === staffId && absence.start_date <= checkDate;
      }
      return absence.staff_id === staffId &&
        absence.start_date <= checkDate &&
        absence.end_date >= checkDate;
    });
  };

  // Filter staff based on selected position
  const getAvailableStaff = () => {
    const checkDate = date;
    if (selectedPosition === 'caregiver') {
      return staff.filter(s => 
        (s.staff_type === 'caregiver' || s.staff_type === 'tia') && 
        isStaffAvailable(s.staff_id, checkDate)
      );
    } else {
      return staff.filter(s => 
        s.staff_type === 'assistant' && 
        isStaffAvailable(s.staff_id, checkDate)
      );
    }
  };

  const availableStaff = getAvailableStaff();

  // Group staff by subtype
  const encargadas = availableStaff.filter(s => s.subtype === 'encargada');
  const rotativas = availableStaff.filter(s => s.subtype === 'rotativa' || s.subtype === 'rotativa_mensual');
  const jornaleras = availableStaff.filter(s => s.subtype === 'jornalera');
  const educadoras = availableStaff.filter(s => s.subtype === 'educadora');
  const mensuales = availableStaff.filter(s => s.subtype === 'mensual');
  const otherStaff = availableStaff.filter(s => 
    !['encargada', 'rotativa', 'rotativa_mensual', 'jornalera', 'educadora', 'mensual'].includes(s.subtype)
  );

  const handleAssign = async () => {
    if (!selectedStaff) {
      toast.error('Por favor selecciona un miembro del personal');
      return;
    }

    const targetDates = getTargetDates();
    const coverageTypeToAssign = selectedPosition === 'caregiver' ? 'caregiver_24h' : 'assistant_8h';

    setLoading(true);
    try {
      // Use bulk-assign endpoint for multiple dates
      if (targetDates.length > 1) {
        const response = await axios.post(`${API}/coverage/bulk-assign/${house.house_id}`, {
          staff_id: selectedStaff,
          coverage_type: coverageTypeToAssign,
          dates: targetDates
        });
        toast.success(response.data.message || `Se asignó en ${targetDates.length} días`);
      } else {
        // Single assignment - update existing entry or find the correct one
        await axios.put(`${API}/coverage/${entry.coverage_id}`, {
          assigned_staff_id: selectedStaff
        });
        toast.success('Personal asignado correctamente');
      }
      onComplete();
    } catch (error) {
      console.error('Error assigning staff:', error);
      toast.error(error.response?.data?.detail || 'Error al asignar personal');
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

  const targetDatesCount = getTargetDates().length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="assignment-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900">
            Asignar Personal
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Asigna personal a esta cobertura. Puedes aplicar a uno o varios días.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* House and Date Info */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
              <Home className="w-4 h-4" />
              <span className="font-semibold">{house?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
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
          </div>

          {/* Current Assignment Info */}
          {entry?.assigned_staff_name && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-700 mb-1">Actualmente asignado:</p>
              <p className="font-bold text-emerald-900">{entry.assigned_staff_name}</p>
              <p className="text-xs text-emerald-600 mt-1">
                ({coverageType === 'caregiver_24h' ? 'Tía/Cuidadora' : 'Asistente'})
              </p>
            </div>
          )}

          {/* Position Selection */}
          <div className="border-t pt-4">
            <label className="text-sm font-semibold text-slate-700 mb-2 block">
              ¿Qué posición deseas asignar?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={selectedPosition === 'caregiver' ? 'default' : 'outline'}
                className={selectedPosition === 'caregiver' ? 'bg-indigo-600' : ''}
                onClick={() => {
                  setSelectedPosition('caregiver');
                  setSelectedStaff('');
                }}
              >
                Tía / Cuidadora
              </Button>
              <Button
                type="button"
                variant={selectedPosition === 'assistant' ? 'default' : 'outline'}
                className={selectedPosition === 'assistant' ? 'bg-purple-600' : ''}
                onClick={() => {
                  setSelectedPosition('assistant');
                  setSelectedStaff('');
                }}
              >
                Asistente
              </Button>
            </div>
          </div>

          {/* Staff Selection */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">
              Seleccionar Personal ({availableStaff.length} disponibles)
            </label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger data-testid="staff-select">
                <SelectValue placeholder="Selecciona un miembro del personal" />
              </SelectTrigger>
              <SelectContent>
                {selectedPosition === 'caregiver' && (
                  <>
                    {encargadas.length > 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50">
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
                        <div className="px-2 py-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider bg-blue-50">
                          Rotativas
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
                        <div className="px-2 py-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wider bg-amber-50">
                          Jornaleras
                        </div>
                        {jornaleras.map(s => (
                          <SelectItem key={s.staff_id} value={s.staff_id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </div>
                    )}
                    {educadoras.length > 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-emerald-600 uppercase tracking-wider bg-emerald-50">
                          Educadoras
                        </div>
                        {educadoras.map(s => (
                          <SelectItem key={s.staff_id} value={s.staff_id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </div>
                    )}
                    {otherStaff.length > 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">
                          Otras Tías
                        </div>
                        {otherStaff.map(s => (
                          <SelectItem key={s.staff_id} value={s.staff_id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {selectedPosition === 'assistant' && (
                  <>
                    {mensuales.length > 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-purple-600 uppercase tracking-wider bg-purple-50">
                          Mensuales
                        </div>
                        {mensuales.map(s => (
                          <SelectItem key={s.staff_id} value={s.staff_id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </div>
                    )}
                    {jornaleras.filter(s => s.staff_type === 'assistant').length > 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wider bg-amber-50">
                          Jornaleras
                        </div>
                        {jornaleras.filter(s => s.staff_type === 'assistant').map(s => (
                          <SelectItem key={s.staff_id} value={s.staff_id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </div>
                    )}
                    {/* Show all assistants if no category matches */}
                    {availableStaff.length > 0 && mensuales.length === 0 && (
                      <div>
                        <div className="px-2 py-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50">
                          Asistentes Disponibles
                        </div>
                        {availableStaff.map(s => (
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
                    No hay personal disponible para esta posición
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Apply Mode Selection */}
          <div className="border-t pt-4">
            <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              ¿A qué días aplicar esta asignación?
            </label>
            
            <div className="space-y-3">
              {/* Single Day */}
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="applyMode"
                  value="single"
                  checked={applyMode === 'single'}
                  onChange={() => setApplyMode('single')}
                  className="w-4 h-4 text-indigo-600"
                />
                <div>
                  <span className="font-medium text-slate-800">Solo este día</span>
                  <p className="text-xs text-slate-500">
                    {new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </label>

              {/* All Month */}
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="applyMode"
                  value="all"
                  checked={applyMode === 'all'}
                  onChange={() => setApplyMode('all')}
                  className="w-4 h-4 text-indigo-600"
                />
                <div>
                  <span className="font-medium text-slate-800">Todo el mes</span>
                  <p className="text-xs text-slate-500">{daysInMonth} días</p>
                </div>
              </label>

              {/* By Week */}
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="applyMode"
                  value="week"
                  checked={applyMode === 'week'}
                  onChange={() => setApplyMode('week')}
                  className="w-4 h-4 text-indigo-600"
                />
                <div className="flex-1">
                  <span className="font-medium text-slate-800">Por semana</span>
                  {applyMode === 'week' && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map(week => {
                        const weekStart = (week - 1) * 7 + 1;
                        const weekEnd = Math.min(week * 7, daysInMonth);
                        if (weekStart > daysInMonth) return null;
                        return (
                          <Button
                            key={week}
                            type="button"
                            size="sm"
                            variant={selectedWeek === week ? 'default' : 'outline'}
                            className={selectedWeek === week ? 'bg-indigo-600' : ''}
                            onClick={() => setSelectedWeek(week)}
                          >
                            Sem {week} ({weekStart}-{weekEnd})
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </label>

              {/* Biweekly */}
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="applyMode"
                  value="biweekly"
                  checked={applyMode === 'biweekly'}
                  onChange={() => setApplyMode('biweekly')}
                  className="w-4 h-4 text-indigo-600"
                />
                <div className="flex-1">
                  <span className="font-medium text-slate-800">Por quincena</span>
                  {applyMode === 'biweekly' && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedBiweekly === 'first' ? 'default' : 'outline'}
                        className={selectedBiweekly === 'first' ? 'bg-indigo-600' : ''}
                        onClick={() => setSelectedBiweekly('first')}
                      >
                        1ra Quincena (1-15)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedBiweekly === 'second' ? 'default' : 'outline'}
                        className={selectedBiweekly === 'second' ? 'bg-indigo-600' : ''}
                        onClick={() => setSelectedBiweekly('second')}
                      >
                        2da Quincena (16-{daysInMonth})
                      </Button>
                    </div>
                  )}
                </div>
              </label>

              {/* Alternate Days */}
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="applyMode"
                  value="alternate"
                  checked={applyMode === 'alternate'}
                  onChange={() => setApplyMode('alternate')}
                  className="w-4 h-4 text-indigo-600"
                />
                <div className="flex-1">
                  <span className="font-medium text-slate-800">Días alternos</span>
                  {applyMode === 'alternate' && (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">Empezar día:</span>
                        <input
                          type="number"
                          min="1"
                          max={daysInMonth}
                          value={alternateStart}
                          onChange={(e) => setAlternateStart(parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-sm border rounded"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">Cada:</span>
                        <select
                          value={alternateInterval}
                          onChange={(e) => setAlternateInterval(parseInt(e.target.value))}
                          className="px-2 py-1 text-sm border rounded"
                        >
                          <option value="2">2 días</option>
                          <option value="3">3 días</option>
                          <option value="4">4 días</option>
                          <option value="5">5 días</option>
                          <option value="7">7 días (semanal)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Summary */}
            {targetDatesCount > 1 && (
              <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-sm text-indigo-800">
                  <strong>Se aplicará a {targetDatesCount} días</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {entry?.assigned_staff_name && applyMode === 'single' && (
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
            {loading ? 'Asignando...' : `Asignar${targetDatesCount > 1 ? ` (${targetDatesCount} días)` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
