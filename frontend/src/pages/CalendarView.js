import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Filter, Download, Sparkles, FileText, FileSpreadsheet, Trash2, RefreshCw, Shuffle, Users } from 'lucide-react';
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

  const getCoverageForCell = (houseId, date, coverageType) => {
    return coverage.find(
      c => c.house_id === houseId && c.date === date && c.coverage_type === coverageType
    );
  };

  const handleCellClick = (house, date, coverageType) => {
    const entry = getCoverageForCell(house.house_id, date, coverageType);
    setSelectedCell({ house, date, coverageType, entry });
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

  const daysInMonth = getDaysInMonth(year, month);
      setResetting(false);
    }
  };

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filteredHouses = filterHouse === 'all' 
    ? houses 
    : houses.filter(h => h.house_id === filterHouse);

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

      <Card className="p-6 overflow-x-auto border-slate-200">
        <div className="calendar-grid">
          <div className="house-label" />
          {days.map(day => (
            <div key={day} className="text-center font-semibold text-slate-700 py-2">
              <div className="text-lg">{day}</div>
              <div className="text-xs text-slate-500">
                {new Date(year, month - 1, day).toLocaleDateString('es-ES', { weekday: 'short' })}
              </div>
            </div>
          ))}

          {filteredHouses.map(house => (
            <React.Fragment key={house.house_id}>
              <div className="house-label flex flex-col items-center justify-center font-bold text-slate-900 p-4 border border-slate-200 rounded-lg space-y-2">
                <span className="text-sm">{house.name}</span>
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
              {days.map(day => {
                const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const caregiverEntry = getCoverageForCell(house.house_id, date, 'caregiver_24h');
                const assistantEntry = house.assistant_required 
                  ? getCoverageForCell(house.house_id, date, 'assistant_8h')
                  : null;

                const shouldShow = filterStatus === 'all' ||
                  (filterStatus === 'complete' && caregiverEntry?.status === 'complete') ||
                  (filterStatus === 'incomplete' && caregiverEntry?.status === 'incomplete');

                if (!shouldShow) return <div key={day} className="min-h-[80px]" />;

                return (
                  <div key={day} className="space-y-2">
                    <div
                      onClick={() => handleCellClick(house, date, 'caregiver_24h')}
                      data-testid={`coverage-cell-${house.house_id}-${day}-caregiver`}
                      className={`coverage-cell p-3 border-2 rounded-lg cursor-pointer min-h-[80px] ${
                        caregiverEntry?.status === 'complete' ? 'status-complete' : 'status-incomplete'
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-700 mb-1">Cuidadora</div>
                      {caregiverEntry?.assigned_staff_name ? (
                        <div className="text-sm font-medium text-slate-900">
                          {caregiverEntry.assigned_staff_name.split(' ').slice(0, 2).join(' ')}
                        </div>
                      ) : (
                        <div className="text-xs text-rose-600 font-medium">Sin asignar</div>
                      )}
                    </div>

                    {assistantEntry && (
                      <div
                        onClick={() => handleCellClick(house, date, 'assistant_8h')}
                        data-testid={`coverage-cell-${house.house_id}-${day}-assistant`}
                        className={`coverage-cell p-2 border-2 rounded-lg cursor-pointer min-h-[60px] ${
                          assistantEntry?.status === 'complete' ? 'status-complete' : 'status-incomplete'
                        }`}
                      >
                        <div className="text-xs font-semibold text-slate-700 mb-1">Asist.</div>
                        {assistantEntry?.assigned_staff_name ? (
                          <div className="text-xs font-medium text-slate-900">
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
            </React.Fragment>
          ))}
        </div>
      </Card>

      {selectedCell && (
        <AssignmentModal
          open={!!selectedCell}
          onClose={() => setSelectedCell(null)}
          cell={selectedCell}
          staff={staff}
          onComplete={handleAssignmentComplete}
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
                Las entradas de cobertura quedarán en estado "incompleto" y podrás volver a asignar personal manualmente o con auto-asignación.
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
    </div>
  );
}