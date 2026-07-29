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
      const { data, error } = await (supabase as any)
        .from("clinics")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading clinics from Supabase:", error);
      } else if (data) {
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
