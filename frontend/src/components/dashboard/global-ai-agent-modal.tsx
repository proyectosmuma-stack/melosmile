"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAgentBar } from "@/components/dashboard/ai-agent-bar";

export function triggerAIAgentModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-ai-agent-modal"));
  }
}

export function GlobalAIAgentModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleOpen() {
      setIsOpen(true);
    }
    window.addEventListener("open-ai-agent-modal", handleOpen);
    return () => {
      window.removeEventListener("open-ai-agent-modal", handleOpen);
    };
  }, []);

  return (
    <>
      {/* Floating AI Agent Trigger Button (Available on all pages) */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white z-50 flex items-center justify-center border-2 border-white/20 transition-transform hover:scale-110 active:scale-95"
          title="Abrir Asistente IA Melosmile"
        >
          <Sparkles className="h-6 w-6 animate-pulse" />
        </Button>
      )}

      {/* Centered AI Agent Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="h-5 w-5 text-violet-400" />
                <span className="font-bold text-sm tracking-wide">Asistente IA Melosmile</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Embedded AI Agent Bar */}
            <div className="p-4 md:p-6">
              <AIAgentBar />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
