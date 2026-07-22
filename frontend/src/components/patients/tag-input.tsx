"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Tag as TagIcon, Plus, X, Check, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type TagItem = {
  id: string;
  name: string;
  color?: string;
};

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  slate: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" },
};

export function getTagStyle(colorName?: string) {
  return COLOR_CLASSES[colorName || "rose"] || COLOR_CLASSES.rose;
}

interface TagInputProps {
  selectedTags: TagItem[];
  onChange: (tags: TagItem[]) => void;
  className?: string;
}

export function TagInput({ selectedTags, onChange, className }: TagInputProps) {
  const [query, setQuery] = useState("");
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch tags from Supabase
  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("tags")
        .select("id, name, color")
        .order("name", { ascending: true });

      if (!error && data) {
        setAvailableTags(data as TagItem[]);
      }
    } catch (err) {
      console.error("Error cargando etiquetas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTags = availableTags.filter((t) =>
    t.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const exactMatch = availableTags.find(
    (t) => t.name.toLowerCase() === query.trim().toLowerCase()
  );

  const handleSelectTag = (tag: TagItem) => {
    if (!selectedTags.some((st) => st.id === tag.id)) {
      onChange([...selectedTags, tag]);
    }
    setQuery("");
    setIsOpen(false);
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTags.filter((t) => t.id !== tagId));
  };

  const handleCreateTag = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setCreating(true);
    try {
      // Colors cycle
      const colors = ["rose", "amber", "emerald", "purple", "blue", "slate"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const { data, error } = await (supabase as any)
        .from("tags")
        .insert({ name: trimmed, color: randomColor })
        .select()
        .single();

      if (error) {
        // If tag already exists (race condition), fetch it
        const { data: existing } = await (supabase as any)
          .from("tags")
          .select("*")
          .ilike("name", trimmed)
          .single();
        if (existing) {
          handleSelectTag(existing as TagItem);
        }
      } else if (data) {
        const newTag: TagItem = { id: (data as any).id, name: (data as any).name, color: (data as any).color };
        setAvailableTags((prev) => [...prev, newTag]);
        handleSelectTag(newTag);
      }
    } catch (err) {
      console.error("Error creando etiqueta:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative space-y-2", className)}>
      {/* Selected Tag Badges */}
      <div className="flex flex-wrap gap-2 items-center min-h-[36px] p-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-rose-300 focus-within:border-rose-400 transition-all">
        {selectedTags.map((tag) => {
          const style = getTagStyle(tag.color);
          return (
            <span
              key={tag.id}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-xs transition-all",
                style.bg,
                style.text,
                style.border
              )}
            >
              <TagIcon className="h-3 w-3 opacity-70" />
              {tag.name}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="hover:opacity-100 opacity-60 transition-opacity ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}

        {/* Input */}
        <div className="relative flex-1 min-w-[140px]">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedTags.length === 0 ? "Escribe para buscar o crear etiqueta (ej. Familiar, Henryschein)..." : "Añadir más etiquetas..."}
            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none px-1 py-0.5"
          />
        </div>
      </div>

      {/* Autocomplete Dropdown (WordPress style) */}
      {isOpen && (query.trim().length > 0 || availableTags.length > 0) && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 divide-y divide-slate-100">
          {loading ? (
            <div className="flex items-center justify-center p-3 text-slate-400 text-xs gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
              Cargando etiquetas...
            </div>
          ) : (
            <>
              {/* Filtered suggestions */}
              {filteredTags.length > 0 && (
                <div className="py-1">
                  <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Sugerencias
                  </p>
                  {filteredTags.map((tag) => {
                    const isSelected = selectedTags.some((st) => st.id === tag.id);
                    const style = getTagStyle(tag.color);

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleSelectTag(tag)}
                        disabled={isSelected}
                        className={cn(
                          "w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold text-left transition-colors",
                          isSelected
                            ? "bg-slate-50 text-slate-400 cursor-not-allowed"
                            : "hover:bg-rose-50/60 text-slate-700 hover:text-rose-700"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[11px] font-bold border",
                              style.bg,
                              style.text,
                              style.border
                            )}
                          >
                            {tag.name}
                          </span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-slate-400" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Option to CREATE new tag if query has no exact match */}
              {query.trim().length > 0 && !exactMatch && (
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={creating}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-rose-600 bg-rose-50/40 hover:bg-rose-50 transition-colors border-t border-slate-100"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                  ) : (
                    <Plus className="h-4 w-4 text-rose-500" />
                  )}
                  <span>
                    Crear etiqueta <strong className="underline">"{query.trim()}"</strong>
                  </span>
                  <Sparkles className="h-3.5 w-3.5 text-rose-400 ml-auto opacity-70" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
