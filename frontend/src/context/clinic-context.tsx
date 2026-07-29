"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

export interface ClinicItem {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  color_hex?: string;
  base_commission_pct?: number;
  lab_discount_pct?: number;
}

interface ClinicContextType {
  clinics: ClinicItem[];
  selectedClinicId: string;
  setSelectedClinicId: (id: string) => void;
  selectedClinic: ClinicItem | null;
  loading: boolean;
  refreshClinics: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType>({
  clinics: [],
  selectedClinicId: "all",
  setSelectedClinicId: () => {},
  selectedClinic: null,
  loading: true,
  refreshClinics: async () => {},
});

const STORAGE_KEY = "melosmile_selected_clinic";

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [clinics, setClinics] = useState<ClinicItem[]>([]);
  const [selectedClinicId, setSelectedClinicIdState] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize selected clinic from localStorage after mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSelectedClinicIdState(saved);
      }
    }
  }, []);

  const setSelectedClinicId = useCallback((id: string) => {
    setSelectedClinicIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const fetchClinics = useCallback(async () => {
    try {
      // 1. Try fetching from /api/ai-context (bypasses client RLS via server service role)
      const res = await fetch("/api/ai-context", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.clinics && Array.isArray(json.clinics) && json.clinics.length > 0) {
          setClinics(json.clinics as ClinicItem[]);
          return;
        }
      }

      // 2. Direct Supabase fallback
      const { data } = await (supabase as any)
        .from("clinics")
        .select("*")
        .order("name", { ascending: true });

      if (data && data.length > 0) {
        setClinics(data as ClinicItem[]);
      }
    } catch (err) {
      console.error("Exception loading clinics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClinics();
  }, [fetchClinics]);

  const selectedClinic =
    selectedClinicId === "all"
      ? null
      : clinics.find((c) => c.id === selectedClinicId) || null;

  return (
    <ClinicContext.Provider
      value={{
        clinics,
        selectedClinicId,
        setSelectedClinicId,
        selectedClinic,
        loading,
        refreshClinics: fetchClinics,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  return useContext(ClinicContext);
}
