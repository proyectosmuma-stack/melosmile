const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../../../frontend/.env.remote") });
require("dotenv").config({ path: path.join(__dirname, "../../../../frontend/.env.local") });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://amhfdzfcmpastmlsosou.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SERVICE_ROLE_KEY) {
  console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY no está definida en las variables de entorno");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function auditPatientAppointments(patientNameOrId) {
  let patientId = patientNameOrId;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!UUID_REGEX.test(patientId)) {
    const terms = String(patientNameOrId).split(/\s+/).filter(Boolean);
    const orConditions = terms
      .flatMap((t) => [`first_name.ilike.%${t}%`, `last_name.ilike.%${t}%`, `phone.ilike.%${t}%`])
      .join(",");

    const { data: matchedP } = await supabase
      .from("patients")
      .select("id, first_name, last_name")
      .or(orConditions)
      .limit(1)
      .maybeSingle();

    if (matchedP) {
      patientId = matchedP.id;
      console.log(`Resolved patient "${patientNameOrId}" to ID: ${patientId} (${matchedP.first_name} ${matchedP.last_name})`);
    } else {
      console.error(`Patient "${patientNameOrId}" not found in database.`);
      return;
    }
  }

  const { data: appts, error } = await supabase
    .from("appointments")
    .select(`
      *,
      patient:patients(id, first_name, last_name, phone, email),
      clinic:clinics(id, name, address),
      professional:professionals(id, first_name, last_name),
      treatment:treatments(id, service_name, default_price, lab_cost)
    `)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error querying appointments:", error);
    return;
  }

  console.log(`\n=== SUPABASE DB GROUND TRUTH AUDIT ===`);
  console.log(`TOTAL APPOINTMENTS FOR PATIENT: ${appts ? appts.length : 0}`);
  console.log(JSON.stringify(appts, null, 2));

  if (appts && appts.length > 0) {
    for (const appt of appts) {
      const { data: billing } = await supabase
        .from("billing_records")
        .select("*")
        .eq("appointment_id", appt.id);

      console.log(`\n=== BILLING RECORD FOR APPOINTMENT ${appt.id} ===`);
      console.log(JSON.stringify(billing, null, 2));
    }
  }
}

const target = process.argv[2] || "Manuel Cardama";
auditPatientAppointments(target);
