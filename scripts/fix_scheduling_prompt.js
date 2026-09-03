/* fix_scheduling_prompt.js — Refuerza el systemMessage del Agent_Scheduling
   para que el LLM pase TODOS los campos al crear una cita (fix tool-calling
   "did not match expected schema": pasaba solo {"action":"create"}).
   USO: node fix_scheduling_prompt.js            # prod (default)
        node fix_scheduling_prompt.js --dev       # dev
 */
const fs=require('fs'), os=require('os');
const isDev=process.argv.includes('--dev');
const BASE=process.env.N8N_URL || (isDev?'https://n8n.mumaweb.com':'https://n8nv2.mumaweb.com');
const KEY=fs.readFileSync(process.env.N8N_KEY || `${os.homedir()}/.config/opencode/secrets/${isDev?'n8n-dev.jwt':'n8n.jwt'}`,'utf8').trim();
const WORKFLOW=process.env.WF_ID || 'd74hAW8IkmmCqoh5'; // Agendamiento prod; en dev igual id del JSON

const NEW_BLOCK = `
REGLAS DE CREACIÓN DE CITA (OBLIGATORIO — lee con atención):
- Para agendar una NUEVA cita, DEBES llamar a 'Tool_Appointment_Manager' pasando TODOS los campos en la MISMA llamada:
    action = "create"
    patient_name = <nombre completo del paciente>
    appointment_date = <fecha Y hora concreta, ej: próximo martes 8 de septiembre a las 10:30>
    reason = <motivo/tratamiento, ej: Limpieza dental>
    clinic = <nombre de la clínica>
- IMPORTANTE: los campos patient_name, appointment_date, reason y clinic son OBLIGATORIOS. Si el usuario NO te ha dado alguno de ellos, NO llames a la herramienta con datos vacíos.
- Si te falta algún dato (por ejemplo el nombre del paciente, la fecha concreta, el motivo o la clínica), pregunta amablemente al usuario por el dato que falta ANTES de llamar a la herramienta. Solo llama a Tool_Appointment_Manager cuando tengas TODOS los datos.
`;

const H={'X-N8N-API-KEY':KEY,'Content-Type':'application/json'};
(async()=>{
  const res=await fetch(`${BASE}/api/v1/workflows/${WORKFLOW}`,{headers:H});
  const wf=await res.json();
  if(!res.ok){console.error('GET fail',res.status);process.exit(1);}
  let changed=0;
  for(const n of wf.nodes){
    if(n.type==='@n8n/n8n-nodes-langchain.agent' && n.name==='Agent_Scheduling'){
      const opts=n.parameters.options||{};
      let sm=opts.systemMessage||'';
      if(!sm.includes('REGLAS DE CREACIÓN DE CITA (OBLIGATORIO')){
        // insertar el bloque tras "REGLAS DE CREACIÓN:"
        if(sm.includes('REGLAS DE CREACIÓN:')){
          sm=sm.replace('REGLAS DE CREACIÓN:', 'REGLAS DE CREACIÓN:') + NEW_BLOCK;
        } else {
          sm = sm + NEW_BLOCK;
        }
        n.parameters.options={...opts, systemMessage: sm};
        changed++;
      }
    }
  }
  if(!changed){console.log('⏭ sin cambios (prompt ya actualizado o nodo no encontrado)');process.exit(0);}
  const {name,nodes,connections,settings}=wf;
  const pr=await fetch(`${BASE}/api/v1/workflows/${WORKFLOW}`,{method:'PUT',headers:H,body:JSON.stringify({name,nodes,connections,settings})});
  const pd=await pr.json();
  if(pr.ok) console.log('✅ systemMessage del Agent_Scheduling actualizado en '+BASE+' (workflow '+WORKFLOW+')');
  else console.error('✗ PUT fail',pr.status, pd.message);
})().catch(e=>{console.error('Fatal:',e.message);process.exit(1);});
