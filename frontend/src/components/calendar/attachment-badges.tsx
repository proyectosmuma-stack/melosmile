"use client";

import { Camera, Paperclip, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  photoCount?: number;
  docCount?: number;
  hasNotes?: boolean;
  size?: "xs" | "sm";
};

export function AttachmentBadges({ photoCount = 0, docCount = 0, hasNotes = false, size = "sm" }: Props) {
  const hasPhotos = photoCount > 0;
  const hasDocs = docCount > 0;
  const showNotes = !!hasNotes;

  if (!hasPhotos && !hasDocs && !showNotes) return null;

  const isXs = size === "xs";

  const chipBase =
    "inline-flex items-center justify-center gap-0.5 rounded border font-medium leading-none shrink-0 select-none";
  const chipColors = "bg-muted/80 text-muted-foreground border-border";
  const chipSize = isXs ? "h-[18px] px-1 py-0" : "h-[18px] px-1.5 py-0 text-[10px]";
  const iconSize = isXs ? "h-3 w-3" : "h-3 w-3";
  const numClass = isXs ? "hidden" : "text-[10px] font-bold leading-none";

  return (
    <span className={cn("flex items-center gap-1", isXs ? "gap-1" : "gap-1")} aria-label="Adjuntos">
      {hasPhotos && (
        <span
          title={`${photoCount} ${photoCount === 1 ? "foto clínica" : "fotos clínicas"}`}
          className={cn(chipBase, chipColors, chipSize)}
        >
          <Camera className={cn(iconSize, "shrink-0")} />
          {!isXs && <span className={numClass}>×{photoCount}</span>}
        </span>
      )}
      {hasDocs && (
        <span
          title={`${docCount} ${docCount === 1 ? "documento" : "documentos"}`}
          className={cn(chipBase, chipColors, chipSize)}
        >
          <Paperclip className={cn(iconSize, "shrink-0")} />
          {!isXs && <span className={numClass}>×{docCount}</span>}
        </span>
      )}
      {showNotes && (
        <span
          title="Tiene observaciones"
          className={cn(chipBase, chipColors, chipSize)}
        >
          <StickyNote className={cn(iconSize, "shrink-0")} />
        </span>
      )}
    </span>
  );
}
