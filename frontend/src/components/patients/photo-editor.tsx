"use client";

import * as React from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
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
  Check,
  Grid3x3,
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
};

const DEFAULT_ADJ: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  rotation90: 0,
  rotationFine: 0,
  flipH: false,
  flipV: false,
};

function buildFilter(adj: Adjustments): string {
  return `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%)`;
}

function buildTransform(adj: Adjustments): string {
  const scaleX = adj.flipH ? -1 : 1;
  const scaleY = adj.flipV ? -1 : 1;
  const totalRotation = adj.rotation90 + adj.rotationFine;
  return `rotate(${totalRotation}deg) scale(${scaleX}, ${scaleY})`;
}

function Slider({
  label,
  icon: Icon,
  value,
  min = 0,
  max = 200,
  defaultValue = 100,
  onChange,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  min?: number;
  max?: number;
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
  const [cropMode, setCropMode] = React.useState(false);
  const [crop, setCrop] = React.useState<Crop>();
  const [completedCrop, setCompletedCrop] = React.useState<PixelCrop>();
  const [activePanel, setActivePanel] = React.useState<"adjust" | "crop">("adjust");
  const [showGuides, setShowGuides] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState(src);

  const imgRef = React.useRef<HTMLImageElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    const c = centerCrop(
      makeAspectCrop({ unit: "%", width: 80 }, width / height, width, height),
      width,
      height
    );
    setCrop(c);
  }

  function applyCrop() {
    if (!completedCrop || !imgRef.current) return;
    const img = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0, canvas.width, canvas.height
    );
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCurrentSrc(dataUrl); // update local src with cropped image
    setCropMode(false);
    setActivePanel("adjust");
    setCompletedCrop(undefined);
    // Reset filters after crop so they are not applied twice
    setAdj(DEFAULT_ADJ);
  }

  function exportFinal() {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const isRotated = adj.rotation90 === 90 || adj.rotation90 === 270;
    
    // For fine rotation, we might need a larger canvas to not crop the corners,
    // but for simplicity we keep the original dimensions based on rotation90.
    canvas.width = isRotated ? img.naturalHeight : img.naturalWidth;
    canvas.height = isRotated ? img.naturalWidth : img.naturalHeight;
    ctx.save();
    ctx.filter = buildFilter(adj);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    const totalRotation = adj.rotation90 + adj.rotationFine;
    ctx.rotate((totalRotation * Math.PI) / 180);
    ctx.scale(adj.flipH ? -1 : 1, adj.flipV ? -1 : 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
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
        <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden bg-[#08080f]">
          {showGuides && (
            <div className="pointer-events-none absolute inset-6 z-10 flex items-center justify-center mix-blend-difference">
              <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white -translate-x-1/2" />
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white -translate-y-1/2" />
              <div className="absolute inset-y-0 left-1/3 w-[1px] border-l border-dashed border-white/50 -translate-x-1/2" />
              <div className="absolute inset-y-0 left-2/3 w-[1px] border-l border-dashed border-white/50 -translate-x-1/2" />
              <div className="absolute inset-x-0 top-1/3 h-[1px] border-t border-dashed border-white/50 -translate-y-1/2" />
              <div className="absolute inset-x-0 top-2/3 h-[1px] border-t border-dashed border-white/50 -translate-y-1/2" />
              {/* Centering circle */}
              <div className="absolute w-8 h-8 border border-white rounded-full" />
            </div>
          )}
          
          {cropMode ? (
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              keepSelection
              style={{ maxHeight: "75vh", maxWidth: "100%" }}
            >
              <img
                ref={imgRef}
                src={currentSrc}
                alt={fileName}
                onLoad={onImageLoad}
                style={{
                  maxHeight: "75vh",
                  maxWidth: "100%",
                  objectFit: "contain",
                  filter: buildFilter(adj),
                  transform: buildTransform(adj),
                }}
                crossOrigin="anonymous"
              />
            </ReactCrop>
          ) : (
            <img
              ref={imgRef}
              src={currentSrc}
              alt={fileName}
              style={{
                maxHeight: "75vh",
                maxWidth: "100%",
                objectFit: "contain",
                borderRadius: "0.5rem",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)",
                transition: "filter 0.15s, transform 0.2s",
                filter: buildFilter(adj),
                transform: buildTransform(adj),
              }}
              crossOrigin="anonymous"
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="w-64 shrink-0 border-l border-white/10 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-white/10 shrink-0">
            {(["adjust", "crop"] as const).map((panel) => (
              <button
                key={panel}
                type="button"
                onClick={() => {
                  setActivePanel(panel);
                  setCropMode(panel === "crop");
                }}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold transition-colors",
                  activePanel === panel
                    ? "text-white border-b-2 border-primary"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                {panel === "adjust" ? "🎨 Ajustes" : "✂️ Recortar"}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 space-y-5 overflow-y-auto">
            {activePanel === "adjust" ? (
              <>
                {/* Transform */}
                <div>
                  <p className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                    Transformar
                  </p>
                  <div className="grid grid-cols-2 gap-2">
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
                      <FlipHorizontal className="h-3.5 w-3.5" /> Horizontal
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
                      <FlipVertical className="h-3.5 w-3.5" /> Vertical
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
                  onClick={() => setAdj(DEFAULT_ADJ)}
                  className="w-full h-8 rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 text-xs font-medium transition-colors"
                >
                  Restablecer todo
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-white/60 leading-relaxed">
                  Arrastra para seleccionar el área de recorte. Pulsa{" "}
                  <strong className="text-white/80">Aplicar recorte</strong> para descargar el resultado.
                </p>
                <button
                  type="button"
                  onClick={applyCrop}
                  disabled={!completedCrop}
                  className="w-full h-9 rounded-lg bg-primary text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" /> Aplicar recorte
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCropMode(false);
                    setActivePanel("adjust");
                    setCompletedCrop(undefined);
                  }}
                  className="w-full h-8 rounded-lg border border-white/10 text-white/50 hover:text-white/80 text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
