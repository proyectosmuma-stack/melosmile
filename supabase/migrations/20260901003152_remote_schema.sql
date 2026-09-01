-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

ALTER TABLE public.billing_records
  DROP CONSTRAINT billing_records_patient_id_fkey;

ALTER TABLE public.clinics
  DROP CONSTRAINT clinics_name_key;

ALTER TABLE public.professionals
  DROP CONSTRAINT professionals_name_key;

ALTER TABLE public.treatments
  DROP CONSTRAINT treatments_service_name_key;

DROP POLICY "Allow anon and authenticated all" ON public.ai_agent_reports;

DROP POLICY "Allow anon and authenticated all" ON public.ai_conversation_history;

DROP POLICY "Allow anon and authenticated all" ON public.appointments;

DROP POLICY "Allow anon and authenticated all" ON public.billing_records;

DROP POLICY "Allow anon and authenticated all" ON public.billing_session_lines;

DROP POLICY "Allow anon and authenticated all" ON public.billing_sessions;

DROP POLICY "Allow anon and authenticated all" ON public.clinic_commission_rules;

DROP POLICY "Allow anon and authenticated all" ON public.clinic_treatments;

DROP POLICY "Allow all authenticated on clinics" ON public.clinics;

DROP POLICY "Allow anon all on clinics" ON public.clinics;

DROP POLICY "Allow anon and authenticated all" ON public.clinics;

DROP POLICY "Allow anon and authenticated all" ON public.patient_clinics;

DROP POLICY "Allow anon and authenticated all" ON public.patient_representatives;

DROP POLICY "Allow anon and authenticated all" ON public.patient_tags;

DROP POLICY "Allow anon and authenticated all" ON public.patients;

DROP POLICY "Allow anon and authenticated all" ON public.payment_installments;

DROP POLICY "Allow anon and authenticated all" ON public.professional_clinics;

DROP POLICY "Allow anon and authenticated all" ON public.professionals;

DROP POLICY "Allow anon and authenticated all" ON public.reminder_events;

DROP POLICY "Allow anon and authenticated all" ON public.reminders;

DROP POLICY "Allow anon and authenticated all" ON public.tags;

DROP POLICY "Allow anon and authenticated all" ON public.treatment_clinic_prices;

DROP POLICY "Allow anon and authenticated all" ON public.treatment_families;

DROP POLICY "Allow anon and authenticated all" ON public.treatments;

CREATE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;

CREATE TABLE public.agent_learnings (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  category    character varying(50)    DEFAULT 'vocabulary'::character varying NOT NULL,
  expression  text                     NOT NULL,
  meaning     text                     NOT NULL,
  notes       text,
  usage_count integer                  DEFAULT 0,
  created_at  timestamp with time zone DEFAULT now(),
  updated_at  timestamp with time zone DEFAULT now()
);

ALTER TABLE public.agent_learnings
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.agent_learnings
  ADD CONSTRAINT agent_learnings_pkey PRIMARY KEY (id);

GRANT ALL ON public.agent_learnings TO anon;

GRANT ALL ON public.agent_learnings TO authenticated;

GRANT ALL ON public.agent_learnings TO service_role;

CREATE INDEX idx_agent_learnings_expression ON public.agent_learnings (expression);

CREATE INDEX idx_agent_learnings_category ON public.agent_learnings (category);

CREATE POLICY "Allow read access for all" ON public.agent_learnings
  FOR SELECT
  USING (true);

CREATE POLICY "Allow write access for all" ON public.agent_learnings
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated" ON public.professional_clinics
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon read" ON public.professional_clinics
  FOR SELECT
  TO anon
  USING (true);

CREATE TABLE public.treatment_plans (
  id                      uuid                     DEFAULT gen_random_uuid() NOT NULL,
  patient_id              uuid                     NOT NULL,
  clinic_id               uuid,
  status                  character varying(50)    DEFAULT 'activo'::character varying,
  total_cost              numeric(10,2)            DEFAULT 0.00,
  initial_payment         numeric(10,2)            DEFAULT 0.00,
  monthly_fee             numeric(10,2)            DEFAULT 0.00 NOT NULL,
  total_installments      integer                  DEFAULT 0,
  created_at              timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at              timestamp with time zone DEFAULT timezone('utc'::text, now()),
  final_payment           numeric(10,2)            DEFAULT 0.00,
  treatment_type          character varying(100)   DEFAULT 'Ortodoncia'::character varying,
  paid_installments_count integer                  DEFAULT 0,
  already_paid_amount     numeric(10,2)            DEFAULT 0.00
);

ALTER TABLE public.treatment_plans
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.treatment_plans
  ADD CONSTRAINT treatment_plans_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE SET NULL;

ALTER TABLE public.treatment_plans
  ADD CONSTRAINT treatment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.treatment_plans
  ADD CONSTRAINT treatment_plans_pkey PRIMARY KEY (id);

ALTER TABLE public.treatment_plans
  ADD CONSTRAINT treatment_plans_status_check
    CHECK (status::text = ANY (ARRAY['activo'::character varying, 'completado'::character varying, 'cancelado'::character varying]::text[]));

GRANT ALL ON public.treatment_plans TO anon;

GRANT ALL ON public.treatment_plans TO authenticated;

GRANT ALL ON public.treatment_plans TO service_role;

CREATE INDEX idx_treatment_plans_patient_id ON public.treatment_plans (patient_id);

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
