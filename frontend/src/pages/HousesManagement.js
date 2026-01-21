import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function HousesManagement() {
  const [houses, setHouses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingHouse, setEditingHouse] = useState(null);
  const [formData, setFormData] = useState({
    house_id: '',
    name: '',
    caregivers_required: 1,
    assistant_required: false,
    encargada_staff_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [housesRes, staffRes] = await Promise.all([
        axios.get(`${API}/houses`),
        axios.get(`${API}/staff`)
      ]);
      setHouses(housesRes.data);
      setStaff(staffRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (house = null) => {
    if (house) {
      setEditingHouse(house);
      setFormData({
        house_id: house.house_id,
        name: house.name,
        caregivers_required: house.caregivers_required,
        assistant_required: house.assistant_required,
        encargada_staff_id: house.encargada_staff_id || 'none',
        notes: house.notes || ''
      });
    } else {
      setEditingHouse(null);
      setFormData({
        house_id: '',
        name: '',
        caregivers_required: 1,
        assistant_required: false,
        encargada_staff_id: 'none',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleSaveHouse = async () => {
    if (!formData.name) {
      toast.error('El nombre de la casa es requerido');
      return;
    }

    if (!editingHouse && !formData.house_id) {
      formData.house_id = `house_${formData.name.toLowerCase().replace(/\s+/g, '_')}`;
    }

    const dataToSend = {
      ...formData,
      encargada_staff_id: formData.encargada_staff_id === 'none' ? null : formData.encargada_staff_id
    };

    try {
      if (editingHouse) {
        await axios.put(`${API}/houses/${formData.house_id}`, dataToSend);
        toast.success('Casa actualizada correctamente');
      } else {
        await axios.post(`${API}/houses`, dataToSend);
        toast.success('Casa creada correctamente');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving house:', error);
      toast.error('Error al guardar casa');
    }
  };

  const handleDeleteHouse = async (houseId, houseName) => {
    if (!window.confirm(`¿Estás seguro de eliminar ${houseName}?`)) return;

    try {
      await axios.delete(`${API}/houses/${houseId}`);
      toast.success('Casa eliminada correctamente');
      fetchData();
    } catch (error) {
      console.error('Error deleting house:', error);
      toast.error('Error al eliminar casa');
    }
  };

  const encargadas = staff.filter(s => s.staff_type === 'caregiver' && s.subtype === 'encargada');

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
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight" data-testid="houses-title">
            Gestión de Casas
          </h1>
          <p className="text-slate-500 mt-2">Configuración y reglas de las casas de cuidado</p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          data-testid="add-house-btn"
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Casa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {houses.map(house => (
          <Card key={house.house_id} className="p-6 border-slate-200 hover:shadow-lg transition-all" data-testid={`house-card-${house.house_id}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Home className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{house.name}</h3>
                  <p className="text-sm text-slate-500">{house.house_id}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleOpenModal(house)}
                  variant="outline"
                  size="sm"
                  className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                  data-testid={`edit-house-${house.house_id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleDeleteHouse(house.house_id, house.name)}
                  variant="outline"
                  size="sm"
                  className="text-rose-600 border-rose-300 hover:bg-rose-50"
                  data-testid={`delete-house-${house.house_id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Cuidadoras Requeridas</span>
                <span className="font-bold text-slate-900">{house.caregivers_required}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-600">Asistente Requerido</span>
                <span className="font-bold text-slate-900">{house.assistant_required ? 'Sí' : 'No'}</span>
              </div>

              {house.encargada_staff_id && (
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-xs text-indigo-600 mb-1">Encargada Asignada:</p>
                  <p className="font-semibold text-indigo-900">
                    {staff.find(s => s.staff_id === house.encargada_staff_id)?.name || 'N/A'}
                  </p>
                </div>
              )}

              {house.notes && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-600 mb-1">Notas:</p>
                  <p className="text-amber-900">{house.notes}</p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl" data-testid="house-modal">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900">
              {editingHouse ? 'Editar Casa' : 'Agregar Nueva Casa'}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Configura las reglas y requisitos de la casa
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Nombre de la Casa *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="Ej: Casa 2"
                data-testid="house-name-input"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Cuidadoras Requeridas *</label>
              <Select value={String(formData.caregivers_required)} onValueChange={(value) => setFormData({...formData, caregivers_required: parseInt(value)})}>
                <SelectTrigger data-testid="caregivers-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Cuidadora</SelectItem>
                  <SelectItem value="2">2 Cuidadoras</SelectItem>
                  <SelectItem value="3">3 Cuidadoras</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Asistente Requerido *</label>
              <Select value={String(formData.assistant_required)} onValueChange={(value) => setFormData({...formData, assistant_required: value === 'true'})}>
                <SelectTrigger data-testid="assistant-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sí</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Encargada Asignada</label>
              <Select value={formData.encargada_staff_id} onValueChange={(value) => setFormData({...formData, encargada_staff_id: value})}>
                <SelectTrigger data-testid="encargada-select">
                  <SelectValue placeholder="Seleccionar encargada (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna</SelectItem>
                  {encargadas.map(s => (
                    <SelectItem key={s.staff_id} value={s.staff_id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Notas / Reglas Especiales</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                rows={3}
                placeholder="Ej: Requiere personal con experiencia en cuidados especiales"
                data-testid="notes-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowModal(false)}
              variant="outline"
              data-testid="cancel-btn"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveHouse}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="save-house-btn"
            >
              {editingHouse ? 'Actualizar Casa' : 'Crear Casa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
