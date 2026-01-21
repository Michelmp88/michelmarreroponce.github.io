import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Filter, Download, Sparkles, FileText, FileSpreadsheet, Trash2, RefreshCw } from 'lucide-react';
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
  const [resetType, setResetType] = useState(null); // 'house' | 'month'
  const [resetting, setResetting] = useState(false);

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
                <span>{house.name}</span>
                <Button
                  onClick={() => {
                    setSelectedHouse(house.house_id);
                    setShowAutoAssignModal(true);
                  }}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                  data-testid={`auto-assign-${house.house_id}`}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto
                </Button>
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
    </div>
  );
}