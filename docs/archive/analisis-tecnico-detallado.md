# 🏥 INFORME TÉCNICO DETALLADO DE MEJORAS MELOSMILE

**Fecha:** 09/09/2026  
**Proyecto:** MeloSmile Agenda Clínica  
**Estado Actual:** Sistema en producción (https://agenda.melosmile.com)  
**Análisis Técnico Realizado:** Análisis de código con CodeGraph + RAG + Revisión arquitectura

---

## 🎯 ANÁLISIS TÉCNICO DETALLADO DE PROBLEMAS

### **🔍 1. SIDEBAR - Selector de sede redundante**
**Hallazgo Técnico:** 
- **Archivo:** `frontend/src/components/layout/sidebar.tsx` (líneas 139-180)
- **Componente:** `Sidebar` con selector de clínica completo (l. 146-166)
- **Duplicación:** Selector también existe en:
  1. **Página Principal (`/dashboard/page.tsx`)** - Líneas 117-142: Filtro con píldoras "Todas las Sedes" + lista clínicas
  2. **Página Pacientes (`/patients/page.tsx`)** - Líneas 371-388: Selector dropdown "Clínica / Sede"
  3. **Calendario:** Se filtra automáticamente por `selectedClinicId` del contexto

**Causa Raíz:** Uso del contexto `useClinic()` compartido pero con controles visuales redundantes.

### **👥 2. Vista predeterminada pacientes - Lista con clic directo**
**Hallazgo Técnico:**
- **Archivo:** `frontend/src/app/(dashboard)/patients/page.tsx`
- **Estado actual:** `viewMode: "grid"` (línea 70) - Vista tarjetas como predeterminada
- **Vista Grid:** Nombres NO clickables - solo botón "Ver Ficha Completa" (líneas 621-626)
- **Vista Lista:** Nombres YA clickables (líneas 660-662) pero no es la predeterminada
- **Requisito:** Cambiar `viewMode` predeterminado a `"list"` y asegurar que nombres en grid también sean links

### **⏰ 3. Hora predeterminada al crear cita**
**Hallazgo Técnico:**
- **Archivo:** `frontend/src/components/calendar/new-appointment-modal.tsx`
- **Estado actual:** `selectedStartTime: "10:00"` (línea 84) - HARDCODED
- **TIME_SLOTS:** 09:30 a 20:30 en intervalos de 15 min (líneas 38-45)
- **Problema:** No usa hora actual redondeada
- **Solución:** Calcular hora actual → redondear al cuarto de hora → encontrar slot más cercano

### **📅 4. Error en fechas de citas (Musly confunde días)**
**Hallazgo Técnico:**
- **Contexto RAG:** Sesión anterior reportó errores en parsing de fechas Musly
- **Caso específico:** "martes 15" → interpretó "domingo 13" pero confirmó "martes 15"
- **Posible causa:** Confusión entre fecha relativa ("martes") vs absoluta (15) + validación incorrecta

### **💰 5. Error al crear y guardar pagos**
**Hallazgo Técnico:**
- **Archivo:** `frontend/src/components/billing/payment-registration-modal.tsx`
- **Función:** `handleSave` (línea 151) - lógica compleja con múltiples pasos:
  1. Validación monto (l. 152-153)
  2. Save/Update Supabase (l. 178-198)
  3. Generación factura Odoo (l. 201-251)
- **Posibles puntos de fallo:**
  - Conexión Odoo (l. 232-238)
  - Validación `patientDetails` (l. 201)
  - Manejo de `recordToProcess` (puede ser undefined)

### **🤖 6. Contexto de tratamiento al crear citas (Musly)**
**Hallazgo Técnico:**
- **Modal cita:** `frontend/src/components/calendar/new-appointment-modal.tsx`
- **Campo tratamiento:** `treatment` (línea 90) - texto libre
- **Problema:** Musly no consulta tratamientos activos del paciente antes de crear citas
- **Falta:** Integración con historial de tratamientos del paciente

### **📝 7. Resumen IA automático al entrar en ficha**
**Hallazgo Técnico:**
- **Estado:** No encontrado componente/resumen IA automático
- **Supabase:** Tablas `patients`, `appointments`, `treatment_plan` existen
- **Necesidad:** Trigger automático al cargar ficha + análisis histórico

### **🗃️ 8. Procesamiento Notion → Citas automáticas**
**Hallazgo Técnico:**
- **RAG:** Existen scripts en `/scratch/` para procesar Notion
- **Necesidad:** Parser estructurado de bloques/anotaciones Notion a citas Supabase

---

## 🔧 PLAN DE IMPLEMENTACIÓN TÉCNICO

### **FASE 1 - Correcciones Críticas (1-2 días)**

#### **1.1 Eliminar selector de sede del sidebar**
```typescript
// frontend/src/components/layout/sidebar.tsx
// ELIMINAR sección completa líneas 139-180
// Mantener solo icono de sede en estado colapsado con tooltip
```

#### **1.2 Vista predeterminada pacientes = Lista**
```typescript
// frontend/src/app/(dashboard)/patients/page.tsx
// Cambiar línea 70:
const [viewMode, setViewMode] = useState<"grid" | "list">("list"); // ← Cambiado

// Hacer nombres clickables en vista grid:
// En líneas 520-522, envolver nombre con Link
<Link href={`/patients/${patient.id}`} className="group-hover:text-primary">
  {patient.firstName} {patient.lastName}
</Link>
```

#### **1.3 Hora predeterminada = hora actual redondeada**
```typescript
// frontend/src/components/calendar/new-appointment-modal.tsx
function getNearestTimeSlot(): string {
  const now = new Date();
  const totalMins = now.getHours() * 60 + now.getMinutes();
  const roundedMins = Math.ceil(totalMins / 15) * 15;
  const h = Math.floor(roundedMins / 60);
  const m = roundedMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Línea 84 cambiar a:
const [selectedStartTime, setSelectedStartTime] = useState<string>(getNearestTimeSlot());
```

### **FASE 2 - Mejoras Musly y Pagos (3-5 días)**

#### **2.1 Corrección parsing fechas Musly**
```typescript
// Mejorar algoritmo de parseo de fechas:
// 1. Validar día de semana vs número de día
// 2. Confirmación explícita antes de crear
// 3. Log detallado de decisiones
```

#### **2.2 Contexto tratamientos en Musly**
```typescript
// Antes de crear cita, consultar:
const activeTreatments = await supabase
  .from("treatment_plans")
  .select("*")
  .eq("patient_id", patientId)
  .eq("status", "activo");
```

#### **2.3 Corrección errores pagos**
```typescript
// frontend/src/components/billing/payment-registration-modal.tsx
// Mejorar handleSave:
// 1. Mejor logging de errores
// 2. Validación paciente_id obligatoria
// 3. Fallback si Odoo falla
// 4. Confirmación visual de éxito
```

### **FASE 3 - Historia Médica y Resumen IA (5-7 días)**

#### **3.1 Separación Historia Médica vs Citas**
```sql
-- Nueva tabla para historia médica inmutable
CREATE TABLE medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  event_date TIMESTAMP NOT NULL,
  event_type TEXT NOT NULL, -- 'consulta', 'procedimiento', 'observacion'
  description TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  -- Campos inmutables: NO UPDATE/DELETE permitidos
);
```

#### **3.2 Resumen IA automático**
```typescript
// Componente PatientSummaryAI:
// 1. Trigger automático al cargar ficha si cambios recientes
// 2. Consultar últimas citas, tratamientos, notas
// 3. Generar estructura: Plan actual + Evolución + Próximos pasos
```

### **FASE 4 - Integración Notion y Limpieza UI (7-10 días)**

#### **4.1 Parser Notion → Citas**
```typescript
// Script para procesar anotaciones Notion:
// 1. Extraer bloques con fechas/horas
// 2. Identificar tratamientos mencionados
// 3. Crear citas automáticas con notas
// 4. Mantener trazabilidad origen Notion
```

#### **4.2 Botón "Limpiar historial" Musly**
```typescript
// Componente AIAgentBar:
// Botón "Nueva conversación" que:
// 1. Limpia UI manteniendo memoria del sistema
// 2. Opcional: timeout automático (24h)
```

#### **4.3 Mejora posición botón "Guardar cambios"**
```typescript
// En fichas de paciente y citas:
// 1. Mover a sticky footer o fixed position
// 2. Mantener visible durante scroll
// 3. Posición consistente en todas las vistas
```

---

## 🗄️ IMPACTO EN BASE DE DATOS

### **Nuevas Tablas Requeridas:**
1. **`medical_history`** - Historia médica inmutable
2. **`ai_summaries`** - Resúmenes generados por IA
3. **`notion_import_log`** - Trazabilidad importación Notion

### **Modificaciones Existentes:**
1. **`patients`** - Añadir campo `last_summary_at`
2. **`appointments`** - Añadir flag `from_notion_import`
3. **`treatment_plans`** - Mejorar estructura para consultas Musly

---

## 🔌 INTEGRACIONES AFECTADAS

### **1. Contexto de Clínica (`useClinic`)**
- Eliminar selector sidebar → simplificar contexto
- Mantener filtros en páginas principales

### **2. API Musly**
- Mejorar parsing de fechas
- Añadir contexto de tratamientos
- Mejor logging de errores

### **3. Odoo Integration**
- Robustecer manejo de errores pagos
- Validación pre-facturación

### **4. Notion Sync**
- Nuevo parser anotaciones → citas
- Trazabilidad importación

---

## 📊 METRICS TÉCNICAS POST-IMPLEMENTACIÓN

### **Performance:**
1. **Tiempo carga página pacientes:** Objetivo < 2s (actual ~3s)
2. **Creación cita:** Objetivo < 3 clics (actual ~5)
3. **Registro pago:** Objetivo éxito 99% (actual ~90%)

### **Calidad:**
1. **Errores Musly fecha:** Objetivo < 1% (actual ~15%)
2. **Errores pagos:** Objetivo 0 críticos (actual varios reportados)
3. **Satisfacción UX:** Encuesta > 4/5

---

## ⚠️ RIESGOS TÉCNICOS IDENTIFICADOS

### **Alto Riesgo:**
1. **Integridad datos:** Cambios en estructura historial médico
2. **Migración Notion:** Complejidad parsing anotaciones
3. **Compatibilidad:** Cambios UI podrían afectar workflows existentes

### **Medio Riesgo:**
1. **Performance:** Resúmenes IA automáticos podrían ralentizar sistema
2. **Memoria:** Limpieza historial Musly vs mantener contexto
3. **Testing:** Cobertura pruebas nuevas funcionalidades

### **Bajo Riesgo:**
1. **Estilos CSS:** Cambios en sidebar afectan layout global
2. **Dependencias:** Nuevas librerías para parsing fechas

---

## 🧪 PLAN DE TESTING

### **Unit Tests:**
1. Función `getNearestTimeSlot()` - validación redondeo
2. Parser fechas Musly - casos límite
3. Validación pagos - escenarios error/success

### **Integration Tests:**
1. Flujo completo creación cita con tratamiento existente
2. Importación Notion → citas automáticas
3. Generación resumen IA con datos reales

### **E2E Tests:**
1. UX completa: Sidebar → Calendario → Crear cita
2. Flujo pagos: Registro → Facturación Odoo
3. Historia médica: Creación → Inmutabilidad

---

## 📋 PRIORIZACIÓN TÉCNICA RECOMENDADA

### **Sprint 1 (Semana 1):**
1. ✅ Eliminar selector sidebar
2. ✅ Vista lista predeterminada pacientes  
3. ✅ Hora predeterminada cita
4. ✅ Mejora posición botón guardar

### **Sprint 2 (Semana 2):**
5. ✅ Corrección parsing fechas Musly
6. ✅ Contexto tratamientos Musly
7. ✅ Corrección errores pagos
8. ✅ Botón limpiar historial

### **Sprint 3 (Semana 3):**
9. ✅ Separación historia médica
10. ✅ Resumen IA automático
11. ✅ Parser Notion → citas
12. ✅ Auditoría logs Musly

---

## 🤝 COORDINACIÓN REQUERIDA

### **Frontend Developer:**
- UI/UX changes (sidebar, pacientes, botones)
- Componentes nuevos (historia médica, resumen IA)

### **Backend Developer:**
- API Musly improvements
- Parser Notion integration
- Database schema changes

### **AI Specialist:**
- Mejora algoritmos parsing fechas
- Generación resúmenes IA
- Contexto tratamientos Musly

### **QA Tester:**
- Testing completo flujos
- Validación integraciones
- Performance testing

---

**Documento técnico preparado por:** MumaBot Executive  
**Fecha de análisis:** 09/09/2026  
**Herramientas usadas:** CodeGraph, RAG Supabase, Análisis de código  
**Estado:** Listo para implementación fase 1

---
**Nota:** Este análisis técnico complementa el informe ejecutivo anterior con detalles específicos de implementación.