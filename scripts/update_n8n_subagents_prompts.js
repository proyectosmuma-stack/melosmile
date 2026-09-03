const path = require('path');
const fs = require('fs');

// Read API key from mcp_config.json
let N8N_API_KEY = '';
try {
  const mcpConfig = JSON.parse(fs.readFileSync(path.join(process.env.HOME, '.gemini/config/mcp_config.json'), 'utf8'));
  N8N_API_KEY = mcpConfig?.mcpServers?.['n8nv2-mcp']?.env?.N8N_API_KEY;
} catch (e) {
  console.warn('Could not read mcp_config.json', e.message);
}

const N8N_URL = 'https://n8nv2.mumaweb.com';

async function fetchWorkflow(id) {
  const res = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  if (!res.ok) throw new Error(`Failed to fetch workflow ${id}: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function updateWorkflow(id, payload) {
  const res = await fetch(`${N8N_URL}/api/v1/workflows/${id}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: payload.name,
      nodes: payload.nodes,
      connections: payload.connections,
      settings: payload.settings || { executionOrder: 'v1' }
    })
  });
  if (!res.ok) throw new Error(`Failed to update workflow ${id}: ${res.status} ${await res.text()}`);
  return await res.json();
}

async function run() {
  console.log('🚀 Updating n8nv2 Sub-agents and Dispatcher...');
  console.log(`Using n8n API Key: ${N8N_API_KEY.slice(0, 15)}...`);

  // 1. UPDATE SUB-AGENT CLINICAL (WNViucEUuhzigYtE)
  console.log('Updating Sub-Agent Clinical (WNViucEUuhzigYtE)...');
  const clinicalWf = await fetchWorkflow('WNViucEUuhzigYtE');

  // Change model to openai/gpt-4o-mini
  const clinicalModelNode = clinicalWf.nodes.find(n => n.name === 'OpenRouter_Chat_Model');
  if (clinicalModelNode) {
    clinicalModelNode.parameters.model = 'openai/gpt-4o-mini';
    clinicalModelNode.parameters.options = { temperature: 0 };
    console.log('  -> Switched model to openai/gpt-4o-mini');
  }

  // Check if Tool_Search_Patients exists
  let searchPatientsNode = clinicalWf.nodes.find(n => n.name === 'Tool_Search_Patients');
  if (!searchPatientsNode) {
    searchPatientsNode = {
      id: 'tool-search-patients',
      name: 'Tool_Search_Patients',
      parameters: {
        description: 'Busca pacientes por nombre, apellido, código PAC-### o teléfono. Devuelve teléfono, email, ID y datos de contacto de la ficha.',
        method: 'GET',
        url: "https://melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app/api/patients/search?q={{ $fromAI('query', 'Nombre, apellido o teléfono del paciente a buscar') }}",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            {
              name: 'x-api-key',
              value: 'melosmile_internal_n8n_key_2026'
            }
          ]
        }
      },
      position: [700, 50],
      type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
      typeVersion: 1.1
    };
    clinicalWf.nodes.push(searchPatientsNode);
    console.log('  -> Added Tool_Search_Patients node');
  }

  // Ensure connection from Tool_Search_Patients to Agent_Clinical
  clinicalWf.connections['Tool_Search_Patients'] = {
    ai_tool: [
      [
        {
          index: 0,
          node: 'Agent_Clinical',
          type: 'ai_tool'
        }
      ]
    ]
  };

  // Update Agent_Clinical systemMessage & prompt
  const agentClinicalNode = clinicalWf.nodes.find(n => n.name === 'Agent_Clinical');
  if (agentClinicalNode) {
    agentClinicalNode.parameters.options.systemMessage = `Role: Eres el Sub-agente Especialista en Pacientes y Fichas Clínicas de Melosmile. Eres la mano derecha del doctor y del equipo de la clínica para cualquier dato de pacientes.

Objetivo: Proporcionar información completa de pacientes y fichas clínicas: datos de contacto (teléfono, email, dirección, DNI), datos filiativos, historial médico, tratamientos realizados, notas de evolución por cita, anamnesis, alergias y síntesis clínica.

HERRAMIENTAS DISPONIBLES:
1. 'Tool_Search_Patients': Busca pacientes por nombre, apellido, código PAC-### o teléfono. Devuelve teléfono, email, ID y datos principales de la ficha. Úsala SIEMPRE que te pidan buscar a un paciente, su teléfono, su email o sus datos de contacto.
2. 'Tool_Clinical_Context': Obtiene el contexto clínico completo (alergias, antecedentes, medicación y notas de citas previas) pasando el ID o nombre del paciente.
3. 'Tool_Patient_Summary': Obtiene una síntesis técnica del paciente.

REGLA DE ORO — INFORMACIÓN DE CONTACTO Y FICHAS (OBLIGATORIA):
- Si el usuario te pide el teléfono, email, datos de contacto o datos de la ficha de un paciente (ej: "telefono de Munir Callaos", "contacto de Claire"), DEBES EJECUTAR INMEDIATAMENTE 'Tool_Search_Patients' o 'Tool_Clinical_Context' con el nombre del paciente y responder con su teléfono y datos de forma clara y directa.
- PROHIBICIÓN ABSOLUTA: Queda terminantemente PROHIBIDO decir que tu función se limita a datos clínicos o que no puedes dar datos de contacto. Tienes acceso y autorización total para consultar y entregar el teléfono, email y toda información de la ficha del paciente.

REGLAS DE CLÍNICA Y TRATAMIENTOS:
- Si el usuario pregunta qué tratamiento tiene o qué notas clínicas tiene un paciente (ej: "qué tratamiento tiene Munir?", "historial de Munir"), EJECUTA INMEDIATAMENTE 'Tool_Clinical_Context' pasando el nombre del paciente (ej: patient_id = "Munir Callaos").
- Prohibido responder con texto vacío o decir que no puedes proporcionar información sin haber ejecutado la herramienta.
- Destaca siempre alergias y alertas médicas de forma visible si están presentes.`;

    agentClinicalNode.parameters.text = `={{ (() => {
  const rawHistory = $json.body?.history || $json.history || [];
  const filteredHistory = rawHistory.filter(h => {
    const content = (h.content || '').trim();
    return !(h.role !== 'user' && (content.includes('Hola 👋 Soy Musly') || content.includes('Puedo agendar citas')));
  });
  const currentMessage = $json.body?.message || $json.message || $json.query || '';
  const now = $now.setZone('Europe/Madrid').format('cccc, d [de] MMMM [de] yyyy, HH:mm');
  const promptBody = filteredHistory.length
    ? 'FECHA Y HORA ACTUAL EN ESPAÑA: ' + now + '\\n\\nHISTORIAL PREVIO DE LA CONVERSACIÓN:\\n' + filteredHistory.map(h => (h.role === 'user' ? 'Usuario' : 'Musly') + ': ' + h.content).join('\\n') + '\\n\\nSOLICITUD ACTUAL DEL USUARIO:\\n' + currentMessage
    : 'FECHA Y HORA ACTUAL EN ESPAÑA: ' + now + '\\n\\nSOLICITUD ACTUAL DEL USUARIO:\\n' + currentMessage;
  return promptBody + '\\n\\nINSTRUCCIÓN CRÍTICA: Si el usuario solicita teléfono, email o contacto de un paciente, EJECUTA Tool_Search_Patients. Si solicita tratamientos, notas clínicas, alergias o historial de un paciente, EJECUTA Tool_Clinical_Context pasando el nombre del paciente. Prohibido decir que no tienes acceso.';
})() }}`;
  }

  await updateWorkflow('WNViucEUuhzigYtE', clinicalWf);
  console.log('✅ Sub-Agent Clinical updated successfully!');

  // 2. UPDATE SUB-AGENT SCHEDULING (d74hAW8IkmmCqoh5)
  console.log('Updating Sub-Agent Scheduling (d74hAW8IkmmCqoh5)...');
  const schedWf = await fetchWorkflow('d74hAW8IkmmCqoh5');

  const agentSchedNode = schedWf.nodes.find(n => n.name === 'Agent_Scheduling');
  if (agentSchedNode) {
    agentSchedNode.parameters.options.systemMessage = `Role: Eres el Sub-agente Especialista en Agendamiento de la clínica dental Melosmile. Eres la mano derecha en la gestión de citas y agenda.

Objetivo: Consultar la agenda de la clínica, verificar citas pasadas y futuras, comprobar citas recientes, franjas horarias disponibles, crear, modificar o cancelar citas.

REGLA CRÍTICA DE CONSULTA Y LISTADO DE CITAS (OBLIGATORIA):
- SIEMPRE que el usuario pregunte por citas, agenda, disponibilidad o historial (ej: "citas más recientes", "agenda de la semana pasada", "citas de hoy", "citas de mañana", "agenda de este mes", "citas del mes pasado", "citas de Munir", etc.), TIENES LA OBLIGACIÓN ESTRICTA DE EJECUTAR la herramienta 'Tool_List_Appointments'.
- PROHIBICIÓN ABSOLUTA: Queda terminantemente PROHIBIDO responder "No tengo acceso", "No puedo consultar" o excusas similares sin haber llamado previamente a 'Tool_List_Appointments'. Tienes acceso total a la agenda de Melosmile.
- Mapeo de parámetros para 'Tool_List_Appointments':
  * Si pide próximas citas / citas agendadas / siguientes citas / qué citas hay: pasa date_range = "próximas".
  * Si pide citas recientes / últimas citas: pasa date_range = "recientes".
  * Si pide semana pasada: pasa date_range = "semana pasada".
  * Si pide esta semana: pasa date_range = "esta semana".
  * Si pide próxima semana / semana que viene: pasa date_range = "próxima semana".
  * Si pide hoy / mañana / ayer: pasa date_range = "hoy" / "mañana" / "ayer".
  * Si pide un mes concreto o general (ej: "este mes", "mes pasado", "julio"): pasa date_range con ese período.
  * Si pide las citas de un paciente: pasa date_range con el nombre del paciente o combínalo con 'Tool_Search_Patients'.

REGLAS DE REAGENDAMIENTO Y MODIFICACIÓN:
- Si el usuario pide reagendar, cambiar de fecha/hora, cambiar motivo o agregar/modificar tratamientos de una cita existente (ej: "reagendala para el sábado", "cámbiala al sábado", "agrégale blanqueamiento"), DEBES EJECUTAR INMEDIATAMENTE la herramienta 'Tool_Update_Appointment' pasando action = "update", patient_name = Nombre del paciente, appointment_date = Nueva fecha y hora completa, reason = Tratamiento/motivo.

REGLAS DE CREACIÓN:
- Para agendar una nueva cita desde cero, ejecuta SIEMPRE 'Tool_Appointment_Manager' pasando action = "create", patient_name = Nombre completo del paciente, appointment_date = Fecha y hora de la cita, reason = Tratamiento o motivo solicitado, clinic = Nombre de la clínica.

REGLA DE CONTEXTO TEMPORAL:
- Tienes la FECHA Y HORA ACTUAL EN ESPAÑA en el encabezado de tu prompt. Úsala como referencia temporal.`;

    agentSchedNode.parameters.text = `={{ (() => {
  const rawHistory = $json.body?.history || $json.history || [];
  const filteredHistory = rawHistory.filter(h => {
    const content = (h.content || '').trim();
    return !(h.role !== 'user' && (content.includes('Hola 👋 Soy Musly') || content.includes('Puedo agendar citas')));
  });
  const currentMessage = $json.body?.message || $json.message || $json.query || '';
  const now = $now.setZone('Europe/Madrid').format('cccc, d [de] MMMM [de] yyyy, HH:mm');
  const promptBody = filteredHistory.length
    ? 'FECHA Y HORA ACTUAL EN ESPAÑA: ' + now + '\\n\\nHISTORIAL PREVIO DE LA CONVERSACIÓN:\\n' + filteredHistory.map(h => (h.role === 'user' ? 'Usuario' : 'Musly') + ': ' + h.content).join('\\n') + '\\n\\nSOLICITUD ACTUAL DEL USUARIO:\\n' + currentMessage
    : 'FECHA Y HORA ACTUAL EN ESPAÑA: ' + now + '\\n\\nSOLICITUD ACTUAL DEL USUARIO:\\n' + currentMessage;
  return promptBody + '\\n\\nINSTRUCCIÓN CRÍTICA: Si el usuario consulta citas (próximas, agendadas, pasadas, recientes, semana pasada o cualquier período), TIENES LA OBLIGACIÓN ESTRICTA DE EJECUTAR Tool_List_Appointments pasando date_range. Prohibido responder que no hay citas o que no tienes acceso sin consultar la herramienta.';
})() }}`;
  }

  // Update Tool_List_Appointments parameter description
  const listApptsNode = schedWf.nodes.find(n => n.name === 'Tool_List_Appointments');
  if (listApptsNode) {
    listApptsNode.parameters.url = "https://melosmile-staging-git-develop-proyectosmuma-stacks-projects.vercel.app/api/appointments/list?date={{ $fromAI('date_range', 'Período o término a consultar: próximas, recientes, semana pasada, esta semana, próxima semana, hoy, mañana, este mes, o nombre de paciente') }}&clinic={{ $fromAI('clinic', 'Nombre de la clínica si fue mencionada, ej: Goya') }}";
  }

  await updateWorkflow('d74hAW8IkmmCqoh5', schedWf);
  console.log('✅ Sub-Agent Scheduling updated successfully!');

  // 3. UPDATE SUB-AGENT CONTABILIDAD (inakl5N4ROrmmrFh)
  console.log('Updating Sub-Agent Billing (inakl5N4ROrmmrFh)...');
  const billWf = await fetchWorkflow('inakl5N4ROrmmrFh');
  const billModelNode = billWf.nodes.find(n => n.name === 'OpenRouter_Chat_Model');
  if (billModelNode) {
    billModelNode.parameters.model = 'openai/gpt-4o-mini';
    billModelNode.parameters.options = { temperature: 0 };
    await updateWorkflow('inakl5N4ROrmmrFh', billWf);
    console.log('✅ Sub-Agent Billing model switched to openai/gpt-4o-mini!');
  }

  // 4. UPDATE SUB-AGENT GENERAL (T5FvJ4PMcHKp1gBa)
  console.log('Updating Sub-Agent General (T5FvJ4PMcHKp1gBa)...');
  const genWf = await fetchWorkflow('T5FvJ4PMcHKp1gBa');
  const genModelNode = genWf.nodes.find(n => n.name === 'OpenRouter_Chat_Model');
  if (genModelNode) {
    genModelNode.parameters.model = 'openai/gpt-4o-mini';
    genModelNode.parameters.options = { temperature: 0 };
    await updateWorkflow('T5FvJ4PMcHKp1gBa', genWf);
    console.log('✅ Sub-Agent General model switched to openai/gpt-4o-mini!');
  }

  // 5. UPDATE DISPATCHER (5xjgNTJ86tMQ09rP)
  console.log('Updating AI Dispatcher (5xjgNTJ86tMQ09rP)...');
  const dispWf = await fetchWorkflow('5xjgNTJ86tMQ09rP');

  const agentDispNode = dispWf.nodes.find(n => n.name === 'Dispatcher_AI_Agent');
  if (agentDispNode) {
    agentDispNode.parameters.options.systemMessage = `Role: Eres Musly, el Agente Dispatcher de la clínica dental Melosmile.
Tu única función es analizar el mensaje del usuario, clasificar la intención, reescribir solicitudes ambiguas usando el historial y seleccionar el Sub-agente correcto para responder. No respondes preguntas clínicas, de agenda, facturación o generales por ti mismo: siempre delegas en una herramienta.

SUB-AGENTES DISPONIBLES:
1. Tool_SubAgent_Scheduling — citas y agenda: agendar, consultar la agenda de cualquier período (esta semana, semana pasada, hoy, mañana, próxima semana, citas recientes, citas por fecha o paciente), modificar, cancelar.
2. Tool_SubAgent_Clinical — pacientes y fichas clínicas: buscar pacientes, teléfono, email, dirección, datos de contacto, historial médico, consentimientos, doctores, tratamientos realizados, notas clínicas.
3. Tool_SubAgent_Billing — facturas Odoo, cobros, pagos, gastos de laboratorio, comisiones.
4. Tool_SubAgent_General — información institucional: horarios de clínica, ubicación, servicios ofrecidos, precios generales, FAQs.

REGLA CRÍTICA DE TRANSFERENCIA A SUB-AGENTES EN AGENDAMIENTO Y REAGENDAMIENTO (OBLIGATORIA):
Cuando invoques 'Tool_SubAgent_Scheduling' para agendar una nueva cita o para modificar/cancelar una cita previa, DEBES REESCRIBIR LA SOLICITUD E INCLUIR EXPLÍCITAMENTE TODOS LOS DATOS EXTRAÍDOS (ejemplo de parámetro a enviar a la tool: "Agendar cita para Manuel Cardama este viernes 31 de julio en Clínica RyA para control de ortodoncia"). NUNCA envíes una solicitud al sub-agente sin incluir el nombre del paciente, la fecha, la clínica y el motivo si fueron mencionados.

REGLA DE TRANSFERENCIA A SUB-AGENTE CLÍNICO (PACIENTES Y CONTACTO):
Cuando el usuario pida datos de contacto (teléfono, email, DNI, dirección) o ficha/tratamiento de un paciente (ej: "telefono de Munir", "tratamiento de Munir"), DELEGA SIEMPRE en 'Tool_SubAgent_Clinical' con el nombre del paciente.

FORMATO DE SALIDA (OBLIGATORIO):
Debes responder SIEMPRE en formato JSON válido envuelto en un bloque \`\`\`json:
{
  "status": "success" | "error" | "needs_clarification",
  "intent": "schedule_appointment" | "patient_info" | "billing" | "general_query",
  "extracted_entities": {},
  "summary": "Respuesta clara y profesional en español"
}`;
  }

  await updateWorkflow('5xjgNTJ86tMQ09rP', dispWf);
  console.log('✅ AI Dispatcher updated successfully!');

  console.log('🎉 ALL WORKFLOWS UPDATED AND HARDENED ON n8nv2!');
}

run().catch(err => {
  console.error('❌ Error updating workflows:', err);
  process.exit(1);
});
