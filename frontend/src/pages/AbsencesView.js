import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Plus, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AbsencesView() {
  const [absences, setAbsences] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [absenceToDelete, setAbsenceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: '',
    start_date: '',
    end_date: '',
    absence_type: 'licencia',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [absencesRes, staffRes] = await Promise.all([
        axios.get(`${API}/absences`),
        axios.get(`${API}/staff`)
      ]);
      setAbsences(absencesRes.data);
      setStaff(staffRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar ausencias');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAbsence = async () => {
    if (!formData.staff_id || !formData.start_date || !formData.end_date) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      await axios.post(`${API}/absences`, formData);
      toast.success('Ausencia registrada correctamente');
      setShowAddModal(false);
      setFormData({
        staff_id: '',
        start_date: '',
        end_date: '',
        absence_type: 'licencia',
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error adding absence:', error);
      toast.error('Error al registrar ausencia');
    }
  };

  const handleDeleteAbsence = async (absenceId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta ausencia?')) return;

    try {
      await axios.delete(`${API}/absences/${absenceId}`);
      toast.success('Ausencia eliminada');
      fetchData();
    } catch (error) {
      console.error('Error deleting absence:', error);
      toast.error('Error al eliminar ausencia');
    }
  };

  const getAbsenceTypeLabel = (type) => {
    const labels = {
      licencia: 'Licencia',
      enfermedad: 'Enfermedad',
      vacaciones: 'Vacaciones',
      permiso: 'Permiso',
      otro: 'Otro'
    };
    return labels[type] || type;
  };

  const getAbsenceTypeColor = (type) => {
    const colors = {
      licencia: 'bg-blue-100 text-blue-700 border-blue-200',
      enfermedad: 'bg-rose-100 text-rose-700 border-rose-200',
      vacaciones: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      permiso: 'bg-amber-100 text-amber-700 border-amber-200',
      otro: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return colors[type] || colors.otro;
  };

  const activeAbsences = absences.filter(a => {
    const today = new Date().toISOString().split('T')[0];
    return a.end_date >= today;
  });

  const pastAbsences = absences.filter(a => {
    const today = new Date().toISOString().split('T')[0];
    return a.end_date < today;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight" data-testid="absences-title">
            Gestión de Ausencias
          </h1>
          <p className="text-slate-500 mt-2">Control de licencias, enfermedades y permisos del personal</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          data-testid="add-absence-btn"
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar Ausencia
        </Button>
      </div>

      {activeAbsences.length === 0 && pastAbsences.length === 0 ? (
        <Card className="p-12 text-center border-slate-200">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No hay ausencias registradas</h3>
            <p className="text-slate-500 mb-6">
              Registra licencias, enfermedades o vacaciones del personal para un mejor control.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeAbsences.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Ausencias Activas y Futuras</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeAbsences.map(absence => (
                  <Card key={absence.absence_id} className="p-6 border-slate-200" data-testid={`absence-card-${absence.absence_id}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{absence.staff_name}</h3>
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 border ${getAbsenceTypeColor(absence.absence_type)}`}>
                          {getAbsenceTypeLabel(absence.absence_type)}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDeleteAbsence(absence.absence_id)}
                        variant="outline"
                        size="sm"
                        className="text-rose-600 border-rose-300 hover:bg-rose-50"
                        data-testid={`delete-absence-${absence.absence_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        <span>
                          {new Date(absence.start_date).toLocaleDateString('es-ES')} -{' '}
                          {new Date(absence.end_date).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      {absence.notes && (
                        <p className="text-slate-500 italic">{absence.notes}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pastAbsences.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Ausencias Pasadas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastAbsences.map(absence => (
                  <Card key={absence.absence_id} className="p-6 border-slate-200 opacity-60">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{absence.staff_name}</h3>
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 border ${getAbsenceTypeColor(absence.absence_type)}`}>
                          {getAbsenceTypeLabel(absence.absence_type)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        <span>
                          {new Date(absence.start_date).toLocaleDateString('es-ES')} -{' '}
                          {new Date(absence.end_date).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md" data-testid="add-absence-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">
              Registrar Ausencia
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Completa la información de la ausencia del personal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Personal</label>
              <Select value={formData.staff_id} onValueChange={(value) => setFormData({...formData, staff_id: value})}>
                <SelectTrigger data-testid="staff-select">
                  <SelectValue placeholder="Selecciona un miembro del personal" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.staff_id} value={s.staff_id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Tipo de Ausencia</label>
              <Select value={formData.absence_type} onValueChange={(value) => setFormData({...formData, absence_type: value})}>
                <SelectTrigger data-testid="absence-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="licencia">Licencia</SelectItem>
                  <SelectItem value="enfermedad">Enfermedad</SelectItem>
                  <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  <SelectItem value="permiso">Permiso</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Fecha Inicio</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  data-testid="start-date-input"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Fecha Fin</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  data-testid="end-date-input"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Notas (Opcional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                rows={3}
                placeholder="Información adicional..."
                data-testid="notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowAddModal(false)}
              variant="outline"
              data-testid="cancel-btn"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddAbsence}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="save-absence-btn"
            >
              Guardar Ausencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}