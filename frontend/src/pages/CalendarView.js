import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Filter, Download, Sparkles, FileText, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import AssignmentModal from '@/components/AssignmentModal';

export default function CalendarView() {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(1);
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
            <p className="text-slate-500 mt-2">
              {new Date(year, month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-4">
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
              <div className="house-label flex items-center justify-center font-bold text-slate-900 p-4 border border-slate-200 rounded-lg">
                {house.name}
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
    </div>
  );
}