const DISPATCHER_URL = "https://n8n.mumaweb.com/webhook/melosmile-ai-dispatcher";
const SESSION_ID = "smoke_test_" + Date.now();

async function sendPrompt(stepName, prompt) {
  console.log(`\n========================================`);
  console.log(`🧪 PRUEBA: ${stepName}`);
  console.log(`💬 PROMPT: "${prompt}"`);
  console.log(`========================================`);

  try {
    const start = Date.now();
    const res = await fetch(DISPATCHER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: prompt,
        session_id: SESSION_ID
      })
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    const data = Array.isArray(json) ? json[0] : json;

    console.log(`⏱️ Tiempo: ${elapsed}s | Status HTTP: ${res.status}`);
    console.log(`🎯 Intent detectado: ${data?.intent || 'Desconocido'}`);
    console.log(`📌 Entidades extraídas:`, JSON.stringify(data?.extracted_entities || {}, null, 2));
    console.log(`📝 Resumen / Respuesta: ${data?.summary || data?.message || data?.output || text}`);
    
    return data;
  } catch (err) {
    console.error(`❌ Error en ${stepName}:`, err.message);
  }
}

async function runSmokeTest() {
  console.log(`🚀 INICIANDO SMOKE TEST DE AGENTES MELOSMILE`);
  console.log(`Session ID: ${SESSION_ID}`);

  // Test 1: Agendar cita Munir Callaos para mañana
  await sendPrompt(
    "1. Agendar cita para Munir Callaos",
    "Por favor agenda una cita para el paciente Munir Callaos para mañana a las 14:00 para revision y control ortodoncia."
  );

  console.log(`\n========================================`);
  console.log(`✅ SMOKE TEST FINALIZADO`);
  console.log(`========================================\n`);
}

runSmokeTest();
