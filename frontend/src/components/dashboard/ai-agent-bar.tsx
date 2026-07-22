"use client";

import React, { useState } from "react";
import { Sparkles, Send, Bot, CheckCircle2, ArrowRight, Calendar, FileText, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AgentAction = {
  type: "appointment" | "report" | "payment";
  summary: string;
  details: string;
};

export function AIAgentBar() {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState<AgentAction | null>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsProcessing(true);

    // Simulate n8n AI agent parsing natural language
    setTimeout(() => {
      const lower = prompt.toLowerCase();
      let action: AgentAction = {
        type: "appointment",
        summary: "Cita Agendada por Agente IA",
        details: prompt,
      };

      if (lower.includes("informe") || lower.includes("factura") || lower.includes("mensual")) {
        action = {
          type: "report",
          summary: "Informe de Facturación Generado",
          details: `Generando resumen contable según instrucción: "${prompt}"`,
        };
      } else if (lower.includes("pago") || lower.includes("entrega") || lower.includes("cobro")) {
        action = {
          type: "payment",
          summary: "Pago / Aconto Registrado",
          details: `Registrado movimiento contable: "${prompt}"`,
        };
      } else {
        action = {
          type: "appointment",
          summary: "Nueva Cita Programada",
          details: `Agendada según instrucción en lenguaje natural: "${prompt}"`,
        };
      }

      setLastAction(action);
      setIsProcessing(false);
      setPrompt("");
    }, 800);
  };

  return (
    <div className="w-full bg-slate-950 text-white space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-white">Agente Conversacional Melosmile IA</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                n8n Connected
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Escribe en lenguaje natural. Ej: <span className="text-slate-300 italic font-mono">"Cita a Munir en 15 días"</span> o <span className="text-slate-300 italic font-mono">"Crear informe mensual Albacete"</span>
            </p>
          </div>
        </div>

        {/* Preset quick buttons */}
        <div className="hidden lg:flex items-center gap-2">
          {[
            'Cita a Munir en 15 días',
            'Cita a Juan el 10 de marzo',
            'Informe mensual Albacete',
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setPrompt(preset)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            >
              "{preset}"
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400" />
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Escribe cualquier instrucción para la agenda o facturación (ej: "Cita a Munir en 15 días a las 10:00")...'
            className="pl-11 pr-4 h-12 bg-slate-900/90 border-slate-700/80 text-white placeholder:text-slate-400 rounded-xl focus-visible:ring-rose-500 text-sm shadow-inner"
          />
        </div>
        <Button
          type="submit"
          disabled={isProcessing || !prompt.trim()}
          className="h-12 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-lg shadow-rose-500/25 shrink-0 gap-2"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-spin" />
              Procesando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>Ejecutar</span>
              <Send className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Result notification badge if action performed */}
      {lastAction && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs animate-in fade-in-0 slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white">{lastAction.summary}:</span>{" "}
              <span>{lastAction.details}</span>
            </div>
          </div>
          <button
            onClick={() => setLastAction(null)}
            className="text-emerald-400 hover:text-white font-semibold text-[11px] underline ml-4"
          >
            Descartar
          </button>
        </div>
      )}
    </div>
  );
}
