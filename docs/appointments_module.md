# Documentación del Módulo de Gestión de Citas v2.5 — Melosmile

Este documento detalla la arquitectura, modelos de datos, flujos de trabajo e integraciones IA desarrolladas para la **ficha de gestión de cada cita** (`/appointments/[id]`) y su vínculo con la historia del paciente en Melosmile.

---

## 1. Vistas y Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard principal con calendario de citas y filtro dinámico de clínicas |
| `/appointments/[id]` | Ficha completa de gestión clínica, financiera, odontograma y multimedia de la cita |
| `/patients/[id]` | Ficha histórica del paciente con odontograma general e inteligencia clínica IA |

---

## 2. Ficha de Gestión de Cita (`/appointments/[id]`)

### 2.1 Estructura del Layout

La pantalla está dividida en dos columnas principales optimizadas para la operativa de la doctora:

```
┌─────────────────────────────────────────┐  ┌─────────────────────────────────────┐
│  COLUMNA PRINCIPAL (2/3)                │  │  COLUMNA LATERAL (1/3)              │
│                                         │  │                                     │
│  [1. Cabecera Notion con Avatar/Estado] │  │  [$] Contabilidad & Odoo            │
│  [2. Banner Alerta Médica Anamnesis]    │  │      (Colapsable, aparece ARRIBA    │
│  [3. Banner Cita Sugerida IA]           │  │       al hacer clic en $)           │
│  [4. Tratamientos & Procedimientos]     │  │                                     │
│  [5. Evolución Clínica & Medicación]    │  │  [Odontograma Interactivo FDI]      │
│  [6. Registro Fotográfico VPS]          │  │      (Permanente / Leche menores)    │
│  [7. Documentos Vectorizados n8n]       │  │                                     │
└─────────────────────────────────────────┘  └─────────────────────────────────────┘
```

---

## 3. Funcionalidades Detalladas

### 3.1 Cabecera & Selector de Estado
- Banner superior con avatar del paciente, nombre completo, identificador de historia (`PAC-###`), fecha/hora de la cita, clínica y profesional asignado.
- **Selector de Estado**: `Pendiente`, `Confirmada`, `En Proceso`, `Realizada (Completada)`, `Cancelada`, `No Presentado`.
- Botón **`$ Contabilidad`**: Alterna la visibilidad del panel financiero en la columna derecha (ubicándose **encima** del odontograma cuando está activo).
- Botón **`Guardar Ficha`**: Guarda en una sola transacción las notas clínica, procedimientos, estado y datos financieros.

### 3.2 Alerta Médica de Anamnesis
- Banner visual en tono ámbar que detecta automáticamente si el paciente tiene registradas **alergias**, **antecedentes médicos** o **medicación habitual** en su perfil.
- Permite a la doctora consultar alergias o condiciones preexistentes antes de iniciar la intervención sin salir de la cita.

### 3.3 Multi-Procedimiento por Sesión & Gestión de Precios

Cada cita puede contener **múltiples procedimientos**:
- **Carga desde Catálogo**: El selector consulta los servicios activos en `treatments`. Carga los precios por defecto (`default_price`), porcentaje de comisión de sede y gasto de laboratorio sin exponerlos en abierto.
- **Modificación Local por Cita (`⚙️ Modificar valores`)**:
  - Al pulsar, despliega un panel inline para ajustar el **Precio (€)**, **% Comisión Sede** y **Gasto Lab (€)** de ese procedimiento específico en esa cita.
  - Estos cambios son **locales a la cita** (se almacenan en `billing_records`), garantizando que la tabla maestra de `treatments` no sea alterada.
- Botón **`+ Añadir procedimiento`**: Agrega filas ilimitadas por cita.

### 3.4 Calculadora Financiera & Rentabilidad Colapsable ($)
- Al pulsar el botón **`$`**, el panel de contabilidad se posiciona **en la parte superior de la columna derecha**.
- **Totales Automáticos**: Suma los importes de todos los procedimientos de la cita:
  ```
  Total Procedimientos = ∑ Precio_Procedimiento
  Total Laboratorio    = ∑ Gasto_Lab
  Neto Calculado       = ∑ (Precio × %Comisión) − (Gasto_Lab × %Descuento_Lab)
  Margen (%)           = (Neto / Total_Procedimientos) × 100
  ```
- **Badges de Rentabilidad**:
  - 🟢 **Rentable** — Margen ≥ 15%
  - 🟡 **⚠️ Margen Bajo** — Margen < 15%
  - 🔴 **⚠️ Tratamiento en Pérdida** — Neto negativo (alerta roja)
- Acciones: Botón `Registrar Pago de esta Cita` (modal reutilizable) y `Generar Factura en Odoo`.

### 3.5 Odontograma Interactivo (FDI)
- Ubicado en la columna derecha.
- **Dentición según Edad**:
  - Pacientes adultos (≥ 18 años): Muestra dentición permanente (cuadrantes 1, 2, 3, 4 / piezas 11–48).
  - Pacientes menores (< 18 años): Activa el selector `Permanente / Leche` (cuadrantes 5, 6, 7, 8 / piezas 51–85).
- **7 Estados Clínicos**: *Sano / Sin Tratar, En Tratamiento (rojo), Tratado (verde), Extracción (negro), Implante (azul), Corona / Prótesis (ámbar), Endodoncia (violeta)*.
- Los datos se serializan en `appointments.notes` mediante la etiqueta `[Odontograma: JSON]`.

### 3.6 Registro Fotográfico en VPS (Imágenes sin Vectorizar)
- Apartado dedicado **"Registro Fotográfico"** para imágenes clínicas (`jpg`, `png`, `webp`, `gif`).
- Los archivos se almacenan físicamente en el servidor VPS en la ruta:
  `/opt/melosmile/pacientes/{patientId}/registros/{YYYY-MM-DD}/{filename}`
- **Filtro de Rendimiento**: Las imágenes **no se envían a vectorizar** a n8n, ahorrando recursos de procesamiento.
- Se muestran agrupadas bajo el encabezado de fecha de la cita con vista previa en miniatura.

### 3.7 Documentos & Informes (Vectorización n8n)
- Los archivos de tipo documento (`pdf`, `doc`, `docx`) se almacenan en el VPS (`/opt/melosmile/pacientes/{patientId}/docs/`) y disparan automáticamente el Webhook de n8n `melosmile-document-vectorizer` para extracción de texto con Gemini y generación de embeddings.
- Muestran el indicador `IA 🧠` en la UI.

### 3.8 Próxima Pauta & Análisis IA de Cita Futura
- Campo de texto multi-línea (`Textarea`) para registrar la pauta de seguimiento de la siguiente cita.
- Al guardar la cita, se invoca en segundo plano el endpoint `/api/ai/analyze-appointment` que conecta con el Webhook de n8n `melosmile-appointment-analyzer`.
- Si la IA detecta una recomendación de cita futura (ej. *"Citar en 3 semanas para retirar puntos"*), muestra un **banner azul interactivo** en la cabecera que permite agendar la cita directamente.

---

## 4. Endpoints API Relacionados

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/documents/upload` | `POST` | Sube archivos físicos al VPS y discrimina entre fotos (VPS directo) y documentos (VPS + n8n vectorizer) |
| `/api/documents/vectorize` | `POST` | Proxy hacia n8n webhook `melosmile-document-vectorizer` |
| `/api/ai/analyze-appointment` | `POST` | Proxy hacia n8n webhook `melosmile-appointment-analyzer` para detectar citas sugeridas |
| `/api/odoo/invoice` | `POST` | Generación de facturas en Odoo ERP (single y multi-cobro) |
DOCEOF
---

## 5. Asignación de Profesional por Defecto & Dr. Invitado / Colaborador

- **Profesional Principal por Defecto**: Todas las citas se asignan por defecto a la **Dra. Osly Melo**.
- **Dr. Invitado / Colaborador**:
  - En la ficha de cita (`/appointments/[id]`) y en el modal de nueva cita (`NewAppointmentModal`), se añade el campo de entrada **`Dr. Invitado / Colaborador (Opcional)`** (ej. *Dr. Carlos Pérez - Cirujano invitado*).
  - Al ingresar un doctor colaborador, este se muestra en la cabecera junto a la Dra. Osly Melo (`Dra. Osly Melo + Dr. Carlos Pérez (Invitado)`) y se guarda en Supabase con la etiqueta `[DoctorInvitado: ...]`.

---

## 6. Menú de 3 Botones de Opciones Ampliadas en Cabecera

Ubicado en la cabecera superior de la ficha de cita (`/appointments/[id]`), permite activar y expandir las opciones avanzadas de la sesión mediante 3 botones:

1. **`👨‍⚕️ Dr. Colaborador`**: Abre/cierra en la parte superior el panel desplegable para seleccionar doctores registrados o crear un profesional nuevo en la BD.
2. **`💵 Contabilidad ($)`**: Alterna la visibilidad del panel financiero y de Odoo ERP en la columna derecha por encima del odontograma.

---

## 7. Catálogo & Creación de Profesionales en BD + Indicador IA de Perfil Degradado Morado

- **Selector de Doctores Registrados & Creación On-the-Fly**:
  - El panel desplegable del botón **`Dr. Colaborador`** incluye dos opciones:
    - *Opción A*: Selector desplegable con la lista de doctores activos en la base de datos (`professionals`).
    - *Opción B*: Input `¿Es un doctor nuevo?` con botón instantáneo **`+ Guardar en BD`**, que inserta permanentemente el nuevo profesional en la tabla `professionals` de Supabase y lo asigna a la cita.
- **Análisis IA Automático en Segundo Plano**:
  - Al guardar los cambios de la cita (o al crearse), la aplicación ejecuta automáticamente el análisis IA (`/api/ai/analyze-appointment`).
- **Anillo Degradado Morado (Indicador Visual de Cita Analizada por IA)**:
  - Cuando la cita cuenta con análisis IA, el cuadro del avatar del paciente en la cabecera muestra un **anillo degradado en tonos morados y violetas** (`bg-gradient-to-tr from-violet-600 via-purple-500 to-indigo-500`) con un badge `IA 🧠`.
