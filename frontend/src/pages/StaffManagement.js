import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserCheck, Calendar, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    staff_type: 'caregiver',
    subtype: 'encargada',
    work_days: '',
    rest_days: '',
    weekly_hours: '',
    fixed_house_id: '',
    work_schedule: '',
    notes: ''
  });

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
    if (!formData.name || !formData.staff_type || !formData.subtype) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    try {
      if (editingStaff) {
        const dataToSend = {
          staff_id: editingStaff.staff_id,
          name: formData.name,
          staff_type: formData.staff_type,
          subtype: formData.subtype,
          work_days: formData.work_days ? parseInt(formData.work_days) : null,
          rest_days: formData.rest_days ? parseInt(formData.rest_days) : null,
          weekly_hours: formData.weekly_hours ? parseInt(formData.weekly_hours) : null,
          fixed_house_id: formData.fixed_house_id || null,
          work_schedule: formData.work_schedule || null,
          notes: formData.notes || null
        };
        
        await axios.put(`${API}/staff/${editingStaff.staff_id}`, dataToSend);
        toast.success('Personal actualizado correctamente');
      } else {
        const staffId = `staff_${formData.name.toLowerCase().replace(/\s+/g, '_')}`;
        const dataToSend = {
          staff_id: staffId,
          name: formData.name,
          staff_type: formData.staff_type,
          subtype: formData.subtype,
          work_days: formData.work_days ? parseInt(formData.work_days) : null,
          rest_days: formData.rest_days ? parseInt(formData.rest_days) : null,
          weekly_hours: formData.weekly_hours ? parseInt(formData.weekly_hours) : null,
          fixed_house_id: formData.fixed_house_id || null,
          work_schedule: formData.work_schedule || null,
          notes: formData.notes || null
        };

        await axios.post(`${API}/staff`, dataToSend);
        toast.success('Personal agregado correctamente');
      }
      
      setShowAddModal(false);
      setEditingStaff(null);
      setFormData({
        name: '',
        staff_type: 'caregiver',
        subtype: 'encargada',
        work_days: '',
        rest_days: '',
        weekly_hours: '',
        fixed_house_id: '',
        work_schedule: '',
        notes: ''
      });
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
      staff_type: member.staff_type,
      subtype: member.subtype,
      work_days: member.work_days || '',
      rest_days: member.rest_days || '',
      weekly_hours: member.weekly_hours || '',
      fixed_house_id: member.fixed_house_id || '',
      work_schedule: member.work_schedule || '',
      notes: member.notes || ''
    });
    setShowAddModal(true);
  };

  const handleDeleteStaff = async (staffId, staffName) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${staffName}?`)) return;

    try {
      await axios.delete(`${API}/staff/${staffId}`);
      toast.success('Personal eliminado correctamente');
      fetchData();
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Error al eliminar personal');
    }
  };

  const caregivers = staff.filter(s => s.staff_type === 'caregiver');
  const assistants = staff.filter(s => s.staff_type === 'assistant');

  const encargadas = caregivers.filter(s => s.subtype === 'encargada');
  const rotativas = caregivers.filter(s => s.subtype === 'rotativa_mensual');
  const caregiverJornaleras = caregivers.filter(s => s.subtype === 'jornalera');

  const assistantsMensuales = assistants.filter(s => s.subtype === 'mensual');
  const assistantJornaleras = assistants.filter(s => s.subtype === 'jornalera');

  const getSubtypeLabel = (subtype, staffType) => {
    if (staffType === 'caregiver') {
      if (subtype === 'encargada') return 'Encargada';
      if (subtype === 'rotativa_mensual') return 'Rotativa Mensual';
      if (subtype === 'jornalera') return 'Jornalera';
    } else {
      if (subtype === 'mensual') return 'Mensual';
      if (subtype === 'jornalera') return 'Jornalera';
    }
    return subtype;
  };

  const StaffCard = ({ member }) => (
    <Card className="p-4 border-slate-200 hover:shadow-md transition-all duration-200" data-testid={`staff-card-${member.staff_id}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
          <UserCheck className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 truncate">{member.name}</h3>
              <p className="text-sm text-slate-600">
                {getSubtypeLabel(member.subtype, member.staff_type)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleEditStaff(member)}
                variant="outline"
                size="sm"
                className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                data-testid={`edit-staff-${member.staff_id}`}
              >
                <UserCheck className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleDeleteStaff(member.staff_id, member.name)}
                variant="outline"
                size="sm"
                className="text-rose-600 border-rose-300 hover:bg-rose-50 ml-2"
                data-testid={`delete-staff-${member.staff_id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {member.work_days && (
            <p className="text-xs text-slate-500 mt-1">
              {member.work_days} días trabajo
              {member.rest_days && ` / ${member.rest_days} días descanso`}
            </p>
          )}
          {member.weekly_hours && (
            <p className="text-xs text-slate-500 mt-1">
              {member.weekly_hours}h/semana
            </p>
          )}
          {member.fixed_house_id && (
            <p className="text-xs text-indigo-600 mt-1 font-medium">
              {member.fixed_house_id.replace('house_', 'Casa ').replace('_', ' ')}
            </p>
          )}
          {member.work_schedule && (
            <p className="text-xs text-slate-500 mt-1 italic">
              {member.work_schedule}
            </p>
          )}
          {member.notes && (
            <p className="text-xs text-amber-600 mt-1">
              {member.notes}
            </p>
          )}
        </div>
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
        <Button
          onClick={() => setShowAddModal(true)}
          data-testid="add-staff-btn"
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Personal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-indigo-600" />
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Cuidadoras</p>
              <p className="text-3xl font-bold text-slate-900" data-testid="total-caregivers">{caregivers.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Asistentes</p>
              <p className="text-3xl font-bold text-slate-900" data-testid="total-assistants">{assistants.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-rose-600" />
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider">Total</p>
              <p className="text-3xl font-bold text-slate-900" data-testid="total-staff">{staff.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Cuidadoras (Tías)</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Encargadas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {encargadas.map(member => (
                <StaffCard key={member.staff_id} member={member} />
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Rotativas Mensuales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rotativas.map(member => (
                <StaffCard key={member.staff_id} member={member} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Jornaleras</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caregiverJornaleras.map(member => (
                <StaffCard key={member.staff_id} member={member} />
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Asistentes</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Mensuales (40h/semana)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assistantsMensuales.map(member => (
                <StaffCard key={member.staff_id} member={member} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-3">Jornaleras (5 días / 2 descanso)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assistantJornaleras.map(member => (
                <StaffCard key={member.staff_id} member={member} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl" data-testid="add-staff-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">
              {editingStaff ? 'Editar Personal' : 'Agregar Personal'}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {editingStaff ? 'Modifica la información y reglas del personal' : 'Completa la información del nuevo miembro del personal'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
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

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Tipo *</label>
              <Select value={formData.staff_type} onValueChange={(value) => {
                setFormData({...formData, staff_type: value, subtype: value === 'caregiver' ? 'encargada' : 'mensual'});
              }}>
                <SelectTrigger data-testid="staff-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caregiver">Cuidadora</SelectItem>
                  <SelectItem value="assistant">Asistente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Subtipo *</label>
              <Select value={formData.subtype} onValueChange={(value) => setFormData({...formData, subtype: value})}>
                <SelectTrigger data-testid="subtype-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formData.staff_type === 'caregiver' ? (
                    <>
                      <SelectItem value="encargada">Encargada</SelectItem>
                      <SelectItem value="rotativa_mensual">Rotativa Mensual</SelectItem>
                      <SelectItem value="jornalera">Jornalera</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="jornalera">Jornalera</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Días de Trabajo</label>
              <input
                type="number"
                value={formData.work_days}
                onChange={(e) => setFormData({...formData, work_days: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="Ej: 20"
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
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Horas Semanales</label>
              <input
                type="number"
                value={formData.weekly_hours}
                onChange={(e) => setFormData({...formData, weekly_hours: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="Ej: 40"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Casa Asignada</label>
              <Select value={formData.fixed_house_id} onValueChange={(value) => setFormData({...formData, fixed_house_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Ninguna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ninguna</SelectItem>
                  {houses.map(house => (
                    <SelectItem key={house.house_id} value={house.house_id}>
                      {house.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Horario de Trabajo</label>
              <input
                type="text"
                value={formData.work_schedule}
                onChange={(e) => setFormData({...formData, work_schedule: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="Ej: Lunes a Viernes"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                rows={2}
                placeholder="Información adicional..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowAddModal(false)}
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
              Guardar Personal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
