# 🧩 ESTADO_PROYECTO.md - Melosmile

> ⚠️ **REGLA DE RAMAS**: Trabajo en rama `develop`. Nunca fusionar este archivo a `main`.
> **Última actualización**: 2026-08-23 (sesión IV: sistema básico CERTIFICADO E2E + memoria multi-turno + limpieza de datos ejecutada. Commits `a515e82` + `859c35f` pusheados a develop)
> **Para reiniciar la conversación**: "Lee .opencode/ESTADO_PROYECTO.md y sigamos desde ahí."
> **Histórico detallado**: `docs/knowledge-base/log.md` + `docs/knowledge-base/domains/n8n-workflows.md` (§3bis patrones técnicos)

---

## ✅ Objetivo Actual

**SISTEMA BÁSICO CERTIFICADO ✅ → BD LIMPIA ✅ → Pendiente elegir siguiente fase:**

1. **Odoo** (desbloqueado): configurar `ODOO_URL/DB/USER/PASSWORD/API_KEY` en Vercel y probar sincronización de facturas end-to-end. Estaba bloqueado por directriz del usuario ("no envíes nada a Odoo hasta que funcione la parte básica") — la parte básica YA está certificada.
2. **Excel + Calculadora**: interpretación de `datos-prueba/datos prueba.xlsx` vía Musly + verificación matemática de `frontend/src/lib/billing/calculator.ts` contra el xlsx (col 7 = "Otro Precio"; cuotas en Observación; fila ANGEL ALIGNER = 1440).
3. ~~Limpieza de datos~~ ✅ HECHA (skill `borrado-datos`: local SQL FK-orden + `clean_remote_db.js` cloud + `db:sync`). BD queda SOLO con paciente Munir Mauel Callaos Cardama (PAC-001), 0 citas/cobros/reminders.

## 🟢 Estado Certificado del Sistema (verificado contra BD real)

| Flujo | Estado |
|---|---|
| Agenda lecturas (hoy/mañana/semana/rangos ISO `YYYY-MM-DD/YYYY-MM-DD`/huecos) | ✅ 7/7 |
| Crear / mover / confirmar citas por lenguaje natural | ✅ BD-verificado |
| Anular cita = **soft-delete** (`status=Cancelada`) | ✅ corregido: antes borraba físicamente |
| Fechas relativas ("el viernes", "el lunes") | ✅ resuelve hacia adelante desde HOY real |
| Alta/búsqueda pacientes, teléfono | ✅ |
| Clínico (alergias etc.) | ✅ fluye vía search_patients |
| **Cobros pendientes** (helper determinista) | ✅ fidelidad exacta: Munir 72€/4 reg, Laura 36€, Sonia 0€ |
| **Memoria multi-turno** (anáforas) | ✅ "cancela la de las 11" y "y cuanto suma?" resueltos |

## 🔑 Infraestructura y Acceso (crítico para retomar)

- **n8n API**: `https://n8n.mumaweb.com/api/v1` · key = regex group(1) sobre `"n8n-dev"` en `/Users/munircallaos/.config/opencode/opencode.jsonc` (header `X-N8N-API-KEY`)
- **Webhook Musly**: `POST https://n8n.mumaweb.com/webhook/melosmile-dispatcher` body `{"message","sessionId","history":[{role,content},...]}` ← **history lo envía el cliente; ahora el dispatcher lo reenvía como `[CONTEXTO PREVIO: ...]`**
- **API staging**: `https://melosmile-staging-proyectosmuma-stacks-projects.vercel.app/api` · header `x-api-key: melosmile_internal_n8n_key_2026` · dominio nuevo estable: `staging.melosmile.com`
- **Deploy**: `cd frontend && vercel --prod --yes` (plain `vercel` = solo preview)
- **Workflow IDs n8n**: Dispatcher `Yv9X1EGUvQg8qErW` · Scheduling v2 `vg2HrtIQpvDrcUOC` · Clinical `Q7oxrbUuohca81Gn` · Billing `XSLNwq6ihH1SHPRl` · General `MIok0ruU7JhpTxWv`
- **Helpers**: PatientSearch `ungEfZO2qzDQvuVC` · ApptCreate `BTJZSpohjoxeY5Ru` · ApptModify `MlrysSNd3N8tDjVh` · **BillingQuery `AzGmCQ5rd7gvEQ3w`** (nuevo, determinista)
- **Supabase local**: docker `supabase_db_melosmile` → `docker exec supabase_db_melosmile psql -U postgres -d postgres`
- **Scripts BD**: `frontend/scripts/clean_remote_db.js` (lee `.env.remote`, autocontenido) · `npm run db:sync` = **Cloud→Local** (export seed.sql + db reset + agent_learnings) — NO correr antes del cleanup cloud
- **Backups n8n vivos**: `/tmp/opencode/{dispatcher,sched-v2,billing}.json` (volátil)

## 🏛️ Decisiones Técnicas Clave (lecciones certificadas — detalle en KB §3bis)

1. **Conexiones ai_tool**: del TOOL al AGENTE (`connections["Tool_X"].ai_tool=[[{"node":"Agent_X",...}]]`) — invertido se acepta pero el runtime lo ignora.
2. **toolHttpRequest tv1.1**: args con `$fromAI('param','desc')` inline en url/jsonBody (placeholderDefinitions NUNCA bindea) + `sendHeaders:true` obligatorio.
3. **toolWorkflow**: `typeVersion:1`, `"source":"database"`, `workflowId` STRING plano.
4. **Cadenas multi-paso → helpers deterministas** (una sola tool-call al LLM); flash saltaba el paso 2 ~50%.
5. **Cancelar = soft-delete**; borrado físico solo con orden literal del usuario.
6. **Fechas**: dispatcher pasa texto VERBATIM (no calcula); subagente usa su `$now` propio que PREVALECE.
7. **Publicar workflow**: deactivate → sleep(2) → PUT → activate → GET-verify.
8. **Forense**: tools ejecutadas aparecen como nodos `Tool_*` en `runData`; su ausencia = el modelo nunca las llamó.
9. **Modelo producción n8n**: `google/gemini-2.5-flash` vía OpenRouter es el único validado E2E ahí (contradicción resuelta vs entrada 22/08 del log que aplicaba a n8nv2).

## 📁 Archivos Modificados (commitados en develop)

- `frontend/src/app/api/billing/pending/route.ts` — join `appointments!inner(patient_id, reason)`; contrato `{id, appointment_reason, total_amount, custom_price, status, created_at}`
- `frontend/src/app/api/ai-context/route.ts` — mismo fix de schema fantasma
- `frontend/src/app/api/odoo/invoice/route.ts` — bloque billing_records corregido
- `frontend/src/lib/utils/date-parser.ts` (+`.test.ts` nuevo) — rangos ISO explícitos; 10/10 tests
- `frontend/src/lib/billing/utils.test.ts` — modernización vitest
- `docs/knowledge-base/domains/n8n-workflows.md` — §3bis patrones + IDs reales
- `docs/knowledge-base/domains/infra-vercel.md` — staging.melosmile.com atado a develop
- `docs/knowledge-base/log.md` — entradas 23/08

## ⚠️ Limitaciones Conocidas

- Tools HTTP clínicas (context/summary) definidas correctamente pero el modelo no las invoca (la info crítica ya viaja en output de search). Resumen endpoint devuelve honestamente "No hay resumen disponible".
- `Tool_Reminders_Dispatcher` sin probar en vivo (evita envíos reales; config verificada estática).
- Sin memoria persistente server-side: la anáfora depende de que el cliente envíe `history` en el body.

## ▶️ Próximos Pasos

1. **Odoo**: pedir/enviar vars `ODOO_*` a Vercel (proyecto melosmile-staging), desbloquear Tool_Odoo_Invoice (fue eliminada del workflow Billing), test factura end-to-end.
2. **Excel + Calculadora**: pegar filas del xlsx a Musly y auditar interpretación; verificar `calculator.ts` contra columnas reales (col 7 Otro Precio, cuotas, ANGEL ALIGNER 1440).
3. Registrar resultados en `docs/knowledge-base/log.md`.
