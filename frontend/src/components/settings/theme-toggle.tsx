"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  const toggle = React.useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      const root = document.documentElement;
      if (next) {
        root.classList.add("dark");
        try {
          localStorage.setItem("melosmile_theme", "dark");
        } catch {}
      } else {
        root.classList.remove("dark");
        try {
          localStorage.setItem("melosmile_theme", "light");
        } catch {}
      }
      return next;
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Cambiar tema"
      onClick={toggle}
      onKeyDown={handleKeyDown}
      suppressHydrationWarning
      className="group relative inline-flex h-[32px] w-[56px] shrink-0 cursor-pointer items-center rounded-full border border-border bg-secondary p-[3px] transition-colors duration-300 hover:border-primary/30 hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
    >
      <span className="sr-only">Cambiar tema</span>

      {/* track icons faint background */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-[7px]">
        <Sun
          className={`h-[14px] w-[14px] transition-all duration-300 ${isDark ? "text-muted-foreground/40 scale-75 opacity-60" : "text-amber-500 scale-100 opacity-100"}`}
          aria-hidden
        />
        <Moon
          className={`h-[14px] w-[14px] transition-all duration-300 ${isDark ? "text-sky-400 scale-100 opacity-100" : "text-muted-foreground/40 scale-75 opacity-60"}`}
          aria-hidden
        />
      </span>

      {/* thumb */}
      <span
        className={`pointer-events-none relative z-10 flex h-[24px] w-[24px] items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isDark ? "translate-x-[24px] bg-card shadow-md" : "translate-x-0 bg-white shadow-sm"}`}
      >
        <Sun
          className={`absolute h-[13px] w-[13px] text-amber-500 transition-all duration-300 ${isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"}`}
          aria-hidden
        />
        <Moon
          className={`absolute h-[13px] w-[13px] text-sky-500 transition-all duration-300 ${isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"}`}
          aria-hidden
        />
      </span>
    </button>
  );
}
