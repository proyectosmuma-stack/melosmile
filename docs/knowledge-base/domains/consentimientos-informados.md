# Consentimientos Informados — Melosmile

> **Estado**: Arquitectura definida (2026-08-24). Pendiente recepción de plantillas clínicas para implementación.
> **Fase roadmap**: Fase 12.
> **Modelo architect**: Migrado a `openrouter/deepseek/deepseek-v4-pro-0813` (2026-08-24) — gemini-3.1-pro free tier = 0.

## Contexto

Los consentimientos informados son documentos legales obligatorios en odontología que el paciente debe firmar antes de cada tratamiento. En Melosmile se requiere un módulo que permita:

1. **Generar** consentimientos pre-rellenados con datos del paciente y la clínica.
2. **Almacenar** una copia en el servidor (VPS/Supabase Storage) para consulta posterior.
3. **Consultar** consentimientos históricos desde la ficha del paciente.

## Tipos de Consentimiento

| Tipo | Descripción | Estado |
|------|-------------|--------|
| Ortodoncia | Tratamiento de ortodoncia (fijos, extraíbles, funcionales) | Pendiente documentación |
| Miofuncional | Terapia miofuncional orofacial | Pendiente documentación |
| Ortopedia | Ortopedia dentofacial / disyuntor | Pendiente documentación |

> **Extensible**: El sistema debe permitir agregar nuevos tipos de consentimiento sin modificar código (configuración).

## Arquitectura Preliminar

### Flujo de Generación

```
┌─────────────────────────────────────────────────────────┐
│  1. Usuario selecciona "Generar Consentimiento"         │
│     (desde ficha paciente o desde cita)                 │
└───────────────────┬─────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────┐
│  2. Selección de tipo: Ortodoncia / Miofunc / Ortopedia │
└───────────────────┬─────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────┐
│  3. Modal de previsualización y edición                 │
│     - Datos autocompletados del paciente                │
│     - Clínica seleccionada (o popup para cambiar)       │
│     - Profesional responsable                           │
│     - Fecha de generación                               │
│     - Campos específicos del tipo de consentimiento     │
└───────────────────┬─────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────┐
│  4. Generación del documento                            │
│     - Opción A: HTML → PDF (librería client-side)       │
│     - Opción B: PDF plantilla + campos (server-side)    │
└───────────────────┬─────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────┐
│  5. Almacenamiento                                      │
│     - Subir a Supabase Storage (bucket privado)         │
│     - Registrar en tabla `consentimientos`              │
│     - Vincular a paciente (FK) y opcionalmente a cita   │
└───────────────────┬─────────────────────────────────────┘
                    ▼
┌─────────────────────────────────────────────────────────┐
│  6. Consulta y descarga                                 │
│     - Listado en ficha del paciente (nueva pestaña)     │
│     - Previsualización inline (Lightbox/iframe)         │
│     - Descarga con signed URL                           │
└─────────────────────────────────────────────────────────┘
```

### Estructura de Tabla `consentimientos` (Revisada por mumabot-reviewer)

```sql
CREATE TYPE consent_tipo AS ENUM (
  'ortodoncia', 'miofuncional', 'ortopedia'
);

CREATE TABLE consentimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  cita_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  clinica_id UUID NOT NULL REFERENCES clinics(id),
  profesional_id UUID REFERENCES professionals(id),
  tipo consent_tipo NOT NULL,  -- ENUM explícito (no TEXT+CHECK)
  datos_paciente JSONB NOT NULL,  -- Snapshot inmutable al momento de generación
  datos_clinica JSONB NOT NULL,   -- Snapshot de la clínica
  archivo_url TEXT NOT NULL,      -- Ruta en Supabase Storage (bucket patient-documents)
  archivo_hash TEXT,              -- SHA-256 del PDF para integridad
  firmado BOOLEAN DEFAULT false,
  firmado_en TIMESTAMPTZ,
  firma_digital JSONB,           -- Datos de firma si aplica
  eliminado_en TIMESTAMPTZ,      -- Soft delete (legal: no borrar documentos firmados)
  generado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: backend usa service_role (supabaseAdmin), NO auth.uid()
-- Policyシンプル: si existe la fila, el service_role puede leerla
ALTER TABLE consentimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" ON consentimientos
  FOR ALL USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX idx_consentimientos_paciente ON consentimientos(paciente_id);
CREATE INDEX idx_consentimientos_tipo ON consentimientos(tipo);
CREATE INDEX idx_consentimientos_paciente_tipo ON consentimientos(paciente_id, tipo);
```

### Estructura de Tabla `consentimiento_plantillas`

```sql
CREATE TABLE consentimiento_plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL UNIQUE,         -- 'ortodoncia', 'miofuncional', 'ortopedia'
  nombre TEXT NOT NULL,
  html_content TEXT NOT NULL,        -- HTML con {{placeholders}}
  campos_dinamicos JSONB NOT NULL,   -- Definición de campos editables
  version INTEGER DEFAULT 1,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Almacenamiento (Patrón híbrido VPS + Supabase Storage)

El sistema actual usa un patrón híbrido verificado en `frontend/src/lib/server/storage.ts`:

1. **Upload**: PDF se sube a VPS IONOS vía FTP (`api/documents/upload/route.ts`)
2. **Metadata**: `file_path` relativo se guarda en tabla `documents` (Supabase PostgreSQL)
3. **Lectura**: `signDocumentUrl()` genera signed URL desde bucket `patient-documents` (Supabase Storage)
4. **Fallback**: Si Supabase Storage falla, `resolveDocumentUrl()` resuelve la URL VPS legacy

**Para consentimientos**: reutilizar el mismo patrón. El PDF se almacena en `patient-documents` con path `consentimientos/{patient_id}/{tipo}_{fecha}.pdf`.

| Componente | Ubicación | Función |
|-----------|-----------|---------|
| `ConsentimientoGenerator` | `components/consentimientos/` | Modal principal de generación |
| `ConsentimientoPreview` | `components/consentimientos/` | Previsualización del documento |
| `ConsentimientoList` | `components/consentimientos/` | Listado en ficha del paciente |
| `ConsentimientoFormField` | `components/consentimientos/` | Campo dinámico editable |
| Tab "Consentimientos" | `patients/[id]/page.tsx` | Nueva pestaña en ficha paciente |

### API Routes

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/consentimientos` | GET | Listar consentimientos (filtro por paciente, tipo) |
| `/api/consentimientos` | POST | Generar nuevo consentimiento |
| `/api/consentimientos/[id]` | GET | Detalle + signed URL del PDF |
| `/api/consentimientos/[id]` | DELETE | Eliminar (soft delete) |
| `/api/consentimientos/plantillas` | GET | Listar plantillas activas |
| `/api/consentimientos/plantillas` | POST/PUT | Crear/actualizar plantilla |

## Hallazgos del Auditor (mumabot-reviewer)

| Check | Estado | Detalle |
|-------|--------|---------|
| RLS policies | ⚠️ WARN | Backend usa `supabaseAdmin` (service_role) — RLS debe permitir service_role, NO `auth.uid()` |
| Soft delete | ⚠️ WARN | Documentos legales NO deben borrarse físicamente — usar `eliminado_en TIMESTAMPTZ` |
| Bucket strategy | ✅ PASS | Reutilizar `patient-documents` (ya privado, signed URLs TTL 3600s) |
| ENUM handling | ⚠️ WARN | Usar `CREATE TYPE consent_tipo AS ENUM(...)` en vez de `TEXT CHECK` — más limpio y tipado |
| FK cascade | ✅ PASS | `ON DELETE CASCADE` en `paciente_id`, `ON DELETE SET NULL` en `cita_id` |
| Snapshot JSONB | ✅ PASS | `datos_paciente` + `datos_clinica` como JSONB inmutable al momento de generación |
| Índices | ✅ PASS | Compuesto `(paciente_id, tipo)` para consultas frecuentes |

## Decisiones Pendientes (Para cuando llegue la documentación)

1. **Formato de plantilla**: ¿PDF subido editable o HTML con placeholders?
2. **Campos dinámicos exactos**: ¿Qué datos del paciente van en cada tipo?
3. **Firma**: ¿Solo aceptación digital con checkbox + timestamp o firma manuscrita (canvas)?
4. **Bucket de Storage**: ¿Reutilizar `patient-documents` o crear bucket dedicado `consentimientos`?
5. **Multi-clínica**: ¿Las plantillas son globales o por clínica?
6. **Idioma**: ¿Plantillas solo en español o bilingües?

## RGPD y Seguridad

- Bucket privado con RLS — solo paciente y personal autorizado.
- Signed URLs TTL 3600s para descarga.
- Snapshot de datos del paciente al momento de generación (no depende de datos actuales).
- Audit log: quién generó, cuándo, qué consentimiento.
- Derecho de borrado: eliminar consentimientos = eliminar PDF del storage.

## Referencias

- Fase 11 (fotos clínicas): `fase-11-galeria-fotos.md` — patrón de bucket privado + signed URLs reutilizable.
- Infraestructura Vercel: `infra-vercel.md` — despliegue staging → producción.
- Roadmap: `roadmap.md` — Fase 12.
