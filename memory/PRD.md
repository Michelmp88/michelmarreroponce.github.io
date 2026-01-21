# Sistema de Gestión de Coberturas - PRD

## Descripción del Producto
Aplicación web interna para gestionar la cobertura mensual 24/7 del personal de casas de cuidado infantil. Sistema basado en reglas con prioridades y restricciones estrictas.

## Stack Técnico
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Base de Datos**: MongoDB

## Funcionalidades Implementadas

### ✅ Core - Auto-Asignación Inteligente (P0) - COMPLETADO 21/01/2025
El algoritmo de auto-asignación ahora incluye:
1. **Prevención de doble reserva**: Verifica que un empleado NO esté asignado a otra casa el mismo día
2. **Control de horas diarias/mensuales**: Respeta `max_hours_daily` y `max_hours_monthly`
3. **Sistema de puntuación**: Clasifica candidatos por score (prioridad, preferencias, casa fija)
4. **Respeto de ausencias**: No asigna personal con ausencias registradas
5. **Jerarquía de prioridad**: Encargada → Rotativa → Jornalera (cuidadoras) / Mensual → Jornalera (asistentes)
6. **Parsing de preferencias**: Lee campo `notes` para preferencias (prefiere/evita casa, no fines de semana)

### ✅ CRUD Completo
- Gestión de casas (crear, editar, eliminar)
- Gestión de personal (crear, editar, eliminar)
- Gestión de ausencias (licencia, enfermedad, vacaciones, permiso)

### ✅ Vistas de Calendario
- Vista mensual con selector mes/año
- Filtros por casa y estado
- Exportación a PDF y Excel
- Botón "Auto" por casa para generar cobertura automática

### ✅ Sistema de Acceso
- Login básico (mock) con roles: Administrador / Operador
- Administrador: acceso completo CRUD
- Operador: solo lectura y asignación

### ✅ Tracking de Horas
- Vista de control de horas por empleado
- Horas trabajadas vs. límite mensual

## Endpoints API Principales
- `POST /api/coverage/auto-assign/{house_id}/{year}/{month}` - Auto-asignación inteligente
- `GET /api/coverage/{year}/{month}` - Obtener coberturas del mes
- `GET /api/coverage/gaps/{year}/{month}` - Ver huecos de cobertura
- `GET/POST/PUT/DELETE /api/staff` - CRUD personal
- `GET/POST/PUT/DELETE /api/houses` - CRUD casas
- `GET/POST/DELETE /api/absences` - Gestión ausencias
- `GET /api/staff/{id}/hours/{year}/{month}` - Horas trabajadas

## Esquema de Datos
- **houses**: `{house_id, name, caregivers_required, assistant_required, encargada_staff_id, notes}`
- **staff**: `{staff_id, name, staff_type, subtype, max_hours_daily, max_hours_monthly, hours_per_shift, priority, fixed_house_id, work_schedule, notes}`
- **coverage**: `{coverage_id, date, house_id, coverage_type, assigned_staff_id, assigned_staff_name, status}`
- **absences**: `{absence_id, staff_id, staff_name, start_date, end_date, absence_type, notes}`

## Tareas Pendientes

### P1 - Alta Prioridad
1. **Notificaciones Automáticas**: Avisar al personal cuando se le asigna un nuevo turno (requiere integración con servicio de email/SMS)
2. **Verificar edición de horas**: El usuario reportó problemas con "Control de Horas"

### P2 - Media Prioridad
1. **Backup Automático**: Sistema de respaldo y restauración de datos históricos

### Datos Legacy por Limpiar (Opcional)
- 31 double-bookings de Nellina (house_2 + house_4) - datos del algoritmo anterior
- 3 empleados sobre límite mensual - datos del algoritmo anterior

## Testing
- Test suite: `/app/tests/test_auto_assign.py` (16 tests)
- Reportes: `/app/test_reports/iteration_2.json`
- Cobertura: Endpoints básicos, auto-asignación, prevención de doble reserva, límites de horas, ausencias, jerarquía de prioridad

## Archivos de Referencia
- `backend/server.py` - API y lógica de negocio
- `frontend/src/pages/CalendarView.js` - Vista principal del calendario
- `frontend/src/pages/StaffManagement.js` - Gestión de personal
- `frontend/src/pages/HousesManagement.js` - Gestión de casas
