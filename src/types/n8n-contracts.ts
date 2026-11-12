/**
 * @file n8n-contracts.ts
 * @description Contratos y manifiesto tipado de los workflows de n8n para integración con CodeGraph.
 * Permite al analizador de grafo conectar los flujos externos con los endpoints internos de Next.js.
 */

export interface N8nWorkflowDefinition {
  id: string;
  name: string;
  version: string;
  active: boolean;
  targetEndpoints: string[];
}

export interface N8nDispatcherContract extends N8nWorkflowDefinition {
  id: "Yv9X1EGUvQg8qErW";
  name: "[MELOSMILE] AI Dispatcher";
  targetEndpoints: ["/api/dispatcher"];
  connectedSubAgents: [
    N8nAgendamientoContract,
    N8nClinicoContract,
    N8nContabilidadContract,
    N8nGeneralContract
  ];
}

export interface N8nAgendamientoContract extends N8nWorkflowDefinition {
  id: "jTWHg9bHaNOdzL13";
  name: "[MELOSMILE] Sub-Agent: Agendamiento";
  targetEndpoints: [
    "/api/appointments",
    "/api/appointments/[id]",
    "/api/reminders"
  ];
}

export interface N8nClinicoContract extends N8nWorkflowDefinition {
  id: "Q7oxrbUuohca81Gn";
  name: "[MELOSMILE] Sub-Agent: Clinico";
  targetEndpoints: [
    "/api/patients",
    "/api/patients/[id]",
    "/api/patients/[id]/notes"
  ];
}

export interface N8nContabilidadContract extends N8nWorkflowDefinition {
  id: "XSLNwq6ihH1SHPRl";
  name: "[MELOSMILE] Sub-Agent: Contabilidad";
  targetEndpoints: [
    "/api/billing",
    "/api/billing/[id]",
    "/api/billing/new"
  ];
}

export interface N8nGeneralContract extends N8nWorkflowDefinition {
  id: "MIok0ruU7JhpTxWv";
  name: "[MELOSMILE] Sub-Agent: General";
  targetEndpoints: [
    "/api/settings/clinics",
    "/api/settings/professionals"
  ];
}

export interface N8nDocumentCleanerContract extends N8nWorkflowDefinition {
  id: "OG4Yy4N7qALXojTa";
  name: "[MELOSMILE] Agent Document Cleaner";
  targetEndpoints: [
    "/api/appointments/bulk",
    "/api/documents"
  ];
}

export type MelosmileN8nWorkflows =
  | N8nDispatcherContract
  | N8nAgendamientoContract
  | N8nClinicoContract
  | N8nContabilidadContract
  | N8nGeneralContract
  | N8nDocumentCleanerContract;
