"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Calendar,
  Receipt,
  Stethoscope,
  HelpCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";

type Intent =
  | "schedule_appointment"
  | "patient_info"
  | "billing"
  | "clinical_note"
  | "general_query"
  | "error"
  | "pending";

interface ExtractedEntities {
  patient?: string;
  date?: string;
  time?: string;
  clinic?: string;
  treatment?: string;
  amount?: number | string;
  [key: string]: unknown;
}

interface AssistantPayload {
  intent: Intent;
  extracted_entities?: ExtractedEntities;
  summary?: string;
  raw_response?: string;
  error?: string;
}

interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  payload?: AssistantPayload;
  isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INTENT_META: Record<
  Intent,
  { label: string; color: string; icon: React.ReactNode }
> = {
  schedule_appointment: {
    label: "Agendamiento",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/30",
    icon: <Calendar className="h-3.5 w-3.5" />,
  },
  patient_info: {
    label: "Datos Clínicos",
    color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    icon: <Stethoscope className="h-3.5 w-3.5" />,
  },
  billing: {
    label: "Facturación",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    icon: <Receipt className="h-3.5 w-3.5" />,
  },
  clinical_note: {
    label: "Nota Clínica",
    color: "text-teal-400 bg-teal-500/10 border-teal-500/30",
    icon: <Stethoscope className="h-3.5 w-3.5" />,
  },
  general_query: {
    label: "Consulta General",
    color: "text-slate-400 bg-slate-500/10 border-slate-500/30",
    icon: <HelpCircle className="h-3.5 w-3.5" />,
  },
  error: {
    label: "Error",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  pending: {
    label: "Procesando",
    color: "text-slate-400 bg-slate-500/10 border-slate-500/30",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
};

function formatTime(date: Date) {
  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function cleanResponseText(rawText?: string): string {
  if (!rawText) return "Instrucción procesada correctamente.";
  let str = rawText.trim();

  // Try parsing JSON if text is enclosed in ```json ... ``` or raw JSON
  try {
    const jsonMatch = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const candidate = jsonMatch ? jsonMatch[1].trim() : str;
    if (candidate.startsWith("{") && candidate.endsWith("}")) {
      const parsed = JSON.parse(candidate);
      if (parsed.summary) return cleanResponseText(parsed.summary);
      if (parsed.output) return cleanResponseText(parsed.output);
      if (parsed.message) return cleanResponseText(parsed.message);
    }
  } catch (e) {
    // Ignore JSON parse errors
  }

  // Remove markdown code fences
  str = str.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  return str;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IntentBadge({ intent }: { intent: Intent }) {
  const meta = INTENT_META[intent] ?? INTENT_META.general_query;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold tracking-wide ${meta.color}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

function EntityRow({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-slate-400 shrink-0 w-24 text-right">{label}:</span>
      <span className="text-slate-200 font-medium">{String(value)}</span>
    </div>
  );
}

function AppointmentCard({
  index,
  time,
  patient,
  details,
}: {
  index: number;
  time: string;
  patient: string;
  details: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-violet-500/40 transition-all shadow-sm group">
      <div className="h-7 w-7 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-400 font-bold text-xs flex items-center justify-center shrink-0">
        {index}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-100 truncate group-hover:text-violet-300 transition-colors">
            {patient}
          </h4>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-mono font-semibold shrink-0">
            <Clock className="h-3 w-3 text-violet-400" />
            {time}
          </span>
        </div>
        {details && (
          <p className="text-xs text-slate-400 leading-relaxed truncate">
            {details}
          </p>
        )}
      </div>
    </div>
  );
}

function FormattedResponse({ text }: { text: string }) {
  const clean = cleanResponseText(text);

  // Check if text has numbered items (e.g. 1. 12:00 - Patient Name)
  const lines = clean.split("\n").filter((l) => l.trim().length > 0);
  const appointmentMatches: { index: number; time: string; patient: string; details: string }[] = [];
  const headerLines: string[] = [];

  lines.forEach((line) => {
    const match = line.match(/^(\d+)\.\s+(\d{1,2}:\d{2})\s*-\s*([^(\n]+)(?:\(([^)]+)\))?/);
    if (match) {
      appointmentMatches.push({
        index: parseInt(match[1], 10),
        time: match[2],
        patient: match[3].trim(),
        details: match[4] ? match[4].trim() : "",
      });
    } else {
      headerLines.push(line);
    }
  });

  if (appointmentMatches.length > 0) {
    return (
      <div className="space-y-3">
        {headerLines.length > 0 && (
          <p className="text-sm font-semibold text-slate-200 leading-relaxed">
            {headerLines.join("\n")}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          {appointmentMatches.map((item) => (
            <AppointmentCard
              key={item.index + item.patient + item.time}
              index={item.index}
              time={item.time}
              patient={item.patient}
              details={item.details}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
      {clean}
    </p>
  );
}

function AssistantBubble({ msg }: { msg: Message }) {
  const [showDetails, setShowDetails] = useState(false);
  const payload = msg.payload;
  const intent = payload?.intent ?? "general_query";
  const entities = payload?.extracted_entities ?? {};
  const hasEntities = Object.values(entities).some(Boolean);

  const ENTITY_LABELS: Record<string, string> = {
    patient: "Paciente",
    patient_name: "Paciente",
    date: "Fecha",
    time: "Hora",
    clinic: "Clínica",
    treatment: "Tratamiento",
    amount: "Monto",
  };

  return (
    <div className="flex items-start gap-3.5 max-w-[92%]">
      {/* Avatar */}
      <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 mt-0.5">
        <Bot className="h-5 w-5 text-white" />
      </div>

      <div className="flex-1 space-y-1.5">
        {/* Loading state */}
        {msg.isLoading ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-3">
            <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />
            <span className="text-sm text-slate-400 italic">
              El Dispatcher está analizando tu instrucción…
            </span>
          </div>
        ) : (
          <>
            {/* Main bubble */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm p-4 sm:p-5 space-y-3 shadow-lg">
              {/* Intent badge */}
              {payload && <IntentBadge intent={intent} />}

              {/* Formatted summary / response text */}
              <FormattedResponse text={payload?.summary ?? msg.text} />

              {/* Entities section */}
              {hasEntities && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showDetails ? (
                      <ChevronDown className="h-3.5 w-3.5 text-violet-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-violet-400" />
                    )}
                    Entidades extraídas
                  </button>
                  {showDetails && (
                    <div className="pl-2 space-y-1 mt-1.5">
                      {Object.entries(entities).map(([key, val]) =>
                        val ? (
                          <EntityRow
                            key={key}
                            label={ENTITY_LABELS[key] ?? key}
                            value={val}
                          />
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timestamp */}
            <p className="text-[10px] text-slate-500 pl-1">
              {formatTime(msg.timestamp)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function UserBubble({ msg }: { msg: Message }) {
  return (
    <div className="flex items-start gap-3.5 max-w-[88%] ml-auto flex-row-reverse">
      {/* Avatar */}
      <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0 mt-0.5">
        <User className="h-5 w-5 text-white" />
      </div>

      <div className="flex-1 space-y-1.5 flex flex-col items-end">
        <div className="bg-gradient-to-r from-violet-900/40 to-indigo-900/40 border border-violet-500/30 rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-md">
          <p className="text-sm font-medium text-slate-100 leading-relaxed whitespace-pre-wrap">
            {msg.text}
          </p>
        </div>
        <p className="text-[10px] text-slate-500 pr-1">{formatTime(msg.timestamp)}</p>
      </div>
    </div>
  );
}

// ─── Preset suggestions ───────────────────────────────────────────────────────

const PRESETS = [
  "revisa las citas de mañana",
  "Cita a Munir mañana a las 14:00 para revisión en Goya",
  "Registra paciente Manuel Cardama (+34690123456)",
  "¿Cobros pendientes de esta semana?",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIAgentBar({ fullHeight = false }: { fullHeight?: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "assistant",
      text: "Hola 👋 Soy el Dispatcher IA de Melosmile. Puedo agendar citas, consultar la agenda del día, gestionar pacientes y facturación. ¿En qué te ayudo hoy?",
      timestamp: new Date(),
      payload: {
        intent: "general_query",
        summary:
          "Hola 👋 Soy el Dispatcher IA de Melosmile. Puedo agendar citas, consultar la agenda del día, gestionar pacientes y facturación. ¿En qué te ayudo hoy?",
      },
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionId = useRef(uid() + uid());

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: uid(),
      role: "user",
      text: trimmed,
      timestamp: new Date(),
    };

    const loadingMsg: Message = {
      id: uid(),
      role: "assistant",
      text: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setPrompt("");

    try {
      const response = await fetch("/api/dispatcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, session_id: sessionId.current }),
      });

      let payload: AssistantPayload;

      if (response.ok) {
        const raw = await response.json().catch(() => null);

        payload = {
          intent: raw?.intent ?? "general_query",
          extracted_entities: raw?.extracted_entities ?? {},
          summary: cleanResponseText(
            raw?.summary ?? raw?.output ?? raw?.message ?? "Instrucción procesada correctamente."
          ),
          raw_response: JSON.stringify(raw),
        };
      } else {
        const errText = await response.text().catch(() => "");
        payload = {
          intent: "error",
          summary: `El servicio respondió con un error (${response.status}). Inténtalo en unos segundos.`,
          error: errText,
        };
      }

      // Replace loading bubble with real response
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? {
                ...m,
                isLoading: false,
                text: payload.summary ?? "",
                timestamp: new Date(),
                payload,
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? {
                ...m,
                isLoading: false,
                text: "No se pudo conectar con el Dispatcher. Verifica la conexión.",
                timestamp: new Date(),
                payload: {
                  intent: "error",
                  summary:
                    "No se pudo conectar con el Dispatcher. Verifica la conexión a n8n.",
                },
              }
            : m
        )
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(prompt);
  };

  const isProcessing = messages.some((m) => m.isLoading);

  return (
    <div
      className={`w-full flex flex-col bg-slate-950 text-white overflow-hidden ${
        fullHeight ? "h-full" : "h-[560px]"
      }`}
    >
      {/* ── Messages Container ── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((msg) =>
          msg.role === "assistant" ? (
            <AssistantBubble key={msg.id} msg={msg} />
          ) : (
            <UserBubble key={msg.id} msg={msg} />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Preset suggestions ── */}
      <div className="px-5 pb-2.5 flex gap-2 flex-wrap shrink-0 border-t border-slate-900/60 pt-3">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => sendMessage(p)}
            disabled={isProcessing}
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            {p}
          </button>
        ))}
      </div>

      {/* ── Input Bar ── */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-3 px-5 pb-5 pt-2 border-t border-slate-800/80 shrink-0 bg-slate-950"
      >
        <div className="relative flex-1">
          <Sparkles className="absolute left-3.5 top-3.5 h-4 w-4 text-violet-400 pointer-events-none" />
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(prompt);
              }
            }}
            rows={2}
            placeholder='Escribe tu instrucción… ej: "Cita para María el jueves a las 11:00"'
            disabled={isProcessing}
            className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 text-white placeholder:text-slate-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-500/60 text-sm resize-none min-h-[72px] font-sans leading-relaxed disabled:opacity-50"
          />
        </div>

        <Button
          type="submit"
          disabled={isProcessing || !prompt.trim()}
          className="h-12 px-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/20 shrink-0 self-end disabled:opacity-40 cursor-pointer"
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs">Enviar</span>
              <Send className="h-4 w-4" />
            </div>
          )}
        </Button>
      </form>
    </div>
  );
}
