"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { X, Download, LayoutTemplate, Palette, Loader2, Image as ImageIcon, ArrowRightLeft, ZoomIn, RotateCcw, GripHorizontal } from "lucide-react";
import Cropper from "react-easy-crop";
import * as htmlToImage from "html-to-image";
import { Button } from "@/components/ui/button";

// ─── TYPES ──────────────────────────────────────────────────────────────────
export type CollagePhoto = {
  id: string;
  url: string;
  crop?: { x: number; y: number };
  zoom?: number;
  rotation?: number;
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
  { id: "1:1", label: "Cuadrado 1:1", width: 1080, height: 1080 },
  { id: "4:5", label: "Retrato (Vertical)", width: 1080, height: 1350 },
  { id: "9:16", label: "Vertical 9:16", width: 1080, height: 1920 },
  { id: "16:9", label: "Horizontal 16:9", width: 1920, height: 1080 },
  { id: "monitor", label: "Pantalla Ancha", width: 2560, height: 1440 },
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
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  // Panel de controles arrastrable: posición relativa dentro de la celda de la foto
  const [panelOffset, setPanelOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  // Indicador de ajuste activo
  const [isAdjusting, setIsAdjusting] = useState(false);
  const adjustingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Configuraciones de Diseño
  const photoCount = Math.min(Math.max(initialPhotos.length, 2), 4) as 2 | 3 | 4;
  const availableLayouts = LAYOUTS[photoCount] || LAYOUTS[2];
  
  const [activeLayout, setActiveLayout] = useState(availableLayouts[0].id);
  const [activeRatio, setActiveRatio] = useState(RATIOS[0]); // 1:1 default
  const [gapSize, setGapSize] = useState(GAPS[2].value);
  const [bgColor, setBgColor] = useState(BG_COLORS[0].hex);
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const collageRef = useRef<HTMLDivElement>(null);

  /** Dispara el pulso de "ajustando" durante 800 ms */
  const triggerAdjusting = useCallback(() => {
    setIsAdjusting(true);
    if (adjustingTimer.current) clearTimeout(adjustingTimer.current);
    adjustingTimer.current = setTimeout(() => setIsAdjusting(false), 800);
  }, []);

  // Transformar URLs remotas a Base64 locales para evitar CORS al exportar con canvas
  useEffect(() => {
    let active = true;
    const fetchBlobs = async () => {
      setLoadingBlobs(true);
      const loaded: CollagePhoto[] = [];
      for (const p of initialPhotos.slice(0, 4)) {
        try {
          let res = await fetch(p.url, { mode: "cors" }).catch(() => null);
          
          if (!res || !res.ok) {
            res = await fetch(`/api/proxy-image?url=${encodeURIComponent(p.url)}`);
            if (!res.ok) throw new Error("Fallo en proxy y fetch");
          }

          const blob = await res.blob();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          loaded.push({ id: p.id, url: base64, crop: { x: 0, y: 0 }, zoom: 1 });
        } catch (e) {
          console.warn("CORS/Fetch error para la imagen:", p.url, e);
          loaded.push({ id: p.id, url: p.url, crop: { x: 0, y: 0 }, zoom: 1, rotation: 0 });
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
    triggerAdjusting();
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, zoom } : p));
  };

  const handleRotationChange = (id: string, rotation: number) => {
    triggerAdjusting();
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, rotation } : p));
  };

  /** Cuando cambia la foto seleccionada, resetear la posición del panel */
  const selectPhoto = (id: string) => {
    if (selectedPhotoId !== id) {
      setPanelOffset({ x: 0, y: 0 });
      setSelectedPhotoId(id);
    }
  };

  /** Drag handlers para el panel de controles */
  const onPanelPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: panelOffset.x, oy: panelOffset.y };
    setIsDraggingPanel(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPanelPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setPanelOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  };

  const onPanelPointerUp = (e: React.PointerEvent) => {
    dragStart.current = null;
    setIsDraggingPanel(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => setWatermarkUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };


  const handleRotateOrder = () => {
    setPhotos(prev => {
      if (prev.length <= 1) return prev;
      const copy = [...prev];
      const first = copy.shift();
      if (first) copy.push(first);
      return copy;
    });
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
    } catch (e: any) {
      console.error("Error completo al exportar:", e);
      let errorMsg = "Desconocido";
      if (e instanceof Error) {
        errorMsg = e.message;
      } else if (typeof e === "object" && e !== null) {
        // En DOMExceptions a veces e.message no es enumerable en un JSON.stringify normal
        errorMsg = e.message || JSON.stringify(e);
      }
      alert(`Hubo un error al generar la imagen. Motivo: ${errorMsg}. \nIntenta refrescar la página o contacta al administrador para habilitar CORS en Storage.`);
    } finally {
      setExporting(false);
    }
  };

  // Force layout reset if photo count changes and layout is not available
  useEffect(() => {
    if (!availableLayouts.find(l => l.id === activeLayout)) {
      setActiveLayout(availableLayouts[0].id);
    }
  }, [availableLayouts, activeLayout]);

  const currentLayoutObj = availableLayouts.find(l => l.id === activeLayout) || availableLayouts[0];
  const ratioNum = activeRatio.width / activeRatio.height;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* ─── PANEL LATERAL (Desktop) ─── */}
      <div className="w-full md:w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full shrink-0">
        
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-white" />
            <h2 className="text-white font-bold text-sm">Creador de Collage</h2>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleRotateOrder} title="Intercambiar / Reordenar fotos" className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800">
              <ArrowRightLeft className="h-5 w-5" />
            </button>
            <button onClick={onClose} title="Cerrar" className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800">
              <X className="h-5 w-5" />
            </button>
          </div>
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
                width: '100%',
                maxHeight: '100%',
                maxWidth: `calc(100vh * ${ratioNum})`, // El aspecto nunca permitirá desbordarse
                aspectRatio: `${activeRatio.width} / ${activeRatio.height}`,
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
                  const isSelected = selectedPhotoId === photo.id;
                  
                  return (
                    <div 
                      key={photo.id} 
                      className={`relative overflow-hidden ${specialClass} bg-zinc-800 w-full h-full min-h-[10px] group`}
                      onPointerDownCapture={() => selectPhoto(photo.id)}
                    >
                      <Cropper
                        image={photo.url}
                        crop={photo.crop || { x: 0, y: 0 }}
                        zoom={photo.zoom || 1}
                        rotation={photo.rotation || 0}
                        aspect={undefined}
                        onCropChange={(c) => handleCropChange(photo.id, c)}
                        onZoomChange={(z) => handleZoomChange(photo.id, z)}
                        objectFit="cover"
                        showGrid={false}
                        style={{
                          containerStyle: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
                          cropAreaStyle: { border: 'none', boxShadow: 'none', width: '100%', height: '100%' },
                        }}
                      />
                      
                      {isSelected && (
                        <div
                          className="absolute z-50 select-none animate-in fade-in duration-150"
                          style={{
                            bottom: `calc(50% + ${panelOffset.y}px)`,
                            left: `calc(50% + ${panelOffset.x}px)`,
                            transform: 'translateX(-50%)',
                          }}
                          onPointerDownCapture={(e) => e.stopPropagation()}
                        >
                          {/* Indicador de ajuste */}
                          {isAdjusting && (
                            <div className="flex items-center justify-center gap-1.5 mb-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                              <span className="text-[10px] text-white/70 font-medium tracking-wide">Ajustando...</span>
                            </div>
                          )}

                          {/* Panel arrastrable */}
                          <div
                            className={`flex items-center gap-3 bg-black/85 backdrop-blur-md rounded-2xl px-3 py-2.5 border border-white/15 shadow-xl pointer-events-auto ${
                              isDraggingPanel ? 'cursor-grabbing ring-1 ring-primary/50' : ''
                            }`}
                          >
                            {/* Drag handle */}
                            <div
                              className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60 transition-colors flex-shrink-0 touch-none"
                              onPointerDown={onPanelPointerDown}
                              onPointerMove={onPanelPointerMove}
                              onPointerUp={onPanelPointerUp}
                              title="Arrastrar panel"
                            >
                              <GripHorizontal className="h-4 w-4" />
                            </div>

                            <div className="w-px h-5 bg-white/15" />

                            {/* Zoom slider */}
                            <div className="flex items-center gap-2">
                              <ZoomIn className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
                              <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.02}
                                value={photo.zoom || 1}
                                onChange={(e) => handleZoomChange(photo.id, Number(e.target.value))}
                                className="w-20 accent-primary cursor-pointer"
                                title={`Zoom: ${((photo.zoom || 1) * 100).toFixed(0)}%`}
                              />
                              <span className="text-[10px] text-white/40 w-8 tabular-nums">{((photo.zoom || 1) * 100).toFixed(0)}%</span>
                            </div>

                            <div className="w-px h-5 bg-white/15" />

                            {/* Rotation slider */}
                            <div className="flex items-center gap-2">
                              <RotateCcw className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
                              <input
                                type="range"
                                min={-45}
                                max={45}
                                step={0.5}
                                value={photo.rotation || 0}
                                onChange={(e) => handleRotationChange(photo.id, Number(e.target.value))}
                                className="w-20 accent-primary cursor-pointer"
                                title={`Rotación: ${photo.rotation || 0}°`}
                              />
                              <span className="text-[10px] text-white/40 w-8 tabular-nums">{(photo.rotation || 0).toFixed(0)}°</span>
                            </div>

                            <div className="w-px h-5 bg-white/15" />

                            {/* Reset button */}
                            <button
                              type="button"
                              onClick={() => { handleZoomChange(photo.id, 1); handleRotationChange(photo.id, 0); }}
                              className="text-[10px] text-white/30 hover:text-white/70 transition-colors flex-shrink-0 px-1"
                              title="Restablecer"
                            >
                              ↺
                            </button>
                          </div>
                        </div>
                      )}
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
