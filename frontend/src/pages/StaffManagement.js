import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserCheck, Calendar, Plus, Trash2, AlertTriangle, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffManagement() {
  const { hasPermission } = useAuth();
  const [staff, setStaff] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  const initialFormData = {
    name: '',
    staff_type: 'tia',
    subtype: 'rotativa',
    work_days: '',
    rest_days: '',
    hours_per_shift: '',
    fixed_house_id: 'none',
    excluded_houses: [],
    preferred_house_1: 'none',
    preferred_house_2: 'none',
    preferred_house_3: 'none',
    specific_schedule: '',
    notes: ''
  };
  
  const [formData, setFormData] = useState(initialFormData);

  // Auto-calculate weekly and monthly hours
  // work_days = días de trabajo por mes (ej: 20)
  // rest_days = días de descanso por mes (ej: 10)
  // hours_per_shift = horas por turno (ej: 24)
  const calculatedHours = useMemo(() => {
    const workDays = parseInt(formData.work_days) || 0;
    const hoursPerShift = parseInt(formData.hours_per_shift) || 0;
    
    if (workDays > 0 && hoursPerShift > 0) {
      // Horas mensuales = días de trabajo × horas por turno
      const monthlyHours = workDays * hoursPerShift;
      // Horas semanales aproximadas (mes tiene ~4.3 semanas)
      const weeklyHours = Math.round(monthlyHours / 4.3);
      return { weeklyHours, monthlyHours };
    }
    return { weeklyHours: 0, monthlyHours: 0 };
  }, [formData.work_days, formData.hours_per_shift]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [staffRes, housesRes] = await Promise.all([
        axios.get(`${API}/staff`),
        axios.get(`${API}/houses`)
      ]);
      setStaff(staffRes.data);
      setHouses(housesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!formData.name || !formData.subtype) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    try {
      const staffData = {
        ...formData,
        staff_id: editingStaff?.staff_id || `staff_${formData.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
        staff_type: 'tia', // Always tia now
        work_days: formData.work_days ? parseInt(formData.work_days) : null,
        rest_days: formData.rest_days ? parseInt(formData.rest_days) : null,
        hours_per_shift: formData.hours_per_shift ? parseInt(formData.hours_per_shift) : null,
        weekly_hours: calculatedHours.weeklyHours || null,
        max_hours_monthly: calculatedHours.monthlyHours || null,
        fixed_house_id: formData.fixed_house_id === 'none' ? null : formData.fixed_house_id,
        excluded_houses: formData.excluded_houses.filter(h => h !== 'none'),
        preferred_house_1: formData.preferred_house_1 === 'none' ? null : formData.preferred_house_1,
        preferred_house_2: formData.preferred_house_2 === 'none' ? null : formData.preferred_house_2,
        preferred_house_3: formData.preferred_house_3 === 'none' ? null : formData.preferred_house_3,
        specific_schedule: formData.specific_schedule || null
      };

      if (editingStaff) {
        await axios.put(`${API}/staff/${editingStaff.staff_id}`, staffData);
        toast.success('Personal actualizado correctamente');
      } else {
        await axios.post(`${API}/staff`, staffData);
        toast.success('Personal agregado correctamente');
      }

      setShowAddModal(false);
      setEditingStaff(null);
      setFormData(initialFormData);
      fetchData();
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error('Error al guardar personal');
    }
  };

  const handleEditStaff = (member) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      staff_type: 'tia',
      subtype: member.subtype === 'rotativa_mensual' ? 'rotativa' : member.subtype,
      work_days: member.work_days || '',
      rest_days: member.rest_days || '',
      hours_per_shift: member.hours_per_shift || '',
      fixed_house_id: member.fixed_house_id || 'none',
      excluded_houses: member.excluded_houses || [],
      preferred_house_1: member.preferred_house_1 || 'none',
      preferred_house_2: member.preferred_house_2 || 'none',
      preferred_house_3: member.preferred_house_3 || 'none',
      specific_schedule: member.specific_schedule || '',
      notes: member.notes || ''
    });
    setShowAddModal(true);
  };

  const handleDeleteClick = (member) => {
    setStaffToDelete(member);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    
    setDeleting(true);
    try {
      await axios.delete(`${API}/staff/${staffToDelete.staff_id}`);
      toast.success(`${staffToDelete.name} eliminado correctamente`);
      setShowDeleteConfirm(false);
      setStaffToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Error al eliminar personal');
    } finally {
      setDeleting(false);
    }
  };

  const toggleExcludedHouse = (houseId) => {
    setFormData(prev => {
      const excluded = prev.excluded_houses || [];
      if (excluded.includes(houseId)) {
        return { ...prev, excluded_houses: excluded.filter(h => h !== houseId) };
      } else {
        return { ...prev, excluded_houses: [...excluded, houseId] };
      }
    });
  };

  // Group staff by subtype
  const tias = staff.filter(s => s.staff_type === 'caregiver' || s.staff_type === 'tia');
  const encargadas = tias.filter(s => s.subtype === 'encargada');
  const rotativas = tias.filter(s => s.subtype === 'rotativa_mensual' || s.subtype === 'rotativa');
  const jornaleras = tias.filter(s => s.subtype === 'jornalera');
  const educadoras = tias.filter(s => s.subtype === 'educadora');

  const getSubtypeLabel = (subtype) => {
    const labels = {
      'encargada': 'Encargada',
      'rotativa': 'Rotativa',
      'rotativa_mensual': 'Rotativa',
      'jornalera': 'Jornalera',
      'educadora': 'Educadora'
    };
    return labels[subtype] || subtype;
  };

  const StaffCard = ({ member }) => (
    <Card className="p-4 border-slate-200 hover:border-indigo-300 transition-colors" data-testid={`staff-card-${member.staff_id}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-bold text-slate-900">{member.name}</h4>
          <p className="text-sm text-slate-500">{getSubtypeLabel(member.subtype)}</p>
          {member.hours_per_shift && (
            <p className="text-xs text-slate-400 mt-1">{member.hours_per_shift}h/turno</p>
          )}
          {member.fixed_house_id && (
            <p className="text-xs text-indigo-600 mt-1">
              Casa fija: {houses.find(h => h.house_id === member.fixed_house_id)?.name || member.fixed_house_id}
            </p>
          )}
        </div>
        {hasPermission('manage_staff') && (
          <div className="flex gap-1">
            <Button
              onClick={() => handleEditStaff(member)}
              variant="outline"
              size="sm"
              className="text-slate-600 border-slate-300 hover:bg-slate-50"
              data-testid={`edit-staff-${member.staff_id}`}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => handleDeleteClick(member)}
              variant="outline"
              size="sm"
              className="text-rose-600 border-rose-300 hover:bg-rose-50"
              data-testid={`delete-staff-${member.staff_id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );

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
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight" data-testid="staff-title">
            Gestión de Personal
          </h1>
          <p className="text-slate-500 mt-2">Personal disponible para asignación</p>
        </div>
        {hasPermission('manage_staff') && (
          <Button
            onClick={() => {
              setEditingStaff(null);
              setFormData(initialFormData);
              setShowAddModal(true);
            }}
            data-testid="add-staff-btn"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Personal
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-indigo-600" />
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Tías</p>
              <p className="text-3xl font-bold text-slate-900" data-testid="total-tias">{tias.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Encargadas</p>
              <p className="text-3xl font-bold text-slate-900">{encargadas.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-amber-600" />
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Rotativas</p>
              <p className="text-3xl font-bold text-slate-900">{rotativas.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-rose-600" />
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Jornaleras</p>
              <p className="text-3xl font-bold text-slate-900">{jornaleras.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Encargadas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {encargadas.length > 0 ? encargadas.map(member => (
              <StaffCard key={member.staff_id} member={member} />
            )) : <p className="text-slate-400 italic">No hay encargadas registradas</p>}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Jornaleras</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jornaleras.length > 0 ? jornaleras.map(member => (
              <StaffCard key={member.staff_id} member={member} />
            )) : <p className="text-slate-400 italic">No hay jornaleras registradas</p>}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Educadoras</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {educadoras.length > 0 ? educadoras.map(member => (
              <StaffCard key={member.staff_id} member={member} />
            )) : <p className="text-slate-400 italic">No hay educadoras registradas</p>}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Rotativas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rotativas.length > 0 ? rotativas.map(member => (
              <StaffCard key={member.staff_id} member={member} />
            )) : <p className="text-slate-400 italic">No hay rotativas registradas</p>}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="add-staff-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">
              {editingStaff ? 'Editar Personal' : 'Agregar Personal'}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {editingStaff ? 'Modifica la información del personal' : 'Completa la información del nuevo miembro'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  placeholder="Ej: María González"
                  data-testid="name-input"
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Subtipo *</label>
                <Select value={formData.subtype} onValueChange={(value) => setFormData({...formData, subtype: value})}>
                  <SelectTrigger data-testid="subtype-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="encargada">Encargada</SelectItem>
                    <SelectItem value="jornalera">Jornalera</SelectItem>
                    <SelectItem value="educadora">Educadora</SelectItem>
                    <SelectItem value="rotativa">Rotativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Work Schedule */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-800 mb-3">Horario de Trabajo</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Días de Trabajo</label>
                  <input
                    type="number"
                    value={formData.work_days}
                    onChange={(e) => setFormData({...formData, work_days: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    placeholder="Ej: 20"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Días de Descanso</label>
                  <input
                    type="number"
                    value={formData.rest_days}
                    onChange={(e) => setFormData({...formData, rest_days: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    placeholder="Ej: 8"
                    min="0"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Horas por Turno *</label>
                  <input
                    type="number"
                    value={formData.hours_per_shift}
                    onChange={(e) => setFormData({...formData, hours_per_shift: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    placeholder="Ej: 24"
                    min="1"
                  />
                </div>
              </div>

              {/* Calculated Hours Display */}
              {calculatedHours.weeklyHours > 0 && (
                <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-sm text-indigo-800">
                    <strong>Cálculo automático:</strong> ~{calculatedHours.weeklyHours}h semanales / ~{calculatedHours.monthlyHours}h mensuales
                  </p>
                </div>
              )}

              <div className="mt-4">
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Horario Específico (opcional)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={formData.specific_schedule?.split('-')[0] || ''}
                    onChange={(e) => {
                      const end = formData.specific_schedule?.split('-')[1] || '';
                      setFormData({...formData, specific_schedule: `${e.target.value}-${end}`});
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-md"
                  />
                  <span className="text-slate-500">hasta</span>
                  <input
                    type="time"
                    value={formData.specific_schedule?.split('-')[1] || ''}
                    onChange={(e) => {
                      const start = formData.specific_schedule?.split('-')[0] || '';
                      setFormData({...formData, specific_schedule: `${start}-${e.target.value}`});
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-md"
                  />
                  {formData.specific_schedule && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({...formData, specific_schedule: ''})}
                      className="text-rose-600 border-rose-300 hover:bg-rose-50"
                    >
                      Limpiar
                    </Button>
                  )}
                  />
                </div>
              </div>
            </div>

            {/* House Assignments */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-800 mb-3">Asignación de Casas</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Casa Asignada (Fija)</label>
                  <Select value={formData.fixed_house_id} onValueChange={(value) => setFormData({...formData, fixed_house_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin asignación fija" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignación fija</SelectItem>
                      {houses.map(house => (
                        <SelectItem key={house.house_id} value={house.house_id}>{house.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Casa Preferida #1</label>
                  <Select value={formData.preferred_house_1} onValueChange={(value) => setFormData({...formData, preferred_house_1: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin preferencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin preferencia</SelectItem>
                      {houses.map(house => (
                        <SelectItem key={house.house_id} value={house.house_id}>{house.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Casa Preferida #2</label>
                  <Select value={formData.preferred_house_2} onValueChange={(value) => setFormData({...formData, preferred_house_2: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin preferencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin preferencia</SelectItem>
                      {houses.map(house => (
                        <SelectItem key={house.house_id} value={house.house_id}>{house.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Casa Preferida #3</label>
                  <Select value={formData.preferred_house_3} onValueChange={(value) => setFormData({...formData, preferred_house_3: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin preferencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin preferencia</SelectItem>
                      {houses.map(house => (
                        <SelectItem key={house.house_id} value={house.house_id}>{house.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Excluded Houses */}
              <div className="mt-4">
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Casas que NO puede cubrir</label>
                <div className="flex flex-wrap gap-2">
                  {houses.map(house => (
                    <button
                      key={house.house_id}
                      type="button"
                      onClick={() => toggleExcludedHouse(house.house_id)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        formData.excluded_houses?.includes(house.house_id)
                          ? 'bg-rose-100 border-rose-300 text-rose-700'
                          : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {house.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="border-t pt-4">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Notas (Opcional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                rows={3}
                placeholder="Información adicional, preferencias, restricciones..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowAddModal(false);
                setEditingStaff(null);
              }}
              variant="outline"
              data-testid="cancel-add-btn"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddStaff}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="save-staff-btn"
            >
              {editingStaff ? 'Actualizar Personal' : 'Guardar Personal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md" data-testid="delete-confirm-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              ¿Estás seguro de que quieres eliminar a <strong>{staffToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm text-rose-800">
                <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowDeleteConfirm(false);
                setStaffToDelete(null);
              }}
              variant="outline"
              disabled={deleting}
              data-testid="cancel-delete-btn"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700"
              data-testid="confirm-delete-btn"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
