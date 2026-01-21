import React from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, Home, AlertCircle, Users, UserX, BarChart3, Building2, LogOut, Shield, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

export default function Sidebar() {
  const { user, logout, hasPermission } = useAuth();
  
  const navItems = [
    { to: '/', icon: Home, label: 'Inicio', permission: 'view' },
    { to: '/calendar', icon: Calendar, label: 'Calendario', permission: 'view' },
    { to: '/gaps', icon: AlertCircle, label: 'Brechas', permission: 'view' },
    { to: '/staff', icon: Users, label: 'Personal', permission: 'manage_staff' },
    { to: '/houses', icon: Building2, label: 'Casas', permission: 'manage_houses' },
    { to: '/absences', icon: UserX, label: 'Ausencias', permission: 'manage_absences' },
    { to: '/hours', icon: Clock, label: 'Control Horas', permission: 'view_reports' },
    { to: '/reports', icon: BarChart3, label: 'Reportes', permission: 'view_reports' }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 sidebar-texture flex flex-col">
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Sistema de<br />Coberturas
        </h1>
        <p className="text-sm text-slate-500 mt-2">Gestión de casas de cuidado</p>
      </div>
      
      <nav className="px-4 space-y-2 flex-1">
        {navItems.map((item) => {
          const isAllowed = hasPermission(item.permission);
          if (!isAllowed && user?.role !== 'admin') return null;
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{user?.username}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Operador'}</p>
          </div>
        </div>
        <Button
          onClick={logout}
          variant="outline"
          className="w-full justify-start text-slate-600 border-slate-300"
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
}
