"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { DOC_TYPE_LABELS, formatBytes } from "@/lib/utils/document-utils";
import { cn } from "@/lib/utils";

type LightboxPhoto = {
  id: string;
  url: string | null;
  file_name: string;
  document_type: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  description: string | null;
  created_at: string | null;
};

type Props = {
  photos: LightboxPhoto[];
  index: number | null;
  onIndexChange: (i: number | null) => void;
};

function formatDateEs(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function PhotoLightbox({ photos, index, onIndexChange }: Props) {
  const isOpen = index !== null && photos.length > 0 && index >= 0 && index < photos.length;
  const current = isOpen ? photos[index!] : null;

  const [scale, setScale] = React.useState(1);
  const [translate, setTranslate] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const imageRef = React.useRef<HTMLImageElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Reset zoom/pan al cambiar de foto
  React.useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [index]);

  const clampScale = React.useCallback((v: number) => Math.min(5, Math.max(1, v)), []);

  const handlePrev = React.useCallback(() => {
    if (index === null) return;
    const next = index <= 0 ? photos.length - 1 : index - 1;
    onIndexChange(next);
  }, [index, photos.length, onIndexChange]);

  const handleNext = React.useCallback(() => {
    if (index === null) return;
    const next = index >= photos.length - 1 ? 0 : index + 1;
    onIndexChange(next);
  }, [index, photos.length, onIndexChange]);

  const handleClose = React.useCallback(() => onIndexChange(null), [onIndexChange]);

  // Teclado
  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        setScale((s) => clampScale(s + 0.4));
      } else if (e.key === "-") {
        setScale((s) => clampScale(s - 0.4));
      } else if (e.key === "0") {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose, handlePrev, handleNext, clampScale]);

  // Rueda para zoom
  const onWheel = React.useCallback(
    (e: React.WheelEvent) => {
      if (!isOpen) return;
      e.preventDefault();
      const delta = -e.deltaY * 0.0015;
      setScale((s) => clampScale(s + delta));
    },
    [isOpen, clampScale]
  );

  // Pointer drag cuando hay zoom
  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (scale <= 1) return;
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [scale, translate]
  );

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || scale <= 1) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setTranslate({ x: dragStart.current.tx + dx, y: dragStart.current.ty + dy });
    },
    [isDragging, scale]
  );

  const onPointerUp = React.useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  if (!isOpen || !current) return null;

  const total = photos.length;
  const currentIndex = index!;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
        <DialogPrimitive.Popup
          aria-label="Visor de fotografías clínicas"
          className="fixed inset-0 z-50 flex flex-col outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-white backdrop-blur">
                {currentIndex + 1} / {total}
              </span>
              <span className="hidden sm:inline text-xs font-medium text-white/70 truncate max-w-[28ch]">
                {current.file_name}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Alejar"
                onClick={() => setScale((s) => clampScale(s - 0.5))}
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-colors"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Acercar"
                onClick={() => setScale((s) => clampScale(s + 0.5))}
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-colors"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Restablecer zoom"
                onClick={() => {
                  setScale(1);
                  setTranslate({ x: 0, y: 0 });
                }}
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <div className="w-px h-6 bg-white/15 mx-1 hidden sm:block" />
              <DialogPrimitive.Close
                aria-label="Cerrar visor"
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-white text-black hover:bg-white/90 transition-colors"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Stage */}
          <div
            ref={containerRef}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={cn(
              "flex-1 relative flex items-center justify-center overflow-hidden px-2 sm:px-12 py-4",
              scale > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
            )}
            style={{ touchAction: scale > 1 ? "none" : "auto" }}
          >
            {/* Prev */}
            {total > 1 && (
              <button
                type="button"
                aria-label="Fotografía anterior"
                onClick={handlePrev}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-11 sm:w-11 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white backdrop-blur transition-all hover:scale-105"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {/* Imagen */}
            <div
              className="relative flex items-center justify-center w-full h-full"
              style={{ maxHeight: "85vh" }}
            >
              {current.url ? (
                <img
                  ref={imageRef}
                  src={current.url}
                  alt={current.file_name}
                  draggable={false}
                  decoding="async"
                  className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl select-none transition-transform duration-200 will-change-transform"
                  style={{
                    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                  }}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-white/70">
                  <div className="h-20 w-20 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                    <X className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium">Imagen no disponible</p>
                </div>
              )}
            </div>

            {/* Next */}
            {total > 1 && (
              <button
                type="button"
                aria-label="Fotografía siguiente"
                onClick={handleNext}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 sm:h-11 sm:w-11 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white backdrop-blur transition-all hover:scale-105"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Bottom bar */}
          <div className="shrink-0 border-t border-white/10 bg-black/40 backdrop-blur-md">
            <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white truncate max-w-[36ch] sm:max-w-[48ch]" title={current.file_name}>
                    {current.file_name}
                  </span>
                  {current.document_type && (
                    <span className="inline-flex items-center rounded-full bg-white text-black px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide">
                      {DOC_TYPE_LABELS[current.document_type] ?? current.document_type}
                    </span>
                  )}
                  <span className="text-xs font-medium text-white/60">
                    {formatBytes(current.file_size_bytes)}
                  </span>
                  <span className="text-xs font-medium text-white/60">
                    {formatDateEs(current.created_at)}
                  </span>
                </div>
                {current.description && (
                  <p className="text-xs leading-relaxed text-white/70 line-clamp-2">
                    {current.description}
                  </p>
                )}
              </div>
              {current.url ? (
                <a
                  href={current.url}
                  download={current.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold transition-colors shrink-0"
                >
                  <Download className="h-4 w-4" /> Descargar
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-white/10 text-white/40 border border-white/10 text-xs font-bold cursor-not-allowed shrink-0"
                >
                  <Download className="h-4 w-4" /> Descargar
                </span>
              )}
            </div>
            {/* hint */}
            <div className="hidden sm:flex items-center justify-center gap-2 pb-3 text-[11px] font-medium text-white/35">
              <span>Usa ← → para navegar</span>
              <span className="opacity-40">·</span>
              <span>rueda para zoom</span>
              <span className="opacity-40">·</span>
              <span>arrastra para mover</span>
              <span className="opacity-40">·</span>
              <span>Esc para cerrar</span>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
