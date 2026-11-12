"use client";

import * as React from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop as CropIcon,
  Sun,
  Contrast,
  Droplets,
  Download,
  X,
  Grid3x3,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  fileName: string;
  onClose: () => void;
  onSave?: (dataUrl: string, fileName: string) => void;
  isSaving?: boolean;
};

type Adjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  rotation90: number;
  rotationFine: number;
  flipH: boolean;
  flipV: boolean;
  zoom: number;
};

const DEFAULT_ADJ: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  rotation90: 0,
  rotationFine: 0,
  flipH: false,
  flipV: false,
  zoom: 1,
};

function buildFilter(adj: Adjustments): string {
  return `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%)`;
}

function Slider({
  label,
  icon: Icon,
  value,
  min = 0,
  max = 200,
  step = 1,
  defaultValue = 100,
  onChange,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-white/80 font-medium">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-white/60 tabular-nums w-7 text-right">{value}</span>
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className="text-white/30 hover:text-white/70 transition-colors text-[10px] ml-1"
            title="Reset"
          >
            ↺
          </button>
        </div>
      </div>
      <div className="relative h-1.5 rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

export function PhotoEditor({ src, fileName, onClose, onSave, isSaving }: Props) {
  const [adj, setAdj] = React.useState<Adjustments>(DEFAULT_ADJ);
  const [showGuides, setShowGuides] = React.useState(false);
  
  // react-easy-crop state
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [aspect, setAspect] = React.useState<number | undefined>(undefined); // undefined = free / original
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(null);

  const onCropComplete = React.useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  async function exportFinal() {
    if (!croppedAreaPixels) return;

    // We need to load the image onto a canvas to extract the cropped area with filters and rotation
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // The output canvas should be the size of the cropped area
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    // Basic transformations required for exporting the cropped area
    // react-easy-crop handles zoom and translation by providing croppedAreaPixels relative to the *rotated* image.
    // However, react-easy-crop applies rotation FIRST, then crops.
    // So to draw it correctly, we must apply the rotation to the canvas, draw the image shifted by the crop offset.

    const totalRotation = adj.rotation90 + adj.rotationFine;
    const rotRad = (totalRotation * Math.PI) / 180;
    
    // We need to calculate the bounding box of the rotated image
    const bBoxWidth = Math.abs(Math.cos(rotRad) * image.naturalWidth) + Math.abs(Math.sin(rotRad) * image.naturalHeight);
    const bBoxHeight = Math.abs(Math.sin(rotRad) * image.naturalWidth) + Math.abs(Math.cos(rotRad) * image.naturalHeight);

    // Apply the filters
    ctx.filter = buildFilter(adj);

    // Flip if needed
    if (adj.flipH || adj.flipV) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(adj.flipH ? -1 : 1, adj.flipV ? -1 : 1);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    // Set the transform to translate to the center of the cropped area in the bounding box
    ctx.translate(
      bBoxWidth / 2 - croppedAreaPixels.x,
      bBoxHeight / 2 - croppedAreaPixels.y
    );
    
    // Rotate
    ctx.rotate(rotRad);

    // Draw the image centered
    ctx.drawImage(
      image,
      -image.naturalWidth / 2,
      -image.naturalHeight / 2,
      image.naturalWidth,
      image.naturalHeight
    );

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    if (onSave) {
      onSave(dataUrl, `editada_${fileName}`);
    } else {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `editada_${fileName}`;
      a.click();
    }
  }

  function rotate(dir: "cw" | "ccw") {
    setAdj((prev) => ({
      ...prev,
      rotation90: (prev.rotation90 + (dir === "cw" ? 90 : 270)) % 360,
    }));
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0f0f14] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <CropIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Editor de Imagen</p>
            <p className="text-[11px] text-white/50 truncate max-w-[24ch]">{fileName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGuides((p) => !p)}
            className={cn(
              "h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors",
              showGuides ? "bg-primary text-white" : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
            )}
            title="Mostrar guías"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button
            type="button"
            onClick={exportFinal}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" />
            {isSaving ? "Guardando..." : "Guardar imagen"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Image area */}
        <div className="flex-1 relative overflow-hidden bg-[#08080f]">
          {showGuides && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center mix-blend-difference">
              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white -translate-x-1/2" />
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white -translate-y-1/2" />
              <div className="absolute inset-y-0 left-1/3 w-[1px] border-l border-dashed border-white/50 -translate-x-1/2" />
              <div className="absolute inset-y-0 left-2/3 w-[1px] border-l border-dashed border-white/50 -translate-x-1/2" />
              <div className="absolute inset-x-0 top-1/3 h-[1px] border-t border-dashed border-white/50 -translate-y-1/2" />
              <div className="absolute inset-x-0 top-2/3 h-[1px] border-t border-dashed border-white/50 -translate-y-1/2" />
              <div className="absolute w-8 h-8 border border-white rounded-full" />
            </div>
          )}
          
          <div className="absolute inset-0" style={{ filter: buildFilter(adj), transform: `scale(${adj.flipH ? -1 : 1}, ${adj.flipV ? -1 : 1})` }}>
            <Cropper
              image={src}
              crop={crop}
              zoom={adj.zoom}
              aspect={aspect}
              rotation={adj.rotation90 + adj.rotationFine}
              onCropChange={setCrop}
              onZoomChange={(zoom) => setAdj(p => ({ ...p, zoom }))}
              onCropComplete={onCropComplete}
              showGrid={false}
              classes={{
                containerClassName: "absolute inset-0",
                mediaClassName: "object-contain",
              }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 shrink-0 border-l border-white/10 flex flex-col overflow-y-auto">
          <div className="p-4 space-y-6">
            
            {/* Formato */}
            <div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">Formato</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAspect(undefined)}
                  className={cn(
                    "h-8 rounded-lg text-xs font-medium transition-colors border",
                    aspect === undefined ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/[0.08] hover:bg-white/[0.12] text-white/80 border-white/[0.08]"
                  )}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setAspect(1)}
                  className={cn(
                    "h-8 rounded-lg text-xs font-medium transition-colors border",
                    aspect === 1 ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/[0.08] hover:bg-white/[0.12] text-white/80 border-white/[0.08]"
                  )}
                >
                  1:1
                </button>
                <button
                  type="button"
                  onClick={() => setAspect(4/3)}
                  className={cn(
                    "h-8 rounded-lg text-xs font-medium transition-colors border",
                    aspect === 4/3 ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/[0.08] hover:bg-white/[0.12] text-white/80 border-white/[0.08]"
                  )}
                >
                  4:3 (Horiz)
                </button>
                <button
                  type="button"
                  onClick={() => setAspect(3/4)}
                  className={cn(
                    "h-8 rounded-lg text-xs font-medium transition-colors border",
                    aspect === 3/4 ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/[0.08] hover:bg-white/[0.12] text-white/80 border-white/[0.08]"
                  )}
                >
                  3:4 (Vert)
                </button>
              </div>
            </div>

            {/* Transform */}
            <div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                Encuadre
              </p>
              <Slider
                label="Zoom"
                icon={ZoomIn}
                value={adj.zoom}
                min={1}
                max={3}
                step={0.05}
                defaultValue={1}
                onChange={(v) => setAdj((p) => ({ ...p, zoom: v }))}
              />
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => rotate("ccw")}
                  className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/80 text-xs font-medium transition-colors border border-white/[0.08]"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> −90°
                </button>
                <button
                  type="button"
                  onClick={() => rotate("cw")}
                  className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/80 text-xs font-medium transition-colors border border-white/[0.08]"
                >
                  <RotateCw className="h-3.5 w-3.5" /> +90°
                </button>
                <button
                  type="button"
                  onClick={() => setAdj((p) => ({ ...p, flipH: !p.flipH }))}
                  className={cn(
                    "flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-colors border",
                    adj.flipH
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "bg-white/[0.08] hover:bg-white/[0.12] text-white/80 border-white/[0.08]"
                  )}
                >
                  <FlipHorizontal className="h-3.5 w-3.5" /> Hori
                </button>
                <button
                  type="button"
                  onClick={() => setAdj((p) => ({ ...p, flipV: !p.flipV }))}
                  className={cn(
                    "flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-colors border",
                    adj.flipV
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "bg-white/[0.08] hover:bg-white/[0.12] text-white/80 border-white/[0.08]"
                  )}
                >
                  <FlipVertical className="h-3.5 w-3.5" /> Vert
                </button>
              </div>
              
              <div className="mt-4">
                <Slider
                  label="Inclinación (Fina)"
                  icon={CropIcon}
                  value={adj.rotationFine}
                  min={-45}
                  max={45}
                  defaultValue={0}
                  onChange={(v) => setAdj((p) => ({ ...p, rotationFine: v }))}
                />
              </div>
            </div>

            {/* Levels */}
            <div>
              <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-3">
                Niveles
              </p>
              <div className="space-y-4">
                <Slider
                  label="Brillo"
                  icon={Sun}
                  value={adj.brightness}
                  defaultValue={100}
                  onChange={(v) => setAdj((p) => ({ ...p, brightness: v }))}
                />
                <Slider
                  label="Contraste"
                  icon={Contrast}
                  value={adj.contrast}
                  defaultValue={100}
                  onChange={(v) => setAdj((p) => ({ ...p, contrast: v }))}
                />
                <Slider
                  label="Saturación"
                  icon={Droplets}
                  value={adj.saturation}
                  defaultValue={100}
                  onChange={(v) => setAdj((p) => ({ ...p, saturation: v }))}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setAdj(DEFAULT_ADJ);
                setAspect(undefined);
                setCrop({ x: 0, y: 0 });
              }}
              className="w-full h-8 rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 text-xs font-medium transition-colors"
            >
              Restablecer todo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
