"use client";

import React from "react";
import { Label } from "@/components/ui/label";

export type ClinicOption = { id: string; name: string; };

type ClinicMultiSelectProps = {
  allClinics: ClinicOption[];
  selectedClinicIds: string[];
  primaryClinicId: string | null;
  onChangeSelected: (ids: string[]) => void;
  onChangePrimary: (id: string | null) => void;
  label?: string;
  description?: string;
};

export function ClinicMultiSelect({
  allClinics,
  selectedClinicIds,
  primaryClinicId,
  onChangeSelected,
  onChangePrimary,
  label = "Sedes / Clínicas Asignadas (Selección Múltiple)",
  description = "Selecciona las clínicas a las que pertenece este registro. Marca una como principal.",
}: ClinicMultiSelectProps) {
  const toggleClinic = (id: string) => {
    if (selectedClinicIds.includes(id)) {
      const next = selectedClinicIds.filter((c) => c !== id);
      onChangeSelected(next);
      if (primaryClinicId === id) {
        onChangePrimary(next[0] || null);
      }
    } else {
      const next = [...selectedClinicIds, id];
      onChangeSelected(next);
      if (!primaryClinicId) {
        onChangePrimary(id);
      }
    }
  };

  return (
    <div className="space-y-1.5 pt-2 border-t border-slate-100">
      <Label className="text-xs font-semibold text-slate-700 block">{label}</Label>
      {description && <p className="text-xs text-slate-500 mb-2">{description}</p>}

      <div className="flex flex-wrap gap-2">
        {allClinics.map((clinic) => {
          const selected = selectedClinicIds.includes(clinic.id);
          const isPrimary = primaryClinicId === clinic.id;

          return (
            <div
              key={clinic.id}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                selected
                  ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-200"
              }`}
              onClick={() => toggleClinic(clinic.id)}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleClinic(clinic.id)}
                className="accent-blue-500 cursor-pointer"
              />
              <span>{clinic.name}</span>
              {selected && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangePrimary(isPrimary ? null : clinic.id);
                  }}
                  className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-lg font-bold border transition-all ${
                    isPrimary
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-blue-400 border-blue-200 hover:bg-blue-100"
                  }`}
                >
                  {isPrimary ? "Principal ✓" : "Principal"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
