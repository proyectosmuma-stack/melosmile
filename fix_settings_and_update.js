const N8N_BASE = "https://n8n.mumaweb.com/api/v1";
const N8N_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhODM3MjcyMy0wODhkLTQ0MWQtYTc0OS0zNjBmMGVhYjQyOTUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMGNjNzEyYWYtMWE4OC00YWQ5LTkzMGEtNTA1ZWY4NGM3MDZhIiwiaWF0IjoxNzcxNzY3NzYwfQ.RHOVLkZCyX9rqXcrdlX3X8Rg1cMYtmdXqDp3MnOHrEo";
const VERCEL_BASE = "https://frontend-eight-dusky-42.vercel.app";

async function fixAllWorkflows() {
  const ids = ["jTWHg9bHaNOdzL13", "Q7oxrbUuohca81Gn", "XSLNwq6ihH1SHPRl"];
  for (let id of ids) {
    const res = await fetch(`${N8N_BASE}/workflows/${id}`, { headers: { "X-N8N-API-KEY": N8N_KEY } });
    let w = await res.json();

    for (let node of w.nodes) {
      if (node.parameters && node.parameters.url && node.parameters.url.includes("melosmile.app")) {
        node.parameters.url = node.parameters.url.replace("https://melosmile.app", VERCEL_BASE);
      }
    }

    // Sanitize settings for n8n API schema validation
    const allowedSettingsKeys = ["executionOrder", "callerPolicy", "errorWorkflow", "timezone", "saveExecutionProgress", "saveManualExecutions", "saveDataErrorExecution", "saveDataSuccessExecution"];
    const sanitizedSettings = {};
    if (w.settings) {
      for (let key of allowedSettingsKeys) {
        if (w.settings[key] !== undefined) sanitizedSettings[key] = w.settings[key];
      }
    }

    const payload = {
      name: w.name,
      nodes: w.nodes,
      connections: w.connections,
      settings: sanitizedSettings
    };

    const putRes = await fetch(`${N8N_BASE}/workflows/${id}`, {
      method: "PUT",
      headers: { "X-N8N-API-KEY": N8N_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log(`Status for ${w.name} (${id}): ${putRes.status}`);
    if (!putRes.ok) {
      console.error("Error payload:", await putRes.text());
    }
  }
}

fixAllWorkflows();
