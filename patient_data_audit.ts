#!/usr/bin/env deno
/**
 * SCRIPT DE AUDITORÍA COMPLETA DE DATOS PACIENTES
 * Analiza todos los datos de pacientes, citas, tratamientos y anotaciones
 * Genera cuestionario con dudas para el profesional
 * Fecha: 09/09/2026
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

// Configuración - usar variables de entorno
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://xylqytpudbdcsbuuwqpi.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY no está configurada");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PatientWithDetails {
  id: string;
  historia_id: string;
  first_name: string;
  last_name: string;
  dni_nie: string | null;
  phone: string | null;
  email: string | null;
  in_treatment: boolean;
  treatment_plan: string | null;
  important_diseases: string | null;
  allergies: string | null;
  created_at: string;
  updated_at: string;
  appointments: any[];
  billing_records: any[];
  tags: any[];
  clinics: any[];
  documents: any[];
  reminders: any[];
}

interface AuditIssue {
  type: string;
  patient_id: string;
  patient_name: string;
  field: string;
  issue: string;
  severity: "alta" | "media" | "baja";
  suggested_action: string;
  question_for_professional?: string;
}

async function auditPatientData(): Promise<AuditIssue[]> {
  console.log("🔍 Iniciando auditoría completa de datos de pacientes...");
  
  const issues: AuditIssue[] = [];
  
  try {
    // 1. Obtener todos los pacientes con sus relaciones
    const { data: patients, error: patientsError } = await supabase
      .from("patients")
      .select(`
        *,
        appointments (*, billing_records (*)),
        patient_tags (tags (*)),
        patient_clinics (clinics (*)),
        documents (*),
        reminders (*)
      `)
      .order("created_at", { ascending: false });
    
    if (patientsError) {
      console.error("❌ Error al obtener pacientes:", patientsError);
      return issues;
    }
    
    console.log(`📊 Total pacientes encontrados: ${patients?.length || 0}`);
    
    // 2. Auditoría por paciente
    for (const patient of patients || []) {
      const patientName = `${patient.first_name} ${patient.last_name}`;
      
      // 2.1. Campos obligatorios incompletos
      if (!patient.first_name?.trim() || !patient.last_name?.trim()) {
        issues.push({
          type: "datos_basicos",
          patient_id: patient.id,
          patient_name: patientName,
          field: "nombre/apellido",
          issue: "Nombre o apellido incompletos",
          severity: "alta",
          suggested_action: "Completar nombre completo del paciente",
          question_for_professional: "¿Cuál es el nombre completo correcto del paciente?"
        });
      }
      
      // 2.2. Teléfono/email faltantes
      if (!patient.phone?.trim()) {
        issues.push({
          type: "contacto",
          patient_id: patient.id,
          patient_name: patientName,
          field: "teléfono",
          issue: "Teléfono no registrado",
          severity: "media",
          suggested_action: "Agregar teléfono de contacto",
          question_for_professional: "¿Cuál es el teléfono de contacto del paciente?"
        });
      }
      
      if (!patient.email?.trim()) {
        issues.push({
          type: "contacto",
          patient_id: patient.id,
          patient_name: patientName,
          field: "email",
          issue: "Email no registrado",
          severity: "baja",
          suggested_action: "Agregar email si está disponible",
          question_for_professional: "¿Tiene el paciente email de contacto?"
        });
      }
      
      // 2.3. Plan de tratamiento vacío o incompleto
      if (!patient.treatment_plan?.trim() || patient.treatment_plan.trim().length < 10) {
        issues.push({
          type: "tratamiento",
          patient_id: patient.id,
          patient_name: patientName,
          field: "treatment_plan",
          issue: "Plan de tratamiento vacío o muy breve",
          severity: "alta",
          suggested_action: "Documentar plan de tratamiento completo",
          question_for_professional: "¿Cuál es el plan de tratamiento actual del paciente?"
        });
      }
      
      // 2.4. Antecedentes médicos (alergias/enfermedades)
      if (!patient.allergies?.trim() || patient.allergies.toLowerCase() === "ninguna") {
        issues.push({
          type: "antecedentes",
          patient_id: patient.id,
          patient_name: patientName,
          field: "allergies",
          issue: "Alergias no especificadas",
          severity: "alta",
          suggested_action: "Especificar alergias o confirmar 'ninguna'",
          question_for_professional: "¿Tiene el paciente alguna alergia conocida? (medicamentos, látex, etc.)"
        });
      }
      
      // 2.5. Sin citas registradas (posible dato huérfano)
      if (!patient.appointments || patient.appointments.length === 0) {
        issues.push({
          type: "historial",
          patient_id: patient.id,
          patient_name: patientName,
          field: "appointments",
          issue: "No tiene citas registradas",
          severity: "media",
          suggested_action: "Verificar si el paciente tiene citas en Notion",
          question_for_professional: "¿Este paciente ha tenido citas? ¿Están registradas en Notion?"
        });
      }
      
      // 2.6. Citas sin billing asociado (posible falta de facturación)
      if (patient.appointments && patient.appointments.length > 0) {
        for (const appointment of patient.appointments) {
          const billingRecords = appointment.billing_records
            ? (Array.isArray(appointment.billing_records) ? appointment.billing_records : [appointment.billing_records])
            : [];
          const billingCount = billingRecords.filter(
            (b: any) => b.appointment_id === appointment.id
          ).length || 0;
          
          if (billingCount === 0 && appointment.status?.toLowerCase() !== "cancelada") {
            issues.push({
              type: "facturacion",
              patient_id: patient.id,
              patient_name: patientName,
              field: "billing_records",
              issue: `Cita ${(appointment.id || "?").slice(0, 8)} sin registro de pago`,
              severity: "alta",
              suggested_action: "Crear registro de pago para la cita",
              question_for_professional: `¿La cita del ${appointment.appointment_date?.substring(0, 10)} fue facturada? ¿Cuál fue el monto?`
            });
          }
        }
      }
      
      // 2.7. Estado in_treatment inconsistente
      if (patient.in_treatment === true) {
        const lastAppointment = patient.appointments?.sort((a: any, b: any) => 
          new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
        )[0];
        
        if (lastAppointment) {
          const lastAppointmentDate = new Date(lastAppointment.appointment_date);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          
          if (lastAppointmentDate < sixMonthsAgo) {
            issues.push({
              type: "estado",
              patient_id: patient.id,
              patient_name: patientName,
              field: "in_treatment",
              issue: "Paciente en tratamiento pero sin citas recientes (>6 meses)",
              severity: "media",
              suggested_action: "Revisar estado de tratamiento",
              question_for_professional: "¿Este paciente sigue en tratamiento activo?"
            });
          }
        }
      }
      
      // 2.8. Sin clínica asignada
      if (!patient.patient_clinics || patient.patient_clinics.length === 0) {
        issues.push({
          type: "organizacion",
          patient_id: patient.id,
          patient_name: patientName,
          field: "patient_clinics",
          issue: "No tiene clínica/sede asignada",
          severity: "media",
          suggested_action: "Asignar clínica principal",
          question_for_professional: "¿En qué clínica atiende principalmente este paciente?"
        });
      }
    }
    
    // 3. Auditoría de anotaciones Notion (simulada - necesita integración real)
    console.log("📋 Buscando posibles anotaciones de Notion no importadas...");
    
    // Esto sería reemplazado por una consulta real a Notion API
    issues.push({
      type: "notion_integracion",
      patient_id: "SISTEMA",
      patient_name: "Sistema completo",
      field: "notion_anotaciones",
      issue: "Anotaciones de Notion no integradas automáticamente",
      severity: "alta",
      suggested_action: "Implementar parser de anotaciones Notion → citas",
      question_for_professional: "¿Qué tipo de anotaciones en Notion deberían convertirse automáticamente en citas?"
    });
    
    return issues;
    
  } catch (error) {
    console.error("❌ Error en auditoría:", error);
    return [];
  }
}

async function generateQuestionnaire(issues: AuditIssue[]): Promise<string> {
  console.log("\n📝 Generando cuestionario para el profesional...");
  
  // Agrupar issues por tipo y severidad
  const issuesByType: Record<string, AuditIssue[]> = {};
  const issuesBySeverity: Record<string, AuditIssue[]> = {
    alta: [],
    media: [],
    baja: []
  };
  
  for (const issue of issues) {
    if (!issuesByType[issue.type]) {
      issuesByType[issue.type] = [];
    }
    issuesByType[issue.type].push(issue);
    
    issuesBySeverity[issue.severity].push(issue);
  }
  
  // Generar cuestionario estructurado
  let questionnaire = `# 📋 CUESTIONARIO DE AUDITORÍA - MELOSMILE\n\n`;
  questionnaire += `**Fecha:** ${new Date().toISOString().split('T')[0]}\n`;
  questionnaire += `**Total issues encontrados:** ${issues.length}\n`;
  questionnaire += `**Issues alta:** ${issuesBySeverity.alta.length} | **media:** ${issuesBySeverity.media.length} | **baja:** ${issuesBySeverity.baja.length}\n\n`;
  
  questionnaire += `## 🔴 ISSUES DE ALTA PRIORIDAD (${issuesBySeverity.alta.length})\n\n`;
  
  for (const issue of issuesBySeverity.alta) {
    questionnaire += `### ❗ ${issue.patient_name}\n`;
    questionnaire += `- **Campo:** ${issue.field}\n`;
    questionnaire += `- **Problema:** ${issue.issue}\n`;
    questionnaire += `- **Pregunta:** ${issue.question_for_professional || "Revisar manualmente"}\n`;
    questionnaire += `- **Acción sugerida:** ${issue.suggested_action}\n\n`;
  }
  
  questionnaire += `## 🟡 ISSUES DE PRIORIDAD MEDIA (${issuesBySeverity.media.length})\n\n`;
  
  for (const issue of issuesBySeverity.media) {
    questionnaire += `### ⚠️  ${issue.patient_name}\n`;
    questionnaire += `- **Campo:** ${issue.field}\n`;
    questionnaire += `- **Problema:** ${issue.issue}\n`;
    if (issue.question_for_professional) {
      questionnaire += `- **Pregunta:** ${issue.question_for_professional}\n`;
    }
    questionnaire += `- **Acción sugerida:** ${issue.suggested_action}\n\n`;
  }
  
  questionnaire += `## 📊 RESUMEN POR TIPO\n\n`;
  
  for (const [type, typeIssues] of Object.entries(issuesByType)) {
    questionnaire += `### ${type.toUpperCase()} (${typeIssues.length} issues)\n`;
    
    const patientsAffected = new Set(typeIssues.map(i => i.patient_name));
    questionnaire += `- **Pacientes afectados:** ${Array.from(patientsAffected).join(', ')}\n`;
    questionnaire += `- **Ejemplos:** ${typeIssues.slice(0, 3).map(i => i.issue).join(', ')}${typeIssues.length > 3 ? '...' : ''}\n\n`;
  }
  
  questionnaire += `## 🤔 PREGUNTAS CLAVE PARA EL PROFESIONAL\n\n`;
  
  // Extraer preguntas únicas
  const uniqueQuestions = new Set<string>();
  for (const issue of issues) {
    if (issue.question_for_professional) {
      uniqueQuestions.add(issue.question_for_professional);
    }
  }
  
  let questionNumber =2961;
  for (const question of Array.from(uniqueQuestions)) {
    questionnaire += `${questionNumber}. ${question}\n`;
    questionNumber++;
  }
  
  questionnaire += `\n## 🚀 RECOMENDACIONES DE IMPLEMENTACIÓN\n\n`;
  questionnaire += `1. **Parser Notion:** Desarrollar sistema que convierta anotaciones en citas automáticas\n`;
  questionnaire += `2. **Validación en tiempo real:** Añadir validaciones al crear/editar pacientes\n`;
  questionnaire += `3. **Dashboard de auditoría:** Crear panel para monitorear datos incompletos\n`;
  questionnaire += `4. **Workflow de corrección:** Proceso para resolver issues identificados\n`;
  
  return questionnaire;
}

async function saveResults(issues: AuditIssue[], questionnaire: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsDir = "./audit_results";
  
  try {
    await Deno.mkdir(resultsDir, { recursive: true });
  } catch (_e) {
    // El directorio ya existe
  }
  
  // Guardar issues en JSON
  const issuesFile = `${resultsDir}/patient_audit_issues_${timestamp}.json`;
  await Deno.writeTextFile(issuesFile, JSON.stringify({
    audit_timestamp: new Date().toISOString(),
    total_issues: issues.length,
    issues_by_severity: {
      alta: issues.filter(i => i.severity === "alta").length,
      media: issues.filter(i => i.severity === "media").length,
      baja: issues.filter(i => i.severity === "baja").length
    },
    issues: issues
  }, null, 2));
  
  // Guardar cuestionario en Markdown
  const questionnaireFile = `${resultsDir}/professional_questionnaire_${timestamp}.md`;
  await Deno.writeTextFile(questionnaireFile, questionnaire);
  
  // Crear resumen ejecutivo
  let summary = `# 📊 RESUMEN EJECUTIVO AUDITORÍA PACIENTES\n\n`;
  summary += `**Fecha:** ${new Date().toISOString().split('T')[0]}\n`;
  summary += `**Total pacientes auditados:** ${await getPatientCount()}\n`;
  summary += `**Total issues encontrados:** ${issues.length}\n\n`;
  summary += `## 📈 MÉTRICAS CLAVE\n\n`;
  summary += `- **Issues alta prioridad:** ${issues.filter(i => i.severity === "alta").length}\n`;
  summary += `- **Issues media prioridad:** ${issues.filter(i => i.severity === "media").length}\n`;
  summary += `- **Issues baja prioridad:** ${issues.filter(i => i.severity === "baja").length}\n\n`;
  summary += `## 🎯 ÁREAS CRÍTICAS\n\n`;
  
  const criticalAreas = issues.filter(i => i.severity === "alta").slice(0, 5);
  for (const area of criticalAreas) {
    summary += `- ${area.issue} (${area.patient_name})\n`;
  }
  
  summary += `\n## 📁 ARCHIVOS GENERADOS\n\n`;
  summary += `1. **Issues detallados:** ${issuesFile}\n`;
  summary += `2. **Cuestionario profesional:** ${questionnaireFile}\n`;
  summary += `3. **Este resumen:** ${resultsDir}/audit_summary_${timestamp}.md\n`;
  
  const summaryFile = `${resultsDir}/audit_summary_${timestamp}.md`;
  await Deno.writeTextFile(summaryFile, summary);
  
  console.log(`\n📁 Resultados guardados en: ${resultsDir}/`);
  console.log(`📄 Issues detallados: ${issuesFile}`);
  console.log(`📝 Cuestionario profesional: ${questionnaireFile}`);
  console.log(`📊 Resumen ejecutivo: ${summaryFile}`);
}

async function getPatientCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("patients")
      .select("*", { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  } catch (_e) {
    return 0;
  }
}

async function main() {
  console.log("🔍 AUDITORÍA COMPLETA DE DATOS PACIENTES - MELOSMILE");
  console.log("=" .repeat(60));
  console.log(`📅 Fecha: ${new Date().toISOString()}`);
  console.log(`🔗 Base de datos: ${SUPABASE_URL}`);
  console.log("=" .repeat(60));
  
  // Ejecutar auditoría
  const issues = await auditPatientData();
  
  if (issues.length === 0) {
    console.log("✅ No se encontraron issues en la auditoría.");
    return;
  }
  
  console.log(`\n📊 RESULTADOS DE LA AUDITORÍA:`);
  console.log(`✅ Issues encontrados: ${issues.length}`);
  
  // Contar por severidad
  const altaCount = issues.filter(i => i.severity === "alta").length;
  const mediaCount = issues.filter(i => i.severity === "media").length;
  const bajaCount = issues.filter(i => i.severity === "baja").length;
  
  console.log(`🔴 Alta prioridad: ${altaCount}`);
  console.log(`🟡 Media prioridad: ${mediaCount}`);
  console.log(`🟢 Baja prioridad: ${bajaCount}`);
  
  // Generar cuestionario
  const questionnaire = await generateQuestionnaire(issues);
  
  // Guardar resultados
  await saveResults(issues, questionnaire);
  
  console.log("\n" + "=" .repeat(60));
  console.log("🎉 AUDITORÍA COMPLETADA");
  console.log("=" .repeat(60));
  
  // Mostrar issues más críticos
  console.log("\n🔴 ISSUES MÁS CRÍTICOS:");
  const criticalIssues = issues.filter(i => i.severity === "alta").slice(0, 5);
  for (const issue of criticalIssues) {
    console.log(`❌ ${issue.patient_name}: ${issue.issue}`);
  }
  
  console.log("\n📋 El cuestionario profesional ha sido generado con todas las preguntas");
  console.log("para resolver las dudas identificadas en los datos.");
}

if (import.meta.main) {
  await main();
}