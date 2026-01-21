import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, User } from 'lucide-react';

export default function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('operator');

  const handleLogin = () => {
    if (username.trim()) {
      login(username, role);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-8">
      <Card className="max-w-md w-full p-8 border-slate-200">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 text-center mb-2">
          Sistema de Coberturas
        </h1>
        <p className="text-slate-500 text-center mb-8">Ingresa para continuar</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Nombre de Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md"
                placeholder="Tu nombre"
                data-testid="username-input"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Rol</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger data-testid="role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="operator">Operador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            data-testid="login-btn"
          >
            Ingresar
          </Button>
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-600 mb-2"><strong>Administrador:</strong> Acceso completo (crear, editar, eliminar)</p>
          <p className="text-xs text-slate-600"><strong>Operador:</strong> Ver y asignar coberturas solamente</p>
        </div>
      </Card>
    </div>
  );
}
