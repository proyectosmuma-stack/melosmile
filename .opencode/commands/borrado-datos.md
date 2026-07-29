# Command: /borrado-datos

1. Execute strict FK deletion query in PostgreSQL (Supabase Local):
   DELETE FROM billing_session_lines;
   DELETE FROM billing_sessions;
   DELETE FROM billing_records;
   DELETE FROM appointments;
   DELETE FROM patient_tags WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');
   DELETE FROM patient_clinics WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');
   DELETE FROM patient_representatives WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');
   DELETE FROM documents WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');
   DELETE FROM reminders WHERE patient_id NOT IN (SELECT id FROM patients WHERE first_name ILIKE '%Munir%' OR last_name ILIKE '%Callaos%');
   DELETE FROM patients WHERE first_name NOT ILIKE '%Munir%' AND last_name NOT ILIKE '%Callaos%';
2. Execute `node scripts/clean_remote_db.js` in `frontend/` to clean Supabase Cloud.
3. Run `npm run db:sync` in `frontend/`.
