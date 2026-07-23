"use client";

import React, { useState, useEffect } from "react";
import { Smile, Info, RefreshCw } from "lucide-react";

export type ToothStatus = "sin_tratar" | "activo" | "tratado" | "extraccion" | "implante" | "corona" | "endodoncia";

export interface OdontogramData {
  [toothId: string]: ToothStatus;
}

interface OdontogramProps {
  initialData?: OdontogramData;
  isMinor?: boolean;
  onChange?: (data: OdontogramData) => void;
  readOnly?: boolean;
}

export const STATUS_CONFIG: Record<ToothStatus, { label: string; color: string; bg: string; border: string }> = {
  sin_tratar: { label: "Sano / Sin Tratar", color: "#e2e8f0", bg: "bg-slate-100", border: "border-slate-300" },
  activo: { label: "En Tratamiento", color: "#ef4444", bg: "bg-red-500", border: "border-red-600" },
  tratado: { label: "Tratado", color: "#22c55e", bg: "bg-emerald-500", border: "border-emerald-600" },
  extraccion: { label: "Extracción", color: "#1e293b", bg: "bg-slate-800", border: "border-slate-900" },
  implante: { label: "Implante", color: "#3b82f6", bg: "bg-blue-500", border: "border-blue-600" },
  corona: { label: "Corona / Prótesis", color: "#f59e0b", bg: "bg-amber-500", border: "border-amber-600" },
  endodoncia: { label: "Endodoncia", color: "#8b5cf6", bg: "bg-purple-500", border: "border-purple-600" },
};

const UPPER_ADULT_RIGHT = ["18", "17", "16", "15", "14", "13", "12", "11"];
const UPPER_ADULT_LEFT = ["21", "22", "23", "24", "25", "26", "27", "28"];
const LOWER_ADULT_RIGHT = ["48", "47", "46", "45", "44", "43", "42", "41"];
const LOWER_ADULT_LEFT = ["31", "32", "33", "34", "35", "36", "37", "38"];

const UPPER_PRIMARY_RIGHT = ["55", "54", "53", "52", "51"];
const UPPER_PRIMARY_LEFT = ["61", "62", "63", "64", "65"];
const LOWER_PRIMARY_RIGHT = ["85", "84", "83", "82", "81"];
const LOWER_PRIMARY_LEFT = ["71", "72", "73", "74", "75"];

export function Odontogram({ initialData = {}, isMinor = false, onChange, readOnly = false }: OdontogramProps) {
  const [data, setData] = useState<OdontogramData>(initialData);
  const [showPrimary, setShowPrimary] = useState<boolean>(isMinor);
  const [selectedStatus, setSelectedStatus] = useState<ToothStatus>("activo");

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleToothClick = (toothId: string) => {
    if (readOnly) return;
    const current = data[toothId] || "sin_tratar";
    let next: ToothStatus;
    
    if (current === selectedStatus) {
      next = "sin_tratar";
    } else {
      next = selectedStatus;
    }

    const updated = { ...data, [toothId]: next };
    if (next === "sin_tratar") {
      delete updated[toothId];
    }
    setData(updated);
    if (onChange) onChange(updated);
  };

  const renderTooth = (id: string) => {
    const status = data[id] || "sin_tratar";
    const cfg = STATUS_CONFIG[status];
    const isMarked = status !== "sin_tratar";

    return (
      <div
        key={id}
        onClick={() => handleToothClick(id)}
        title={`Pieza ${id}: ${cfg.label}`}
        className={`flex flex-col items-center justify-center p-1 rounded-lg transition-all cursor-pointer select-none group ${
          isMarked ? "bg-slate-50 border border-slate-200 shadow-xs" : "hover:bg-slate-100/80"
        }`}
      >
        <span className="text-[10px] font-bold text-slate-500 mb-0.5 group-hover:text-slate-900">{id}</span>
        
        <div className="relative w-6 h-7 flex items-center justify-center">
          <svg viewBox="0 0 40 46" className="w-full h-full drop-shadow-xs">
            <path
              d="M 10,6 C 14,2 26,2 30,6 C 36,12 36,24 34,36 C 32,42 28,44 20,44 C 12,44 8,42 6,36 C 4,24 4,12 10,6 Z"
              fill={status === "sin_tratar" ? "#ffffff" : cfg.color}
              stroke="#64748b"
              strokeWidth="2.5"
            />
            <path
              d="M 12,12 C 16,8 24,8 28,12 M 20,12 L 20,38"
              fill="none"
              stroke={status === "sin_tratar" ? "#cbd5e1" : "#ffffff"}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {status === "extraccion" && (
              <path d="M 8,8 L 32,38 M 32,8 L 8,38" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
            )}
          </svg>
        </div>

        <span
          className={`text-[8px] font-extrabold mt-1 px-1 rounded-full truncate max-w-[34px] ${
            isMarked ? "text-slate-800" : "text-slate-300"
          }`}
        >
          {isMarked ? cfg.label.split(" ")[0] : "—"}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 flex-wrap">
        <div className="flex items-center gap-2">
          <Smile className="h-4 w-4 text-rose-500" />
          <h3 className="text-xs font-bold text-slate-900">Odontograma Interactivo (FDI)</h3>
        </div>

        {isMinor && (
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setShowPrimary(false)}
              className={`px-2 py-0.5 rounded-md transition-all ${
                !showPrimary ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Permanente
            </button>
            <button
              type="button"
              onClick={() => setShowPrimary(true)}
              className={`px-2 py-0.5 rounded-md transition-all ${
                showPrimary ? "bg-rose-500 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Leche
            </button>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400">Marcado activo:</span>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(STATUS_CONFIG) as ToothStatus[])
              .filter((st) => st !== "sin_tratar")
              .map((st) => {
                const conf = STATUS_CONFIG[st];
                const isActive = selectedStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatus(st)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: conf.color }} />
                    {conf.label}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      <div className="space-y-3 pt-1">
        <div className="bg-slate-50/60 rounded-xl p-2 border border-slate-100">
          <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 text-center">Maxilar Superior</span>
          
          {showPrimary ? (
            <div className="grid grid-cols-10 gap-0.5 justify-items-center">
              {UPPER_PRIMARY_RIGHT.map(renderTooth)}
              {UPPER_PRIMARY_LEFT.map(renderTooth)}
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-0.5 justify-items-center">
              {UPPER_ADULT_RIGHT.map(renderTooth)}
              {UPPER_ADULT_LEFT.map(renderTooth)}
            </div>
          )}
        </div>

        <div className="bg-slate-50/60 rounded-xl p-2 border border-slate-100">
          <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1 text-center">Maxilar Inferior</span>
          
          {showPrimary ? (
            <div className="grid grid-cols-10 gap-0.5 justify-items-center">
              {LOWER_PRIMARY_RIGHT.map(renderTooth)}
              {LOWER_PRIMARY_LEFT.map(renderTooth)}
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-0.5 justify-items-center">
              {LOWER_ADULT_RIGHT.map(renderTooth)}
              {LOWER_ADULT_LEFT.map(renderTooth)}
            </div>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
        <span className="flex items-center gap-1 font-medium">
          <Info className="h-3 w-3 text-slate-400" /> Clic sobre cada diente para marcar.
        </span>
        {Object.keys(data).length > 0 && (
          <button
            type="button"
            onClick={() => {
              setData({});
              if (onChange) onChange({});
            }}
            className="flex items-center gap-1 text-slate-500 hover:text-rose-600 font-bold"
          >
            <RefreshCw className="h-3 w-3" /> Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
