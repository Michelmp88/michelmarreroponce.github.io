import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Home } from 'lucide-react';
import { toast } from 'sonner';
import AssignmentModal from '@/components/AssignmentModal';

export default function GapsView() {
  const [gaps, setGaps] = useState([]);
  const [staff, setStaff] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [year] = useState(2025);
  const [month] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gapsRes, staffRes, housesRes] = await Promise.all([
        axios.get(`${API}/coverage/gaps/${year}/${month}`),
        axios.get(`${API}/staff`),
        axios.get(`${API}/houses`)
      ]);
      setGaps(gapsRes.data);
      setStaff(staffRes.data);
      setHouses(housesRes.data);
    } catch (error) {
      console.error('Error fetching gaps:', error);
      toast.error('Error al cargar brechas');
    } finally {
      setLoading(false);
    }
  };

  const handleGapClick = (gap) => {
    const house = houses.find(h => h.house_id === gap.house_id);
    setSelectedCell({
      house,
      date: gap.date,
      coverageType: gap.coverage_type,
      entry: gap
    });
  };

  const handleAssignmentComplete = () => {
    setSelectedCell(null);
    fetchData();
  };

  const groupedGaps = gaps.reduce((acc, gap) => {
    const houseName = gap.house_id.replace('house_', 'Casa ').replace('_', ' ');
    if (!acc[houseName]) {
      acc[houseName] = [];
    }
    acc[houseName].push(gap);
    return acc;
  }, {});

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
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight" data-testid="gaps-title">
          Brechas de Cobertura
        </h1>
        <p className="text-slate-500 mt-2">Coberturas incompletas que requieren atención</p>
      </div>

      {gaps.length === 0 ? (
        <Card className="p-12 text-center border-slate-200">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No hay brechas de cobertura</h3>
            <p className="text-slate-500 mb-6">
              Todas las coberturas del mes están completas. ¡Excelente trabajo!
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => window.location.href = '/'}
                data-testid="back-to-dashboard-btn"
                variant="outline"
                className="border-slate-300"
              >
                <Home className="w-4 h-4 mr-2" />
                Ir al Inicio
              </Button>
              <Button
                onClick={() => window.location.href = '/calendar'}
                data-testid="view-calendar-btn"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Ver Calendario
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-6 border-rose-200 bg-rose-50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
              <div>
                <p className="font-bold text-rose-900" data-testid="total-gaps">
                  {gaps.length} brechas de cobertura encontradas
                </p>
                <p className="text-sm text-rose-700">Haz clic en cualquier entrada para asignar personal</p>
              </div>
            </div>
          </Card>

          {Object.entries(groupedGaps).map(([houseName, houseGaps]) => (
            <Card key={houseName} className="p-6 border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-4">{houseName}</h2>
              <div className="space-y-3">
                {houseGaps.map((gap, idx) => (
                  <div
                    key={gap.coverage_id}
                    onClick={() => handleGapClick(gap)}
                    data-testid={`gap-${houseName}-${idx}`}
                    className="flex items-center justify-between p-4 border-2 border-rose-200 rounded-lg bg-white hover:bg-rose-50 cursor-pointer transition-all duration-200 hover:border-rose-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-rose-600 rounded-full animate-pulse" />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {new Date(gap.date).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-slate-600">
                          {gap.coverage_type === 'caregiver_24h' ? 'Cuidadora 24 horas' : 'Asistente 8 horas'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700"
                      data-testid={`assign-btn-${idx}`}
                    >
                      Asignar
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

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