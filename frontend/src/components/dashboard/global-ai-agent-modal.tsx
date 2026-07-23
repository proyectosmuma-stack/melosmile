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

    function handleKeyDown(e: KeyboardEvent) {
      // Shortcut: Cmd + K (Mac) or Ctrl + K (Windows) to toggle modal
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Escape key to close modal
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    window.addEventListener("open-ai-agent-modal", handleOpen);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("open-ai-agent-modal", handleOpen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Floating AI Agent Trigger Button (Available on all pages) */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 px-4 rounded-full shadow-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white z-50 flex items-center justify-center gap-2 border-2 border-white/20 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Abrir Asistente IA Melosmile (⌘K)"
        >
          <Sparkles className="h-6 w-6 animate-pulse" />
          <span className="font-semibold text-xs pr-1">Agente IA</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-white/20 text-[10px] font-mono font-bold tracking-tighter">
            ⌘K
          </kbd>
        </Button>
      )}

      {/* Centered AI Agent Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900/80 border-b border-slate-800 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <span className="font-bold text-sm tracking-wide">Dispatcher IA · Melosmile</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">
                  Esc para cerrar
                </kbd>
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
            <AIAgentBar />
          </div>
        </div>
      )}
    </>
  );
}
