import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await axios.get(`${API}/staff`);
      setStaff(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Error al cargar personal');
    } finally {
      setLoading(false);
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
          <h3 className="font-bold text-slate-900 truncate">{member.name}</h3>
          <p className="text-sm text-slate-600">
            {getSubtypeLabel(member.subtype, member.staff_type)}
          </p>
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight" data-testid="staff-title">
          Gestión de Personal
        </h1>
        <p className="text-slate-500 mt-2">Personal disponible para asignación</p>
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
    </div>
  );
}