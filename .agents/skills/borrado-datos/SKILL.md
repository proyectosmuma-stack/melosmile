---
name: borrado-datos
description: (SEGURO) Borra todos los datos de prueba dejando la ficha PAC-001. Requiere confirmación.
---
# /Borrado Datos

> [!CAUTION]
> **PROTOCOLO DE CONFIRMACIÓN OBLIGATORIO**
> Antes de ejecutar CUALQUIER comando de borrado, el agente DEBE:
> 1. Mostrar un resumen exacto de las tablas que se van a vaciar.
> 2. Detener la ejecución usando la herramienta `ask_question` (o equivalente en texto) con el mensaje exacto:
>    *"ATENCIÓN: Estás a punto de borrar datos. Por favor, escribe exactamente **CONFIRMAR BORRADO** para proceder."*
> 3. Si el usuario escribe cualquier otra cosa, el agente DEBE abortar inmediatamente con `exit 1`.

1. **Borrado Local en PostgreSQL (Docker)**:
   Ejecutar en orden estricto de claves foráneas (FK):
   - `DELETE FROM billing_session_lines;`
   - `DELETE FROM billing_sessions;`
   - `DELETE FROM billing_records;`
   - `DELETE FROM appointments;`
   - `DELETE FROM patient_tags WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE \"%Munir%\" OR last_name ILIKE \"%Callaos%\");`
   - `DELETE FROM patient_clinics WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE \"%Munir%\" OR last_name ILIKE \"%Callaos%\");`
   - `DELETE FROM patient_representatives WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE \"%Munir%\" OR last_name ILIKE \"%Callaos%\");`
   - `DELETE FROM documents WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE \"%Munir%\" OR last_name ILIKE \"%Callaos%\");`
   - `DELETE FROM reminders WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE \"%Munir%\" OR last_name ILIKE \"%Callaos%\");`
   - `DELETE FROM patients WHERE first_name NOT ILIKE \"%Munir%\" AND last_name NOT ILIKE \"%Callaos%\";`

2. **Borrado Cloud (Supabase)**:
   Ejecutar `node scripts/clean_remote_db.js` desde `frontend`.

3. **Re-Sincronización**:
   Ejecutar `npm run db:sync` desde `frontend`.
