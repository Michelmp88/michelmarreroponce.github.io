import React from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, Home, AlertCircle, Users, UserX, BarChart3, Building2 } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { to: '/', icon: Home, label: 'Inicio' },
    { to: '/calendar', icon: Calendar, label: 'Calendario' },
    { to: '/gaps', icon: AlertCircle, label: 'Brechas' },
    { to: '/staff', icon: Users, label: 'Personal' },
    { to: '/houses', icon: Building2, label: 'Casas' },
    { to: '/absences', icon: UserX, label: 'Ausencias' },
    { to: '/reports', icon: BarChart3, label: 'Reportes' }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 sidebar-texture">
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Sistema de<br />Coberturas
        </h1>
        <p className="text-sm text-slate-500 mt-2">Gestión de casas de cuidado</p>
      </div>
      
      <nav className="px-4 space-y-2">
        {navItems.map((item) => (
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
        ))}
      </nav>
    </aside>
  );
}