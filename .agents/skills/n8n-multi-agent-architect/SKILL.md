---
name: n8n-multi-agent-architect
description: "Specialized guide for creating multi-agent system architectures in n8n using native Sub-Workflow Tools (toolWorkflow), Dispatchers/Supervisors, AI Agents, and RTF+RODES+CoT System Prompts."
risk: safe
source: "melosmile-ai-architecture"
date_added: "2026-07-23"
---

# n8n Multi-Agent System Architect Guide

A comprehensive, production-ready guide for designing, building, and deploying multi-agent AI systems in n8n using native Sub-Workflow Tools (`toolWorkflow`), Dispatcher/Supervisor patterns, and optimized System Prompts.

---

## 🏛️ Architecture Overview

A multi-agent system in n8n consists of:

1. **AI Dispatcher / Supervisor Agent**:
   - Acts as the central intelligence and router.
   - Evaluates user intent and extracts key entities.
   - Dynamically delegates tasks to specialized sub-agents.
   - Synthesizes and formats the final user-facing response.

2. **Native Sub-Agent Tools (`@n8n/n8n-nodes-langchain.toolWorkflow`)**:
   - Packages sub-agent workflows as native tools for the main Dispatcher.
   - Runs directly in-memory within n8n without HTTP network roundtrips.
   - Provides instant execution, zero network latency, and high security.

3. **Specialized Sub-Agents**:
   - Autonomous workflows with their own System Message and specific capabilities (e.g., Scheduling, Clinical, Billing, Inventory, Odoo ERP).
   - Equipped with dedicated API tools (`toolHttpRequest` or `toolCode`).
   - Triggered via `Execute Workflow Trigger` (`n8n-nodes-base.executeWorkflowTrigger`) and optional `Webhook`.

---

## 🔌 Connection Flow & AI Ports (`sourceOutput`)

In n8n AI Agent workflows, AI connections flow **TO the consumer** (the AI Agent node):

```
[Google Gemini / LLM] -------- sourceOutput: "ai_languageModel" -------> [Dispatcher Agent]
[Sub-Agent Tool 1] ----------- sourceOutput: "ai_tool" ---------------> [Dispatcher Agent]
[Sub-Agent Tool 2] ----------- sourceOutput: "ai_tool" ---------------> [Dispatcher Agent]
[Memory Buffer] -------------- sourceOutput: "ai_memory" -------------> [Dispatcher Agent]
```

### Connection Types Summary

| Connection Type | Source Node | Target Node | Purpose |
|-----------------|-------------|-------------|---------|
| `ai_languageModel` | `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` | `@n8n/n8n-nodes-langchain.agent` | Provides the LLM model to the agent |
| `ai_tool` | `@n8n/n8n-nodes-langchain.toolWorkflow` | `@n8n/n8n-nodes-langchain.agent` | Connects sub-agent workflows as tools |
| `ai_tool` | `@n8n/n8n-nodes-langchain.toolHttpRequest` | `@n8n/n8n-nodes-langchain.agent` | Connects external APIs as tools |
| `ai_memory` | `@n8n/n8n-nodes-langchain.memoryBufferWindow` | `@n8n/n8n-nodes-langchain.agent` | Connects conversation memory |

---

## 🛠️ Step-by-Step Implementation Guide

### Phase 1: Build the Specialized Sub-Agent Workflows First

1. Create a new workflow for the sub-agent.
2. Add an **`Execute Workflow Trigger`** (`n8n-nodes-base.executeWorkflowTrigger`) as the primary trigger.
3. (Optional) Add a **`Webhook`** (`n8n-nodes-base.webhook`) for standalone testing.
4. Add the **`LLM Model`** (`@n8n/n8n-nodes-langchain.lmChatGoogleGemini`).
5. Add the **`AI Agent`** (`@n8n/n8n-nodes-langchain.agent`).
6. Connect specific tools (API / Code) via `ai_tool`.
7. Add **`Respond to Webhook`** (`n8n-nodes-base.respondToWebhook`).
8. Save and copy the **Workflow ID** (e.g. `jTWHg9bHaNOdzL13`).

### Phase 2: Build the Dispatcher / Supervisor Agent Workflow

1. Add entry **`Webhook`** (`n8n-nodes-base.webhook`).
2. Add **`LLM Model`** (`@n8n/n8n-nodes-langchain.lmChatGoogleGemini`).
3. Add **`Dispatcher AI Agent`** (`@n8n/n8n-nodes-langchain.agent`).
4. Add **`toolWorkflow`** nodes (`@n8n/n8n-nodes-langchain.toolWorkflow` v2.2) for each Sub-Agent:
   - `workflowId`: `{ "__rl": true, "mode": "id", "value": "SUB_AGENT_WORKFLOW_ID" }`
   - `toolDescription`: Clear 15+ character description explaining **WHEN** the LLM should use this tool.
5. Connect `toolWorkflow` nodes to `Dispatcher AI Agent` with `sourceOutput: "ai_tool"`.
6. Add **`Code Node`** to parse JSON responses and **`Respond to Webhook`**.

---

## 🎯 Prompt Engineering Framework for Agents (RTF + RODES + CoT)

Every system message for agents and sub-agents should use the structured framework:

```markdown
Role: [RTF - Role] Define the exact domain persona (e.g. Senior Medical Dispatcher, Scheduling Specialist).

Objective: [RODES - Objective] High-level goal and scope of responsibility.

Approach Step-by-Step: [Chain of Thought]
1. Analyze incoming request and categorize intention.
2. Extract required entities (patient_id, date, treatment, amounts).
3. Execute required tools with extracted parameters.
4. Format response according to output rules.

Details & Constraints: [RODES - Details & Sense Check]
- Never hallucinate non-existent data.
- Output strictly in valid JSON: {"intent": "...", "extracted_entities": {...}, "summary": "..."}.
```

---

## 📝 Node JSON Schema References

### Dispatcher Tool Sub-Workflow Node (`toolWorkflow`)
```json
{
  "name": "Tool_SubAgent_Scheduling",
  "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
  "typeVersion": 2.2,
  "parameters": {
    "source": "database",
    "workflowId": {
      "__rl": true,
      "mode": "id",
      "value": "jTWHg9bHaNOdzL13"
    },
    "description": "Sub-agent especializado en agendamiento.",
    "toolDescription": "Usa esta herramienta para agendar, modificar, mover o cancelar citas dentales de pacientes. Requiere mensaje o entidades extraídas."
  }
}
```

### Sub-Agent Trigger (`Execute Workflow Trigger`)
```json
{
  "name": "Execute_Workflow_Trigger",
  "type": "n8n-nodes-base.executeWorkflowTrigger",
  "typeVersion": 1.1,
  "parameters": {}
}
```

---

## 📋 Best Practices & Validation Checklist

- [ ] Every `toolWorkflow` node **MUST** have a `toolDescription` (15+ chars).
- [ ] Connect LLM (`lmChatGoogleGemini`) to AI Agent via `sourceOutput: "ai_languageModel"`.
- [ ] Connect Sub-Agent tools (`toolWorkflow`) to AI Agent via `sourceOutput: "ai_tool"`.
- [ ] Use `n8n_validate_workflow({ id: "workflow_id" })` to ensure 0 errors before activating.
- [ ] Activate sub-agent workflows first, then activate the Dispatcher workflow.
