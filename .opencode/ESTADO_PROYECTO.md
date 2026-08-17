## 🧩 ESTADO_PROYECTO.md - Melosmile

### ✅ Objetivo Actual
Optimizar y corregir la lógica de cálculo financiero en `/api/billing/extract/route.ts` para garantizar:
- Aplicación precisa de descuentos de laboratorio y comisiones.
- Resolución determinista de conflictos de precios (manual vs. catálogo).
- Sincronización 100% fiel con Supabase y n8n.

### 📁 Archivos Modificados/Relevantes
- `calculator.ts` (motor de cálculo financiero)
- `/api/billing/extract/route.ts`
- `[MELOSMILE] Agent Document Cleaner` (n8n flow)
- `lib/utils/date-parser.ts`, `patient-id.ts` (utils centralizados)
- `.env.local`, `.env.remote`, `.env.remote.production` (configuraciones de entorno)

### 🛠 Decisions Tomadas
- Centralización de utils en `lib/utils/`.
- Uso de Supabase filters para búsqueda eficiente.
- Transacciones atómicas con `.upsert()` en facturación.
- Integración completa con n8n para procesamiento de documentos.

### 🚀 Próximos Pasos
1. Analizar `calculator.ts` y `/api/billing/extract/route.ts`.
2. Escribir pruebas unitarias para casos críticos (ej: NETO negativo, precios manual vs. catálogo).
3. Validar sincronización con n8n y Supabase.
4. Ajustar documentación de flujo en `agent_learnings`.