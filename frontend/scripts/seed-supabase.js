const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://amhfdzfcmpastmlsosou.supabase.co';
const supabaseAnonKey = 'sb_publishable_kN-3hlqUxOni9onF1CDmhg_03EOCXG6';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const patientsToSeed = [
  {
    historia_id: "PAC-005",
    first_name: "Munir",
    last_name: "Callaos",
    dni_nie: "77889900X",
    dob: "1990-06-15",
    gender: "Masculino",
    phone: "+34 655 889 900",
    email: "munir@melosmile.com",
    address: "Paseo de la Castellana 200, Madrid",
    in_treatment: true,
    important_diseases: "Ninguna",
    previous_operations: "Ninguna",
    allergies: "Polen",
    current_medication: "Antihistamínicos",
    treatment_plan: "Limpieza ultrasónica y Blanqueamiento LED con férula de descarga nocturna"
  },
  {
    historia_id: "PAC-001",
    first_name: "Juan",
    last_name: "Pérez",
    dni_nie: "12345678A",
    dob: "1985-04-12",
    gender: "Masculino",
    phone: "+34 612 345 678",
    email: "juan.perez@email.com",
    address: "Calle Mayor 12, Madrid",
    in_treatment: true,
    important_diseases: "Hipertensión arterial controlada",
    previous_operations: "Ninguna",
    allergies: "Penicilina",
    current_medication: "Enalapril 10mg",
    treatment_plan: "Ortodoncia brackets metálicos + Higiene previa"
  },
  {
    historia_id: "PAC-002",
    first_name: "María",
    last_name: "Gómez",
    dni_nie: "87654321B",
    dob: "1992-09-24",
    gender: "Femenino",
    phone: "+34 622 987 654",
    email: "maria.gomez@email.com",
    address: "Av. de Portugal 45, Albacete",
    in_treatment: true,
    important_diseases: "Ninguna",
    previous_operations: "Apendicectomía 2018",
    allergies: "Látex",
    current_medication: "Ninguna",
    treatment_plan: "Estética Dental - Carillas de porcelana"
  },
  {
    historia_id: "PAC-003",
    first_name: "Carlos",
    last_name: "Rodríguez",
    dni_nie: "45678912C",
    dob: "1978-11-03",
    gender: "Masculino",
    phone: "+34 633 456 789",
    email: "carlos.rodriguez@email.com",
    address: "Calle de la Princesa 8, Madrid",
    in_treatment: false,
    important_diseases: "Diabetes tipo 2",
    previous_operations: "Cirugía de rodilla",
    allergies: "Aspirina / AINES",
    current_medication: "Metformina 850mg",
    treatment_plan: "Rehabilitación sobre implantes"
  },
  {
    historia_id: "PAC-004",
    first_name: "Laura",
    last_name: "Sánchez",
    dni_nie: "33221144D",
    dob: "1995-02-18",
    gender: "Femenino",
    phone: "+34 644 112 233",
    email: "laura.sanchez@email.com",
    address: "Calle Rozas 100, Las Rozas",
    in_treatment: true,
    important_diseases: "Ninguna",
    previous_operations: "Ninguna",
    allergies: "Ninguna",
    current_medication: "Ninguna",
    treatment_plan: "Alineadores Invisalign - Mantenimiento"
  }
];

async function seed() {
  console.log("Insertando/actualizando pacientes en Supabase...");
  for (const patient of patientsToSeed) {
    const { data, error } = await supabase
      .from('patients')
      .upsert(patient, { onConflict: 'historia_id' })
      .select();
    
    if (error) {
      console.error("Error al insertar paciente", patient.historia_id, ":", error);
    } else {
      console.log("Paciente insertado/actualizado con éxito:", patient.historia_id, patient.first_name, patient.last_name);
    }
  }
  console.log("Sembrado finalizado.");
}

seed();
