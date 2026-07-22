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
