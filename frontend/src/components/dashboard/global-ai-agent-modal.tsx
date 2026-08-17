"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAgentBar } from "@/components/dashboard/ai-agent-bar";

export function triggerAIAgentModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-ai-agent-modal"));
  }
}

export function GlobalAIAgentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

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
      {/* Floating AI Agent Trigger Button (Available on all pages - Icon Only) */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 p-0 rounded-full shadow-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white z-50 flex items-center justify-center border-2 border-white/20 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
          title="Abrir Musly (⌘K)"
        >
          <Sparkles className="h-6 w-6 animate-pulse" />
        </Button>
      )}

      {/* Centered Large AI Agent Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-sidebar/70 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`relative w-full bg-sidebar rounded-2xl shadow-2xl border border-sidebar-border/90 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 transition-all ${
              isFullScreen
                ? "h-full max-w-none rounded-none border-none"
                : "max-w-5xl h-[88vh] max-h-[900px]"
            }`}
          >
            {/* Modal Header */}
            <div className="bg-sidebar-accent/90 border-b border-sidebar-border/80 px-6 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 text-sidebar-foreground">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-wide">Musly</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 uppercase tracking-wide">
                      n8n live
                    </span>
                  </div>
                  <p className="text-[11px] text-sidebar-muted-foreground">
                    Asistente Médico Inteligente · Agendamiento, Historia Clínica y Facturación
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <kbd className="hidden md:inline-flex items-center px-2 py-0.5 rounded bg-sidebar-accent text-sidebar-muted-foreground text-[10px] font-mono border border-sidebar-border">
                  Esc para cerrar
                </kbd>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="h-8 w-8 rounded-lg text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  title={isFullScreen ? "Restaurar tamaño" : "Maximizar pantalla"}
                >
                  {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 rounded-lg text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  title="Cerrar modal"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Embedded AI Agent Bar (Expands to fill modal height) */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-sidebar">
              <AIAgentBar fullHeight />
            </div>
          </div>
        </div>
      )}
    </>
  );
}