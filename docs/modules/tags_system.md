# Documentación Técnica: Sistema de Etiquetas (WordPress Style) — Melosmile

## 1. Visión General

El sistema de **Etiquetas (Tags)** permite clasificar, organizar y filtrar pacientes en Melosmile bajo categorías dinámicas como *Familiar*, *Henryschein*, *Referido*, *VIP*, *Ortodoncia*, *Seguro*, o cualquier etiqueta creada a la medida por los usuarios.

---

## 2. Esquema de Base de Datos (Supabase PostgreSQL)

### Tabla `public.tags`
Almacena el catálogo central de etiquetas.
```sql
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT 'rose',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla `public.patient_tags`
Junction table para la relación N:M entre pacientes y etiquetas.
```sql
CREATE TABLE public.patient_tags (
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (patient_id, tag_id)
);
```

---

## 3. Componentes Frontend

### `TagInput` (`src/components/patients/tag-input.tsx`)
Componente interactivo con autocompletado en tiempo real:
- **Lectura Dinámica**: Consulta `tags` mediante Supabase JSON-RPC.
- **Creación sobre la marcha**: Si la búsqueda no coincide con ninguna etiqueta existente, ofrece `+ Crear etiqueta "[query]"` para insertarla en la base de datos de manera transparente.
- **Visualización en Badges**: Badges con código de color dinámico (`rose`, `amber`, `emerald`, `purple`, `blue`, `slate`) y botón para remover.

---

## 4. Integración en Pantallas

1. **Directorio `/patients`**:
   - Barra de botones estilo pill con contadores por etiqueta: `Todas (1)`, `🏷️ Familiar (1)`, `🏷️ Henryschein (1)`, etc.
   - Filtrado instantáneo sin recargar la página.
   - Muestra las etiquetas asociadas en las tarjetas del directorio.

2. **Ficha del Paciente `/patients/[id]`**:
   - Muestra las etiquetas en la cabecera principal junto a las sedes vinculadas y la edad.

3. **Edición del Paciente `/patients/[id]/edit`**:
   - Sección dedicada a gestionar las etiquetas del paciente antes de guardar.
