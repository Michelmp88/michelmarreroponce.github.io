import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Filter, Download, Sparkles, FileText, FileSpreadsheet, Trash2, RefreshCw, Shuffle, Users, Plus } from 'lucide-react';
import { toast } from 'sonner';
import AssignmentModal from '@/components/AssignmentModal';

export default function CalendarView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [coverage, setCoverage] = useState([]);
  const [houses, setHouses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [filterHouse, setFilterHouse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetType, setResetType] = useState(null);
  const [resetting, setResetting] = useState(false);
  
  // New states for bulk assignment and randomize
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignData, setBulkAssignData] = useState({
    staff_id: '',
    coverage_type: 'caregiver_24h',
    selectedDates: []
  });
  const [showRandomizeModal, setShowRandomizeModal] = useState(false);
  const [randomizePosition, setRandomizePosition] = useState('caregiver');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    try {
      const [coverageRes, housesRes, staffRes] = await Promise.all([
        axios.get(`${API}/coverage/${year}/${month}`),
        axios.get(`${API}/houses`),
        axios.get(`${API}/staff`)
      ]);
      setCoverage(coverageRes.data);
      setHouses(housesRes.data);
      setStaff(staffRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const getCoverageForCell = (houseId, date, coverageType, shiftTime = null) => {
    return coverage.find(
      c => c.house_id === houseId && c.date === date && c.coverage_type === coverageType &&
           (shiftTime === null || c.shift_time === shiftTime)
    );
  };

  const getShiftCoveragesForDay = (houseId, date) => {
    // Get all caregiver coverages for this day (may include multiple shifts)
    return coverage.filter(
      c => c.house_id === houseId && c.date === date && c.coverage_type === 'caregiver_24h'
    );
  };

  const handleCellClick = (house, date, coverageType, shiftTime = null) => {
    const entry = getCoverageForCell(house.house_id, date, coverageType, shiftTime);
    setSelectedCell({ house, date, coverageType, entry, shiftTime });
  };

  const handleAssignmentComplete = async () => {
    setSelectedCell(null);
    setLoading(true);
    await fetchData();
    setLoading(false);
  };

  const changeMonth = (delta) => {
    let newMonth = month + delta;
    let newYear = year;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    
    setMonth(newMonth);
    setYear(newYear);
  };

  const handleAutoAssign = async () => {
    if (!selectedHouse) return;
    
    setAutoAssigning(true);
    try {
      const response = await axios.post(`${API}/coverage/auto-assign/${selectedHouse}/${year}/${month}`);
      toast.success(`Asignación completada: ${response.data.assignments_made} coberturas asignadas`);
      setShowAutoAssignModal(false);
      setSelectedHouse(null);
      await fetchData();
    } catch (error) {
      console.error('Error auto-assigning:', error);
      toast.error('Error al generar asignaciones automáticas');
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await axios.get(`${API}/coverage/export/${year}/${month}?format=${format}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `coberturas_${year}_${month}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Archivo ${format.toUpperCase()} descargado correctamente`);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar datos');
    }
  };

  const handleResetHouse = async () => {
    if (!selectedHouse) return;
    
    setResetting(true);
    try {
      const response = await axios.delete(`${API}/coverage/reset/${selectedHouse}/${year}/${month}`);
      toast.success(response.data.message);
      setShowResetModal(false);
      setSelectedHouse(null);
      setResetType(null);
      await fetchData();
    } catch (error) {
      console.error('Error resetting coverage:', error);
      toast.error('Error al limpiar asignaciones');
    } finally {
      setResetting(false);
    }
  };

  const handleResetMonth = async () => {
    setResetting(true);
    try {
      const response = await axios.delete(`${API}/coverage/reset-all/${year}/${month}`);
      toast.success(response.data.message);
      setShowResetModal(false);
      setResetType(null);
      await fetchData();
    } catch (error) {
      console.error('Error resetting all coverage:', error);
      toast.error('Error al limpiar asignaciones del mes');
    } finally {
      setResetting(false);
    }
  };

  const handleRandomizePosition = async () => {
    if (!selectedHouse) return;
    
    setAutoAssigning(true);
    try {
      const response = await axios.post(`${API}/coverage/randomize-position/${selectedHouse}/${year}/${month}/${randomizePosition}`);
      toast.success(response.data.message);
      setShowRandomizeModal(false);
      setSelectedHouse(null);
      await fetchData();
    } catch (error) {
      console.error('Error randomizing:', error);
      toast.error('Error al aleatorizar asignaciones');
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignData.staff_id || bulkAssignData.selectedDates.length === 0) {
      toast.error('Selecciona una persona y al menos un día');
      return;
    }
    
    setAutoAssigning(true);
    try {
      const response = await axios.post(`${API}/coverage/bulk-assign/${selectedHouse}`, {
        staff_id: bulkAssignData.staff_id,
        dates: bulkAssignData.selectedDates,
        coverage_type: bulkAssignData.coverage_type
      });
      toast.success(response.data.message);
      setShowBulkAssignModal(false);
      setBulkAssignData({ staff_id: '', coverage_type: 'caregiver_24h', selectedDates: [] });
      setSelectedHouse(null);
      await fetchData();
    } catch (error) {
      console.error('Error bulk assigning:', error);
      toast.error('Error al asignar múltiples días');
    } finally {
      setAutoAssigning(false);
    }
  };

  const toggleDateSelection = (date) => {
    setBulkAssignData(prev => {
      const dates = prev.selectedDates.includes(date)
        ? prev.selectedDates.filter(d => d !== date)
        : [...prev.selectedDates, date].sort();
      return { ...prev, selectedDates: dates };
    });
  };

  const selectConsecutiveDays = (startDay, count) => {
    const dates = [];
    for (let i = 0; i < count; i++) {
      const day = startDay + i;
      if (day <= daysInMonth) {
        dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      }
    }
    setBulkAssignData(prev => ({ ...prev, selectedDates: dates }));
  };

  const selectAlternateDays = (startDay, interval) => {
    const dates = [];
    for (let day = startDay; day <= daysInMonth; day += interval) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
    setBulkAssignData(prev => ({ ...prev, selectedDates: dates }));
  };

  const handleGenerateCoverage = async () => {
    setGenerating(true);
    try {
      const response = await axios.post(`${API}/coverage/generate/${year}/${month}`);
      toast.success(response.data.message);
      await fetchData();
    } catch (error) {
      console.error('Error generating coverage:', error);
      toast.error('Error al generar cobertura del mes');
    } finally {
      setGenerating(false);
    }
  };

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filteredHouses = filterHouse === 'all' 
    ? houses 
    : houses.filter(h => h.house_id === filterHouse);

  // Check if there's no coverage data for current month
  const hasCoverageData = coverage.length > 0;

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight" data-testid="calendar-title">
              Calendario de Coberturas
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <Select value={String(month)} onValueChange={(value) => setMonth(parseInt(value))}>
                <SelectTrigger className="w-40" data-testid="month-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(value) => setYear(parseInt(value))}>
                <SelectTrigger className="w-32" data-testid="year-select">
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

          <div className="flex items-center gap-3">
            <Button
              onClick={() => changeMonth(-1)}
              variant="outline"
              data-testid="prev-month-btn"
              className="border-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => changeMonth(1)}
              variant="outline"
              data-testid="next-month-btn"
              className="border-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-slate-500" />
            <Select value={filterHouse} onValueChange={setFilterHouse}>
              <SelectTrigger className="w-48" data-testid="filter-house">
                <SelectValue placeholder="Todas las casas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las casas</SelectItem>
                {houses.map(house => (
                  <SelectItem key={house.house_id} value={house.house_id}>
                    {house.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48" data-testid="filter-status">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="complete">Completas</SelectItem>
                <SelectItem value="incomplete">Incompletas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            {!hasCoverageData && (
              <Button
                onClick={handleGenerateCoverage}
                disabled={generating}
                data-testid="generate-coverage-btn"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {generating ? 'Generando...' : 'Generar Cobertura del Mes'}
              </Button>
            )}
            <Button
              onClick={() => {
                setResetType('month');
                setShowResetModal(true);
              }}
              variant="outline"
              data-testid="reset-month-btn"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Limpiar Mes
            </Button>
            <Button
              onClick={() => handleExport('excel')}
              variant="outline"
              data-testid="export-excel-btn"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              onClick={() => handleExport('pdf')}
              variant="outline"
              data-testid="export-pdf-btn"
              className="border-rose-300 text-rose-700 hover:bg-rose-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      {!hasCoverageData && (
        <Card className="p-8 border-amber-200 bg-amber-50 mb-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-amber-800 mb-2">No hay cobertura generada para este mes</h3>
            <p className="text-amber-700 mb-4">Haz clic en el botón para crear las entradas de cobertura para todas las casas.</p>
            <Button
              onClick={handleGenerateCoverage}
              disabled={generating}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {generating ? 'Generando...' : 'Generar Cobertura'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6 border-slate-200">
        <div className="flex">
          {/* Fixed left column with house names and buttons */}
          <div className="flex-shrink-0 border-r-2 border-slate-200 pr-4" style={{width: '200px'}}>
            <div className="h-16 mb-1" /> {/* Header spacer */}
            {filteredHouses.map(house => (
              <div key={`label-${house.house_id}`} className="flex flex-col items-center justify-center p-3 mb-1 bg-white border border-slate-200 rounded-lg" style={{minHeight: '120px'}}>
                <span className="text-sm font-bold text-slate-900 mb-2">{house.name}</span>
                <div className="flex flex-wrap gap-1 justify-center">
                  <Button
                    onClick={() => {
                      setSelectedHouse(house.house_id);
                      setShowAutoAssignModal(true);
                    }}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-xs px-2"
                    data-testid={`auto-assign-${house.house_id}`}
                    title="Auto-asignar"
                  >
                    <Sparkles className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedHouse(house.house_id);
                      setShowRandomizeModal(true);
                    }}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-xs px-2"
                    data-testid={`randomize-${house.house_id}`}
                    title="Aleatorizar posición"
                  >
                    <Shuffle className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedHouse(house.house_id);
                      setBulkAssignData({ staff_id: '', coverage_type: 'caregiver_24h', selectedDates: [] });
                      setShowBulkAssignModal(true);
                    }}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs px-2"
                    data-testid={`bulk-assign-${house.house_id}`}
                    title="Asignar múltiples días"
                  >
                    <Users className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedHouse(house.house_id);
                      setResetType('house');
                      setShowResetModal(true);
                    }}
                    size="sm"
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50 text-xs px-2"
                    data-testid={`reset-house-${house.house_id}`}
                    title="Limpiar"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable calendar grid */}
          <div className="flex-1 overflow-x-auto pl-4">
            <div className="calendar-days-grid">
              {/* Day headers */}
              <div className="flex mb-1">
                {days.map(day => (
                  <div key={day} className="flex-shrink-0 text-center font-semibold text-slate-700 py-2" style={{width: '85px'}}>
                    <div className="text-lg">{day}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(year, month - 1, day).toLocaleDateString('es-ES', { weekday: 'short' })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Coverage rows */}
              {filteredHouses.map(house => (
                <div key={`row-${house.house_id}`} className="flex mb-1" style={{minHeight: '120px'}}>
                  {days.map(day => {
                    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const shiftCoverages = getShiftCoveragesForDay(house.house_id, date);
                    const hasShifts = shiftCoverages.some(c => c.shift_time);
                    const assistantEntry = house.assistant_required 
                      ? getCoverageForCell(house.house_id, date, 'assistant_8h')
                      : null;

                    const allComplete = shiftCoverages.every(c => c.status === 'complete');
                    const anyIncomplete = shiftCoverages.some(c => c.status === 'incomplete');

                    const shouldShow = filterStatus === 'all' ||
                      (filterStatus === 'complete' && allComplete) ||
                      (filterStatus === 'incomplete' && anyIncomplete);

                    if (!shouldShow) return <div key={day} className="flex-shrink-0" style={{width: '85px', minHeight: '120px'}} />;

                    return (
                      <div key={day} className="flex-shrink-0 space-y-1 p-1" style={{width: '85px'}}>
                        {hasShifts ? (
                          shiftCoverages.filter(c => c.shift_time).map((shiftEntry, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleCellClick(house, date, 'caregiver_24h', shiftEntry.shift_time)}
                              data-testid={`coverage-cell-${house.house_id}-${day}-shift-${idx}`}
                              className={`coverage-cell p-2 border-2 rounded-lg cursor-pointer ${
                                shiftEntry?.status === 'complete' ? 'status-complete' : 'status-incomplete'
                              }`}
                            >
                              <div className="text-xs text-purple-600 font-semibold">
                                {shiftEntry.shift_time}
                              </div>
                              {shiftEntry?.assigned_staff_name ? (
                                <div className="text-xs font-medium text-slate-900 truncate">
                                  {shiftEntry.assigned_staff_name.split(' ')[0]}
                                </div>
                              ) : (
                                <div className="text-xs text-rose-600 font-medium">-</div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div
                            onClick={() => handleCellClick(house, date, 'caregiver_24h')}
                            data-testid={`coverage-cell-${house.house_id}-${day}-caregiver`}
                            className={`coverage-cell p-2 border-2 rounded-lg cursor-pointer ${
                              shiftCoverages[0]?.status === 'complete' ? 'status-complete' : 'status-incomplete'
                            }`}
                          >
                            <div className="text-xs font-semibold text-slate-700">Cuidadora</div>
                            {shiftCoverages[0]?.assigned_staff_name ? (
                              <div className="text-xs font-medium text-slate-900 truncate">
                                {shiftCoverages[0].assigned_staff_name.split(' ')[0]}
                              </div>
                            ) : (
                              <div className="text-xs text-rose-600 font-medium">Sin asignar</div>
                            )}
                          </div>
                        )}

                        {assistantEntry && (
                          <div
                            onClick={() => handleCellClick(house, date, 'assistant_8h')}
                            data-testid={`coverage-cell-${house.house_id}-${day}-assistant`}
                            className={`coverage-cell p-2 border-2 rounded-lg cursor-pointer ${
                              assistantEntry?.status === 'complete' ? 'status-complete' : 'status-incomplete'
                            }`}
                          >
                            <div className="text-xs font-semibold text-slate-700">Asist.</div>
                            {assistantEntry?.assigned_staff_name ? (
                              <div className="text-xs font-medium text-slate-900 truncate">
                                {assistantEntry.assigned_staff_name.split(' ')[0]}
                              </div>
                            ) : (
                              <div className="text-xs text-rose-600 font-medium">-</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {selectedCell && (
        <AssignmentModal
          open={!!selectedCell}
          onClose={() => setSelectedCell(null)}
          cell={selectedCell}
          staff={staff}
          onComplete={handleAssignmentComplete}
          year={year}
          month={month}
        />
      )}

      <Dialog open={showAutoAssignModal} onOpenChange={setShowAutoAssignModal}>
        <DialogContent className="max-w-md" data-testid="auto-assign-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Generar Cobertura Automática
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Se generarán asignaciones automáticas para todo el mes respetando las asignaciones existentes
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Importante:</strong> El sistema asignará personal siguiendo las reglas de prioridad 
                (Encargada → Rotativa → Jornalera) y verificando disponibilidad según ausencias registradas.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowAutoAssignModal(false)}
              variant="outline"
              disabled={autoAssigning}
              data-testid="cancel-auto-assign"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAutoAssign}
              disabled={autoAssigning}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="confirm-auto-assign"
            >
              {autoAssigning ? 'Generando...' : 'Generar Coberturas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className="max-w-md" data-testid="reset-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">
              {resetType === 'month' ? 'Limpiar Todo el Mes' : 'Limpiar Casa'}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {resetType === 'month' 
                ? `¿Estás seguro de que quieres limpiar TODAS las asignaciones de ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][month-1]} ${year}?`
                : `¿Estás seguro de que quieres limpiar las asignaciones de esta casa para ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][month-1]} ${year}?`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm text-rose-800">
                <strong>⚠️ Advertencia:</strong> Esta acción eliminará las asignaciones de personal. 
                Las entradas de cobertura quedarán en estado incompleto y podrás volver a asignar personal manualmente o con auto-asignación.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowResetModal(false);
                setResetType(null);
                setSelectedHouse(null);
              }}
              variant="outline"
              disabled={resetting}
              data-testid="cancel-reset"
            >
              Cancelar
            </Button>
            <Button
              onClick={resetType === 'month' ? handleResetMonth : handleResetHouse}
              disabled={resetting}
              className="bg-rose-600 hover:bg-rose-700"
              data-testid="confirm-reset"
            >
              {resetting ? 'Limpiando...' : 'Confirmar Limpieza'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Randomize Position Modal */}
      <Dialog open={showRandomizeModal} onOpenChange={setShowRandomizeModal}>
        <DialogContent className="max-w-md" data-testid="randomize-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Aleatorizar Posición
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Regenera aleatoriamente las asignaciones de una posición específica, manteniendo las demás intactas.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Posición a aleatorizar</label>
              <Select value={randomizePosition} onValueChange={setRandomizePosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caregiver">Tía (Cuidadora 24h)</SelectItem>
                  <SelectItem value="assistant">Asistente (8h)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>ℹ️ Nota:</strong> Esto reasignará aleatoriamente solo la posición seleccionada.
                Útil cuando quieres cambiar los asistentes manteniendo las encargadas fijas.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowRandomizeModal(false);
                setSelectedHouse(null);
              }}
              variant="outline"
              disabled={autoAssigning}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRandomizePosition}
              disabled={autoAssigning}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {autoAssigning ? 'Aleatorizando...' : 'Aleatorizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Modal */}
      <Dialog open={showBulkAssignModal} onOpenChange={setShowBulkAssignModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="bulk-assign-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Asignación Múltiple
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Asigna una persona a varios días a la vez (consecutivos o alternos)
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Personal</label>
                <Select value={bulkAssignData.staff_id} onValueChange={(value) => setBulkAssignData({...bulkAssignData, staff_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar persona" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map(s => (
                      <SelectItem key={s.staff_id} value={s.staff_id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Tipo de Cobertura</label>
                <Select value={bulkAssignData.coverage_type} onValueChange={(value) => setBulkAssignData({...bulkAssignData, coverage_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="caregiver_24h">Tía (24h)</SelectItem>
                    <SelectItem value="assistant_8h">Asistente (8h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Selección Rápida</label>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => selectConsecutiveDays(1, 7)}>Primeros 7 días</Button>
                <Button size="sm" variant="outline" onClick={() => selectConsecutiveDays(1, 15)}>Primera quincena</Button>
                <Button size="sm" variant="outline" onClick={() => selectConsecutiveDays(16, 15)}>Segunda quincena</Button>
                <Button size="sm" variant="outline" onClick={() => selectAlternateDays(1, 2)}>Días alternos (1, 3, 5...)</Button>
                <Button size="sm" variant="outline" onClick={() => selectAlternateDays(2, 2)}>Días alternos (2, 4, 6...)</Button>
                <Button size="sm" variant="outline" onClick={() => setBulkAssignData({...bulkAssignData, selectedDates: []})}>Limpiar selección</Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Días seleccionados ({bulkAssignData.selectedDates.length})
              </label>
              <div className="grid grid-cols-7 gap-1 p-3 bg-slate-50 rounded-lg">
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = bulkAssignData.selectedDates.includes(date);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDateSelection(date)}
                      className={`p-2 text-sm rounded transition-colors ${
                        isSelected 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-white border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowBulkAssignModal(false);
                setSelectedHouse(null);
                setBulkAssignData({ staff_id: '', coverage_type: 'caregiver_24h', selectedDates: [] });
              }}
              variant="outline"
              disabled={autoAssigning}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={autoAssigning || !bulkAssignData.staff_id || bulkAssignData.selectedDates.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {autoAssigning ? 'Asignando...' : `Asignar ${bulkAssignData.selectedDates.length} días`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}