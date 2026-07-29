---
name: borrado-datos
description: Borra todos los datos de prueba en Supabase Local y Cloud dejando únicamente la ficha del paciente Munir Mauel Callaos Cardama (PAC-001).
---

# /Borrado Datos

Cuando el usuario ejecute `/borrado-datos` o diga "Borra datos" / "Limpia la base de datos":

1. **Borrado Local en PostgreSQL (Docker)**:
   Ejecutar en orden estricto de claves foráneas (FK):
   - `DELETE FROM billing_session_lines;`
   - `DELETE FROM billing_sessions;`
   - `DELETE FROM billing_records;`
   - `DELETE FROM appointments;`
   - `DELETE FROM patient_tags WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');`
   - `DELETE FROM patient_clinics WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');`
   - `DELETE FROM patient_representatives WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');`
   - `DELETE FROM documents WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');`
   - `DELETE FROM reminders WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');`
   - `DELETE FROM patients WHERE first_name NOT ILIKE '%Munir%' AND last_name NOT ILIKE '%Callaos%';`

2. **Borrado Cloud (Supabase)**:
   Ejecutar `node scripts/clean_remote_db.js` desde `frontend`.

3. **Re-Sincronización**:
   Ejecutar `npm run db:sync` desde `frontend`.
