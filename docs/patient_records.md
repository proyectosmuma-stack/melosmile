# Documentación del Módulo de Fichas de Pacientes — Melosmile

Este documento describe la arquitectura, reglas de negocio y componentes desarrollados para las fichas de los pacientes en **Melosmile**.

---

## 1. Vistas y Rutas

- `/patients`: Directorio general de pacientes con buscador Ajax en tiempo real, filtro por estado (`En Tratamiento` vs `Alta`), **Barra de Filtros por Etiquetas (WordPress style)** y alternador de vista entre **Grid de Tarjetas** y **Tabla de Listado**.
- `/patients/[id]`: Ficha histórica individual del paciente.
- `/patients/[id]/edit`: Formulario de actualización de datos médicos, personales, de facturación y gestor de etiquetas.

---

## 2. Reglas de Negocio e Implementación

### A. Identificador Serial `PAC-###`
- Al insertar un nuevo paciente en la tabla `patients`, un trigger PostgreSQL (`set_historia_id_trigger`) genera automáticamente la secuencia manteniendo una numeración correlativa formateada a 3 dígitos (ej. `PAC-001`, `PAC-002`, `PAC-003`).

### B. Sistema de Etiquetas estilo WordPress (`tags` & `patient_tags`)
- **Autocompletado y Sugerencias**: En `/patients/[id]/edit`, el componente `TagInput` ofrece sugerencias dinámicas mediante JSON.
- **Creación On-the-Fly**: Si la etiqueta escrita no existe en la base de datos, presenta el botón instantáneo `+ Crear etiqueta "[texto]"`.
- **Organización y Filtros**: Las etiquetas se muestran como badges con colores en el directorio (`/patients`) y en la cabecera de la ficha del paciente (`/patients/[id]`). El directorio incluye una barra de filtros que permite filtrar pacientes por una o varias etiquetas (ej. *Familiar*, *Henryschein*, *Referido*, *VIP*).

### C. Cálculo Automático de Edad y Pacientes Menores de Edad
- La edad se calcula dinámicamente en el frontend en tiempo real comparando la fecha de nacimiento (`dob`) con la fecha actual.
- Si el paciente tiene **menos de 18 años**:
  - En la ficha (`/patients/[id]`), se muestra una insignia destacada `<Baby /> Menor de edad`.
  - En la pantalla de edición (`/patients/[id]/edit`), se activa la sección de **Representantes Legales**, permitiendo registrar uno o varios representantes (Nombre, Parentesco, DNI/NIE, Teléfono, Email y Flag de Contacto Principal).

### D. Vínculo Multiclínica
- Un paciente puede estar vinculado a una o varias sedes (Albacete, Goya, Las Rozas) a través de la tabla relacional `patient_clinics`.
- Se permite designar una clínica como **Principal**.
- Si el paciente visita puntualmente otra sede para una cita, la ficha muestra las clínicas vinculadas y de forma diferenciada las sedes de visitas ocasionales.

### E. Compatibilidad Next.js 16 / React 19 (`React.use(params)`)
- Las rutas dinámicas desempaquetan la promesa de parámetros usando `React.use(params)` para garantizar la compatibilidad con Next.js 16 y asegurar la carga sin bloqueos ni datos indefinidos.

### F. Gestor Documental Notion-Style (Full Width)
- Ubicado en la parte inferior de la ficha a ancho completo (`100% width`).
- Soporta arrastrar y soltar (Drag & Drop) para subir consentimientos informados, radiografías (RX), fotografías clínicas e informes en PDF, JPG o PNG.
- Registra la metadata del archivo en la tabla `documents`.

### G. Resumen de Tratamientos Asistido por IA
- Recuadro visual en el perfil que muestra el campo `ai_summary` de la tabla `patients`.
- Este campo se actualiza automáticamente mediante los flujos de **n8n** cada vez que la doctora realiza modificaciones en las notas o en el historial clínico del paciente.

### H. Historial de Citas — Navegación Directa

- Las filas del **Historial de Citas** son `<Link>` clickables que navegan directamente a `/appointments/[id]`.
- Cada fila muestra fecha, tratamiento, profesional, clínica, hora y estado de la cita con un badge de color.
- Un chevron `›` a la derecha indica la navegabilidad de la fila.

### I. Pestaña Facturación y Pagos

La pestaña **"Facturación y Pagos"** incluye las siguientes funcionalidades:

#### Barra de Acciones Superior
- **Botón `Crear Pago`** (verde): Abre el `PaymentRegistrationModal` para registrar un nuevo cobro o aconto.
- **Botón `Generar Factura Odoo`** (violeta): Se habilita únicamente cuando el usuario selecciona uno o más cobros pendientes de facturar mediante checkbox. Al pulsar, agrupa los cobros seleccionados en una sola factura de Odoo y actualiza todos los registros afectados.

#### Historial de Cobros con Checkboxes

Cada fila del historial muestra:
- **Checkbox de selección**: Habilitado si el cobro está `Por Facturar`. Deshabilitado (sin interacción posible) si el cobro ya fue facturado.
- **Badge `Facturada (INV/2026/XXXX)`** en color violeta: indica que el cobro tiene número de factura Odoo registrado.
- **Badge `Por Facturar`** en color ámbar: indica que el cobro está pendiente de procesar en Odoo.
- Importe, mes de facturación, método de pago y estado del cobro.

#### Seleccionar Todos
Checkbox de cabecera que selecciona en bloque todos los cobros pendientes de facturar (ignorando los ya facturados).

#### Resumen de Selección
Mientras hay cobros seleccionados, la barra superior muestra el recuento y el total en euros de los cobros marcados para la factura.

### J. Vectorización de Documentos con IA (n8n Integration)

- El componente `DocumentDropZone` en la sección de documentos dispara automáticamente, tras cada subida, una llamada al endpoint `/api/documents/vectorize`.
- Este endpoint reenvía el documento al Webhook de n8n (`melosmile-document-vectorizer`) que procesa el archivo, extrae texto con Gemini Flash y genera embeddings para la base vectorial.
- Los documentos subidos muestran el indicador `Vectorizado 🧠` una vez procesados.

### K. Informe Clínico Resumido por IA (Basado Exclusivamente en Notas Reales)

- En la ficha del paciente (`/patients/[id]`), la sección **Plan de Tratamiento** incluye el botón **`🤖 Informe Clínico IA`** (o *Re-generar Informe IA* si ya existe uno).
- Al pulsar el botón:
  1. Se invoca `/api/ai/patient-summary` que recoge **todas las notas de evolución reales** escritas por la doctora en cada cita del paciente.
  2. Las envía al Webhook de n8n `melosmile-patient-summary` con la instrucción estricta de no inventar información y basarse exclusivamente en las notas.
  3. El resumen resultante se guarda en `patients.ai_summary` y se muestra en la tarjeta violeta **Resumen Técnico IA**.

### L. Visión del Odontograma General en Ficha del Paciente

- Se añade la tarjeta **"Odontograma General del Paciente (Visión de Boca)"** directamente en la ficha del paciente (`/patients/[id]`).
- Agrega automáticamente todas las piezas dentales marcadas en las citas históricas del paciente.
- **Seguridad y confirmación**: Permanece en modo solo lectura para consulta visual rápida. Para modificar la dentición de referencia, la doctora debe pulsar explícitamente `✏️ Editar Odontograma Base` y luego confirmar con `💾 Guardar Odontograma Base`.

### M. Layout en 2 Columnas: Inteligencia Clínica IA (Izquierda) + Odontograma (Derecha)

- Se reestructuró la sección médica de la ficha del paciente (`/patients/[id]`) en una disposición en **2 columnas equilibradas** para un mejor aprovechamiento del espacio en pantalla:
  - **Columna Izquierda (1/2)**: Resumen Técnico IA (`ai_summary`), botón `🤖 Generar Informe IA` y Plan de Tratamiento.
  - **Columna Derecha (1/2)**: Odontograma General (Visión de boca consolidada) con selector de dentición y botones de edición bajo confirmación.

### N. Módulo de Recordatorios Multi-Canal (Email, WhatsApp, SMS)

- Se incorporó la gestión completa de recordatorios en la pestaña **"Recordatorios"** de la ficha del paciente (`/patients/[id]`).
- **Modal de Creación (`NewReminderModal`)**:
  - Permite seleccionar el canal de envío: **WhatsApp (💬)**, **Email (📧)**, **SMS (📱)**.
  - Selección de tipo: *Recordatorio de cita, Confirmación de cita, Cambio de alineador, Aviso de pago pendiente, Seguimiento post-cita, Personalizado*.
  - Carga de plantillas automáticas pre-rellenadas dinámicamente con los datos del paciente y cita.
  - Selección de fecha y hora programada.
- **Acciones**:
  - **Programar Envío**: Registra el recordatorio en Supabase (`reminders`) con estado `pendiente`.
  - **Enviar Ahora**: Dispara inmediatamente el recordatorio mediante el endpoint `/api/reminders/send-now`, conectando con el Webhook de n8n `melosmile-reminders-dispatcher` que efectúa el envío por WhatsApp/Email al teléfono/email del paciente y actualiza el estado a `enviado` con registro en `reminder_events`.

---

### O. Visualización de Dr. Invitado / Colaborador en el Historial de Citas

- En el listado histórico de citas de la ficha del paciente (`/patients/[id]`) y en el calendario (`/calendar`), si una cita cuenta con un doctor invitado o colaborador, este se muestra explícitamente en la línea del profesional:
  `Dra. Osly Melo (+ Dr. Carlos Pérez)`
- **Confirmación de Persistencia en Base de Datos**:
  - Los doctores invitados seleccionados o creados se almacenan de forma permanente en la tabla `professionals` de Supabase (`id`, `first_name`, `last_name`, `specialty`).
  - La vinculación específica con la cita se guarda en el campo `notes` de la tabla `appointments` bajo el tag `[DoctorInvitado: ...]`.
