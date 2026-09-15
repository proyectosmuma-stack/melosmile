"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { X, Download, LayoutTemplate, Palette, Loader2, Image as ImageIcon, Plus } from "lucide-react";
import Cropper from "react-easy-crop";
import * as htmlToImage from "html-to-image";
import { Button } from "@/components/ui/button";

// ─── TYPES ──────────────────────────────────────────────────────────────────
export type CollagePhoto = {
  id: string;
  url: string;
  crop?: { x: number; y: number };
  zoom?: number;
};

type Props = {
  photos: { id: string; url: string; file_name: string }[];
  onClose: () => void;
};

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
type LayoutConfig = {
  id: string;
  label: string;
  class: string;
  specials?: Record<number, string>;
};

const LAYOUTS: Record<number, LayoutConfig[]> = {
  2: [
    { id: "2-horiz", label: "Lado a Lado", class: "grid-cols-2 grid-rows-1" },
    { id: "2-vert", label: "Apilado", class: "grid-cols-1 grid-rows-2" },
  ],
  3: [
    { id: "3-col", label: "3 Columnas", class: "grid-cols-3 grid-rows-1" },
    { id: "3-row", label: "3 Filas", class: "grid-cols-1 grid-rows-3" },
    { id: "3-grid", label: "Grid 2+1", class: "grid-cols-2 grid-rows-2", specials: { 2: "col-span-2" } },
  ],
  4: [
    { id: "4-grid", label: "Grid 2x2", class: "grid-cols-2 grid-rows-2" },
    { id: "4-row", label: "4 Filas", class: "grid-cols-1 grid-rows-4" },
    { id: "4-col", label: "4 Columnas", class: "grid-cols-4 grid-rows-1" },
  ],
};

const RATIOS = [
  { id: "1:1", label: "Cuadrado (Instagram)", width: 1080, height: 1080 },
  { id: "4:5", label: "Vertical (Retrato)", width: 1080, height: 1350 },
  { id: "9:16", label: "Historia / Reels", width: 1080, height: 1920 },
  { id: "16:9", label: "Horizontal (TV)", width: 1920, height: 1080 },
];

const BG_COLORS = [
  { id: "white", hex: "#FFFFFF" },
  { id: "black", hex: "#000000" },
  { id: "transparent", hex: "transparent" },
  { id: "gray", hex: "#F3F4F6" },
  { id: "brand", hex: "#3b82f6" },
];

const GAPS = [
  { id: "none", label: "Sin bordes", value: 0 },
  { id: "thin", label: "Fino", value: 4 },
  { id: "medium", label: "Medio", value: 12 },
  { id: "thick", label: "Grueso", value: 24 },
];

export function PhotoCollageEditor({ photos: initialPhotos, onClose }: Props) {
  // Estado local para evitar mutar props directamente
  const [photos, setPhotos] = useState<CollagePhoto[]>([]);
  const [loadingBlobs, setLoadingBlobs] = useState(true);

  // Configuraciones de Diseño
  const photoCount = Math.min(Math.max(initialPhotos.length, 2), 4) as 2 | 3 | 4;
  const availableLayouts = LAYOUTS[photoCount] || LAYOUTS[2];
  
  const [activeLayout, setActiveLayout] = useState(availableLayouts[0].id);
  const [activeRatio, setActiveRatio] = useState(RATIOS[1]); // 4:5 default
  const [gapSize, setGapSize] = useState(GAPS[2].value);
  const [bgColor, setBgColor] = useState(BG_COLORS[0].hex);
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const collageRef = useRef<HTMLDivElement>(null);

  // Transformar URLs remotas a Blobs locales para evitar CORS al exportar con canvas
  useEffect(() => {
    let active = true;
    const fetchBlobs = async () => {
      setLoadingBlobs(true);
      const loaded: CollagePhoto[] = [];
      for (const p of initialPhotos.slice(0, 4)) {
        try {
          const res = await fetch(p.url, { mode: "cors" });
          const blob = await res.blob();
          const localUrl = URL.createObjectURL(blob);
          loaded.push({ id: p.id, url: localUrl, crop: { x: 0, y: 0 }, zoom: 1 });
        } catch (e) {
          console.warn("CORS/Fetch error para la imagen:", p.url, e);
          loaded.push({ id: p.id, url: p.url, crop: { x: 0, y: 0 }, zoom: 1 });
        }
      }
      if (active) {
        setPhotos(loaded);
        setLoadingBlobs(false);
      }
    };
    fetchBlobs();
    return () => { active = false; };
  }, [initialPhotos]);

  const handleCropChange = (id: string, crop: { x: number; y: number }) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, crop } : p));
  };

  const handleZoomChange = (id: string, zoom: number) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, zoom } : p));
  };

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setWatermarkUrl(url);
    }
  };

  const handleExport = async () => {
    if (!collageRef.current) return;
    setExporting(true);
    
    try {
      const dataUrl = await htmlToImage.toJpeg(collageRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: bgColor,
      });

      const link = document.createElement('a');
      link.download = `comparativa-paciente-${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Error al exportar:", e);
      alert("Hubo un error al generar la imagen. Intenta cambiar el layout o revisar las fotos.");
    } finally {
      setExporting(false);
    }
  };

  const currentLayoutObj = availableLayouts.find(l => l.id === activeLayout) || availableLayouts[0];

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* ─── PANEL LATERAL (Desktop) ─── */}
      <div className="w-full md:w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full shrink-0">
        
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-white" />
            <h2 className="text-white font-bold text-sm">Creador de Collage</h2>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
          
          <div className="space-y-3">
            <label className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Diseño ({photoCount} fotos)</label>
            <div className="grid grid-cols-2 gap-2">
              {availableLayouts.map(l => (
                <button
                  key={l.id}
                  onClick={() => setActiveLayout(l.id)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    activeLayout === l.id 
                      ? 'bg-primary/20 border-primary text-primary' 
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Formato (Proporción)</label>
            <div className="grid grid-cols-2 gap-2">
              {RATIOS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setActiveRatio(r)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    activeRatio.id === r.id 
                      ? 'bg-zinc-100 border-zinc-100 text-black' 
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Separadores (Grosor)</label>
            <div className="grid grid-cols-4 gap-2">
              {GAPS.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGapSize(g.value)}
                  className={`py-2 rounded-lg border flex justify-center transition-all ${
                    gapSize === g.value 
                      ? 'bg-zinc-600 border-zinc-500' 
                      : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700'
                  }`}
                  title={g.label}
                >
                  <div className={`bg-white h-full`} style={{ width: g.value === 0 ? 1 : Math.max(2, g.value/2) }}></div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-zinc-400 font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" /> Color de Fondo
            </label>
            <div className="flex flex-wrap gap-2">
              {BG_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setBgColor(c.hex)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    bgColor === c.hex ? 'border-primary scale-110 shadow-lg' : 'border-zinc-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.id}
                />
              ))}
              <div className="relative">
                <input 
                  type="color" 
                  value={bgColor} 
                  onChange={(e) => setBgColor(e.target.value)} 
                  className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer"
                />
                <button className={`h-8 w-8 rounded-full border-2 border-zinc-700 flex items-center justify-center overflow-hidden`}>
                  <div className="w-full h-full bg-gradient-to-tr from-red-500 via-green-500 to-blue-500"></div>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <label className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Marca de Agua / Logo</label>
            {watermarkUrl ? (
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-800 border border-zinc-700">
                <img src={watermarkUrl} alt="Logo" className="h-8 object-contain max-w-[120px] bg-black/10 rounded" />
                <button onClick={() => setWatermarkUrl(null)} className="text-red-400 hover:text-red-300 p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 cursor-pointer text-zinc-400 transition-colors">
                <ImageIcon className="h-4 w-4" />
                <span>Subir Logo Temporal</span>
                <input type="file" accept="image/png, image/jpeg, image/svg+xml" className="hidden" onChange={handleWatermarkUpload} />
              </label>
            )}
            <p className="text-[10px] text-zinc-500 leading-tight">Sube un PNG con fondo transparente (opcional).</p>
          </div>

        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
          <Button 
            onClick={handleExport} 
            disabled={exporting || loadingBlobs}
            className="w-full rounded-xl font-bold h-12 text-base bg-white text-black hover:bg-zinc-200"
          >
            {exporting ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Generando...</>
            ) : (
              <><Download className="h-5 w-5 mr-2" /> Descargar Collage</>
            )}
          </Button>
        </div>
      </div>

      {/* ─── AREA DE PREVISUALIZACION ─── */}
      <div className="flex-1 bg-black p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
        
        {loadingBlobs ? (
          <div className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-semibold">Cargando imágenes en alta resolución...</p>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
            <div 
              className="relative shadow-2xl overflow-hidden ring-1 ring-zinc-800 transition-all duration-300 pointer-events-auto"
              style={{
                aspectRatio: `${activeRatio.width} / ${activeRatio.height}`,
                maxHeight: '100%',
                maxWidth: '100%',
                backgroundColor: bgColor,
              }}
            >
              <div 
                ref={collageRef}
                className={`w-full h-full grid ${currentLayoutObj.class}`}
                style={{
                  gap: `${gapSize}px`,
                  backgroundColor: bgColor,
                  padding: gapSize > 0 ? `${gapSize}px` : "0",
                }}
              >
                {photos.map((photo, idx) => {
                  const specialClass = (currentLayoutObj.specials && currentLayoutObj.specials[idx as keyof typeof currentLayoutObj.specials]) || "";
                  return (
                    <div key={photo.id} className={`relative overflow-hidden ${specialClass} bg-zinc-800`}>
                      <Cropper
                        image={photo.url}
                        crop={photo.crop || { x: 0, y: 0 }}
                        zoom={photo.zoom || 1}
                        aspect={undefined}
                        onCropChange={(c) => handleCropChange(photo.id, c)}
                        onZoomChange={(z) => handleZoomChange(photo.id, z)}
                        objectFit="cover"
                        showGrid={false}
                        style={{
                          containerStyle: { width: '100%', height: '100%' },
                        }}
                      />
                    </div>
                  );
                })}

                {watermarkUrl && (
                  <div className="absolute bottom-4 right-4 z-50 pointer-events-none drop-shadow-md opacity-80">
                    <img src={watermarkUrl} alt="Watermark" className="h-10 object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
