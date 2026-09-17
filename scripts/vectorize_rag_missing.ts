#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * vectorize_rag_missing.ts — Backfill y verificación de embeddings para el RAG MumaBot
 * ====================================================================================
 * Detecta todos los registros en agent_memory y project_memory con embedding IS NULL
 * y genera sus vectores en Ollama usando nomic-embed-text.
 *
 * Uso:
 *   deno run -A scripts/vectorize_rag_missing.ts
 *   deno run -A scripts/vectorize_rag_missing.ts --check-only
 */

const SUPABASE_URL = Deno.env.get("MUMABOT_SUPABASE_URL") || "http://192.168.1.51:54321";
const SUPABASE_KEY = Deno.env.get("MUMABOT_SUPABASE_KEY") ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const EMBEDDING_MODEL = Deno.env.get("MUMABOT_EMBEDDING_MODEL") || "nomic-embed-text";
const LOCAL_OLLAMA_URL = "http://127.0.0.1:11434/api/embeddings";
const REMOTE_OLLAMA_URL = Deno.env.get("MUMABOT_OLLAMA_URL") || "http://192.168.1.51:11434/api/embeddings";

const isCheckOnly = Deno.args.includes("--check-only");

async function getEmbedding(text: string): Promise<number[]> {
  // Intentar primero local (M3 Pro GPU - ~50ms)
  try {
    const resp = await fetch(LOCAL_OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.embedding && data.embedding.length > 0) {
        return data.embedding;
      }
    }
  } catch {
    // Fallback a remoto si local no responde
  }

  try {
    const resp = await fetch(REMOTE_OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
      signal: AbortSignal.timeout(45000),
    });
    if (!resp.ok) {
      throw new Error(`Remote Ollama status ${resp.status}: ${await resp.text()}`);
    }
    const data = await resp.json();
    return data.embedding || [];
  } catch (e) {
    console.error(`  ❌ Error obteniendo embedding: ${(e as Error).message}`);
    return [];
  }
}

async function supabaseQuery(path: string, schema = "public", method = "GET", body?: unknown) {
  let endpoint = path;
  let queryParams = "";
  if (endpoint.includes("?")) {
    const split = endpoint.split("?");
    endpoint = split[0];
    queryParams = "?" + split[1];
  }

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}${queryParams}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=representation",
      "Accept-Profile": schema,
      "Content-Profile": schema,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Supabase error ${resp.status}: ${err}`);
  }
  return resp.json();
}

console.log("==================================================================");
console.log("🔍 AUDITORÍA Y RE-VECTORIZACIÓN DE MEMORIA RAG (MumaBot)");
console.log(`   Supabase:   ${SUPABASE_URL}`);
console.log(`   Embeddings: ${EMBEDDING_MODEL} (Local GPU / ${REMOTE_OLLAMA_URL})`);
console.log("==================================================================\n");

// 1. Verificar registros nulos
const lessonsNull: Array<{ id: string; lesson: string; category: string }> =
  await supabaseQuery("agent_lessons?select=id,lesson,category&embedding=is.null", "agent_memory");

const sessionsNull: Array<{ id: string; session_id: string; summary: string }> =
  await supabaseQuery("agent_sessions?select=id,session_id,summary&embedding=is.null", "agent_memory");

const contextsNull: Array<{ id: string; project_id: string; file_path: string; content: string }> =
  await supabaseQuery("project_contexts?select=id,project_id,file_path,content&embedding=is.null", "project_memory");

const decisionsNull: Array<{ id: string; project_id: string; decision: string; rationale: string }> =
  await supabaseQuery("project_decisions?select=id,project_id,decision,rationale&embedding=is.null", "project_memory");

console.log("📊 ESTADO ACTUAL DE EMBEDDINGS PENDIENTES:");
console.log(`   - agent_lessons:    ${lessonsNull.length} pendientes`);
console.log(`   - agent_sessions:   ${sessionsNull.length} pendientes`);
console.log(`   - project_contexts: ${contextsNull.length} pendientes`);
console.log(`   - project_decisions:${decisionsNull.length} pendientes`);
console.log("------------------------------------------------------------------\n");

if (isCheckOnly) {
  Deno.exit(0);
}

const totalPending = lessonsNull.length + sessionsNull.length + contextsNull.length + decisionsNull.length;
if (totalPending === 0) {
  console.log("✅ Todo el sistema RAG ya está 100% vectorizado. No hay registros pendientes.");
  Deno.exit(0);
}

console.log(`⚡ Iniciando vectorización de ${totalPending} registros pendientes...\n`);

// 2. Vectorizar agent_lessons
if (lessonsNull.length > 0) {
  console.log(`📘 Vectorizando ${lessonsNull.length} lecciones (agent_lessons)...`);
  let count = 0;
  for (const item of lessonsNull) {
    count++;
    const snippet = item.lesson.slice(0, 60).replace(/\n/g, " ");
    const emb = await getEmbedding(item.lesson);
    if (emb.length > 0) {
      await supabaseQuery(`agent_lessons?id=eq.${item.id}`, "agent_memory", "PATCH", {
        embedding: `[${emb.join(",")}]`,
      });
      console.log(`  ✓ [${count}/${lessonsNull.length}] Lección vectorizada: "${snippet}..."`);
    } else {
      console.log(`  ⚠️ [${count}/${lessonsNull.length}] Falló vector para lección ${item.id}`);
    }
  }
  console.log("");
}

// 3. Vectorizar agent_sessions
if (sessionsNull.length > 0) {
  console.log(`📙 Vectorizando ${sessionsNull.length} sesiones (agent_sessions)...`);
  let count = 0;
  for (const item of sessionsNull) {
    count++;
    const snippet = (item.summary || item.session_id).slice(0, 60).replace(/\n/g, " ");
    const emb = await getEmbedding(item.summary);
    if (emb.length > 0) {
      await supabaseQuery(`agent_sessions?id=eq.${item.id}`, "agent_memory", "PATCH", {
        embedding: `[${emb.join(",")}]`,
      });
      console.log(`  ✓ [${count}/${sessionsNull.length}] Sesión vectorizada: "${snippet}..."`);
    } else {
      console.log(`  ⚠️ [${count}/${sessionsNull.length}] Falló vector para sesión ${item.id}`);
    }
  }
  console.log("");
}

// 4. Vectorizar project_contexts
if (contextsNull.length > 0) {
  console.log(`📗 Vectorizando ${contextsNull.length} contextos de proyectos (project_contexts)...`);
  let count = 0;
  for (const item of contextsNull) {
    count++;
    const snippet = (item.content || "").slice(0, 60).replace(/\n/g, " ");
    const emb = await getEmbedding(item.content);
    if (emb.length > 0) {
      await supabaseQuery(`project_contexts?id=eq.${item.id}`, "project_memory", "PATCH", {
        embedding: `[${emb.join(",")}]`,
      });
      console.log(`  ✓ [${count}/${contextsNull.length}] Contexto vectorizado: "${snippet}..."`);
    } else {
      console.log(`  ⚠️ [${count}/${contextsNull.length}] Falló vector para contexto ${item.id}`);
    }
  }
  console.log("");
}

// 5. Vectorizar project_decisions
if (decisionsNull.length > 0) {
  console.log(`📕 Vectorizando ${decisionsNull.length} decisiones (project_decisions)...`);
  let count = 0;
  for (const item of decisionsNull) {
    count++;
    const text = `${item.decision} ${item.rationale || ""}`.trim();
    const snippet = text.slice(0, 60).replace(/\n/g, " ");
    const emb = await getEmbedding(text);
    if (emb.length > 0) {
      await supabaseQuery(`project_decisions?id=eq.${item.id}`, "project_memory", "PATCH", {
        embedding: `[${emb.join(",")}]`,
      });
      console.log(`  ✓ [${count}/${decisionsNull.length}] Decisión vectorizada: "${snippet}..."`);
    } else {
      console.log(`  ⚠️ [${count}/${decisionsNull.length}] Falló vector para decisión ${item.id}`);
    }
  }
  console.log("");
}

// 6. Verificación final post-vectorización
console.log("==================================================================");
console.log("🔬 VERIFICACIÓN FINAL POST-PROCESO");
console.log("==================================================================");

const finalLessons: Array<{ id: string }> =
  await supabaseQuery("agent_lessons?select=id&embedding=is.null", "agent_memory");
const finalSessions: Array<{ id: string }> =
  await supabaseQuery("agent_sessions?select=id&embedding=is.null", "agent_memory");
const finalContexts: Array<{ id: string }> =
  await supabaseQuery("project_contexts?select=id&embedding=is.null", "project_memory");
const finalDecisions: Array<{ id: string }> =
  await supabaseQuery("project_decisions?select=id&embedding=is.null", "project_memory");

console.log(`   - agent_lessons pendientes:    ${finalLessons.length}`);
console.log(`   - agent_sessions pendientes:   ${finalSessions.length}`);
console.log(`   - project_contexts pendientes: ${finalContexts.length}`);
console.log(`   - project_decisions pendientes:${finalDecisions.length}`);

if (finalLessons.length === 0 && finalSessions.length === 0 && finalContexts.length === 0 && finalDecisions.length === 0) {
  console.log("\n🎉 ¡ÉXITO TOTAL! 100% de los registros RAG están correctamente vectorizados.");
} else {
  console.warn("\n⚠️ Aún quedan algunos registros sin vectorizar.");
}
