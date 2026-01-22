# Sistema de Gestión de Coberturas - PRD

## Descripción del Producto
Aplicación web interna para gestionar la cobertura mensual 24/7 del personal de casas de cuidado infantil. Sistema basado en reglas con prioridades y restricciones estrictas.

## Stack Técnico
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Base de Datos**: MongoDB

## Funcionalidades Implementadas

### ✅ Core - Auto-Asignación Inteligente (P0)
El algoritmo de auto-asignación incluye:
1. **Prevención de doble reserva**: Verifica que un empleado NO esté asignado a otra casa el mismo día
2. **Control de horas diarias/mensuales**: Respeta `max_hours_daily` y `max_hours_monthly`
3. **Sistema de puntuación**: Clasifica candidatos por score (prioridad, preferencias, casa fija)
4. **Respeto de ausencias**: No asigna personal con ausencias registradas
5. **Jerarquía de prioridad**: Encargada → Rotativa → Jornalera → Educadora
6. **Casas excluidas**: Respeta las casas que cada persona NO puede cubrir
7. **Casas preferidas**: Prioriza casas preferidas (#1, #2, #3)

### ✅ Funcionalidad de Limpieza/Reset
- Limpiar asignaciones de una casa específica
- Limpiar TODO un mes
- Limpiar asignaciones de un empleado específico

### ✅ Aleatorización de Posición (NUEVO)
- Regenerar aleatoriamente solo una posición (Tía o Asistente)
- Útil para cambiar asistentes manteniendo encargadas fijas

### ✅ Asignación Múltiple (NUEVO)
- Asignar una persona a varios días a la vez
- Selección rápida: Primeros 7 días, Primera/Segunda quincena, Días alternos
- Calendario interactivo para selección individual

### ✅ Gestión de Personal Mejorada (NUEVO)
- **Solo tipo "Tía"** con subtipos: Encargada, Jornalera, Educadora, Rotativa
- **Cálculo automático** de horas semanales/mensuales basado en días trabajo/descanso + horas por turno
- **Casa asignada** (fija) + 3 casas preferidas en orden de prioridad
- **Casas excluidas** que la persona NO puede cubrir
- **Horario específico** con selector de hora

### ✅ Gestión de Ausencias Mejorada (NUEVO)
- Modal de confirmación para eliminar ausencias
- Mensaje de "Reincorporación" cuando la persona vuelve a estar disponible

### ✅ CRUD Completo
- Gestión de casas (crear, editar, eliminar)
- Gestión de personal (crear, editar, eliminar)
- Gestión de ausencias (licencia, enfermedad, vacaciones, permiso)

### ✅ Vistas de Calendario
- Vista mensual con selector mes/año
- Filtros por casa y estado
- Exportación a PDF y Excel
- 4 botones por casa: Auto, Aleatorizar, Asignar Múltiple, Limpiar

### ✅ Control de Horas
- Vista de control de horas por empleado
- Horas trabajadas vs. límite mensual
- Indicadores visuales de límite excedido

## Endpoints API Principales

### Auto-Asignación y Control
- `POST /api/coverage/auto-assign/{house_id}/{year}/{month}` - Auto-asignación inteligente
- `POST /api/coverage/randomize-position/{house_id}/{year}/{month}/{position}` - Aleatorizar posición
- `POST /api/coverage/bulk-assign/{house_id}` - Asignación múltiple
- `DELETE /api/coverage/reset/{house_id}/{year}/{month}` - Limpiar casa
- `DELETE /api/coverage/reset-all/{year}/{month}` - Limpiar todo el mes

### CRUD
- `GET/POST/PUT/DELETE /api/staff` - CRUD personal
- `GET/POST/PUT/DELETE /api/houses` - CRUD casas
- `GET/POST/DELETE /api/absences` - Gestión ausencias

## Esquema de Datos Actualizado
- **staff**: `{staff_id, name, staff_type (tia), subtype (encargada/jornalera/educadora/rotativa), work_days, rest_days, hours_per_shift, weekly_hours (calculado), max_hours_monthly (calculado), fixed_house_id, excluded_houses[], preferred_house_1, preferred_house_2, preferred_house_3, specific_schedule, notes}`

## Tareas Completadas Esta Sesión
1. ✅ Eliminación de ausencias con modal de confirmación
2. ✅ Formulario de personal simplificado (solo Tía con subtipos)
3. ✅ **Cálculo automático CORREGIDO**: días trabajo × horas turno = horas mensuales (ej: 20 días × 24h = 480h)
4. ✅ Casas preferidas (#1, #2, #3) y casas excluidas
5. ✅ Horario específico con selector de hora y **botón "Limpiar"**
6. ✅ **Aleatorización corregida**: Asigna UNA MISMA persona a TODO el mes (no una diferente cada día)
7. ✅ Asignación múltiple (días consecutivos o alternos)
8. ✅ **Ausencias con fecha indefinida**: Opción para cuando no se sabe cuándo regresa la persona

## Correcciones Recientes (Enero 2025)

### ✅ Bug Fix: Aleatorización siempre seleccionaba a "Nellina"
- **Problema**: El endpoint `randomize-position` siempre seleccionaba la misma persona
- **Solución**: `random.choice(available_staff)` ahora funciona correctamente
- **Verificación**: 5 llamadas consecutivas retornaron 5 personas diferentes (Nellina, Silvia, Tatiana, Iliana, Leticia)

### ✅ Bug Fix: No se podía generar cobertura para casas sin datos previos
- **Problema**: Casas como "Casa Unión" no tenían entradas de cobertura
- **Solución**: Nuevo endpoint `POST /api/coverage/generate/{year}/{month}` para crear entradas vacías
- **Verificación**: Genera 713 entradas para las 12 casas (todos los días del mes × tipos de cobertura)

### ✅ Nueva Funcionalidad: Botón "Generar Cobertura del Mes"
- **Ubicación**: CalendarView.js
- **Comportamiento**: Aparece cuando `coverage.length === 0`
- **Acción**: Crea entradas de cobertura para todas las casas del mes seleccionado

## Tareas Pendientes
### P2 - Media Prioridad
1. **Backup Automático**: Sistema de respaldo y restauración de datos históricos
2. **Refactorización server.py**: Dividir en módulos usando APIRouter (actualmente > 800 líneas)
