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

// ─── Sub-components ───────────────────────────────────────────────────────────

function IntentBadge({ intent }: { intent: Intent }) {
  const meta = INTENT_META[intent] ?? INTENT_META.general_query;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${meta.color}`}
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
      <span className="text-slate-500 shrink-0 w-20 text-right">{label}:</span>
      <span className="text-slate-200 font-medium">{String(value)}</span>
    </div>
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
    date: "Fecha",
    time: "Hora",
    clinic: "Clínica",
    treatment: "Tratamiento",
    amount: "Monto",
  };

  return (
    <div className="flex items-start gap-3 max-w-[88%]">
      {/* Avatar */}
      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 mt-0.5">
        <Bot className="h-4 w-4 text-white" />
      </div>

      <div className="flex-1 space-y-1.5">
        {/* Loading state */}
        {msg.isLoading ? (
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />
            <span className="text-sm text-slate-400 italic">
              El Dispatcher está analizando tu instrucción…
            </span>
          </div>
        ) : (
          <>
            {/* Main bubble */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 space-y-2.5">
              {/* Intent badge */}
              {payload && <IntentBadge intent={intent} />}

              {/* Summary / response text */}
              <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
                {payload?.summary ?? msg.text}
              </p>

              {/* Entities section */}
              {hasEntities && (
                <div className="pt-1 border-t border-slate-700/50 space-y-1">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showDetails ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    Entidades extraídas
                  </button>
                  {showDetails && (
                    <div className="pl-1 space-y-0.5 mt-1">
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
            <p className="text-[10px] text-slate-600 pl-1">
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
    <div className="flex items-start gap-3 max-w-[88%] ml-auto flex-row-reverse">
      {/* Avatar */}
      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0 mt-0.5">
        <User className="h-4 w-4 text-white" />
      </div>

      <div className="flex-1 space-y-1.5 flex flex-col items-end">
        <div className="bg-rose-600/20 border border-rose-500/30 rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
            {msg.text}
          </p>
        </div>
        <p className="text-[10px] text-slate-600 pr-1">{formatTime(msg.timestamp)}</p>
      </div>
    </div>
  );
}

// ─── Preset suggestions ───────────────────────────────────────────────────────

const PRESETS = [
  "Cita a Munir en 15 días a las 10:00",
  "¿Cobros pendientes de esta semana?",
  "Historial clínico de Juan García",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIAgentBar() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: "assistant",
      text: "Hola 👋 Soy el Dispatcher IA de Melosmile. Puedo agendar citas, consultar datos clínicos y gestionar facturación. ¿En qué te ayudo hoy?",
      timestamp: new Date(),
      payload: {
        intent: "general_query",
        summary:
          "Hola 👋 Soy el Dispatcher IA de Melosmile. Puedo agendar citas, consultar datos clínicos y gestionar facturación. ¿En qué te ayudo hoy?",
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
        }
      );

      let payload: AssistantPayload;

      if (response.ok) {
        const raw = await response.json().catch(() => null);

        // n8n dispatcher returns array or object — normalize
        const data = Array.isArray(raw) ? raw[0] : raw;

        payload = {
          intent: data?.intent ?? "general_query",
          extracted_entities: data?.extracted_entities ?? {},
          summary:
            data?.summary ??
            data?.output ??
            data?.message ??
            "Instrucción procesada correctamente.",
          raw_response: JSON.stringify(data),
        };
      } else {
        // Non-OK but reachable (e.g. rate limit)
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
    <div className="w-full flex flex-col h-[520px] bg-slate-950 text-white rounded-xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/80 shrink-0">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight text-white">
              Dispatcher IA · Melosmile
            </h2>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
              n8n live
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Agendamiento · Clínico · Facturación
          </p>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
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
      <div className="px-4 pb-2 flex gap-1.5 flex-wrap shrink-0">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => sendMessage(p)}
            disabled={isProcessing}
            className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {p}
          </button>
        ))}
      </div>

      {/* ── Input ── */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 px-4 pb-4 pt-2 border-t border-slate-800/80 shrink-0"
      >
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-3 h-4 w-4 text-rose-400 pointer-events-none" />
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
            className="w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700/80 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/60 text-sm resize-none min-h-[72px] font-sans leading-relaxed disabled:opacity-50"
          />
        </div>

        <Button
          type="submit"
          disabled={isProcessing || !prompt.trim()}
          className="h-11 w-11 p-0 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 shrink-0 self-end disabled:opacity-40"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
