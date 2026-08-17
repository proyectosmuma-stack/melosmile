"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Receipt, 
  Plus, 
  Building2, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Search,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Clinic {
  id: string;
  name: string;
  color_hex?: string;
  base_commission_pct?: number;
  lab_discount_pct?: number;
  tracks_payments?: boolean;
}

interface BillingSession {
  id: string;
  clinic_id: string;
  month: number;
  year: number;
  status: 'draft' | 'pending_review' | 'approved' | 'invoiced';
  total_neto: number;
  total_subtotal: number;
  total_commission: number;
  total_lab: number;
  created_at: string;
  clinic?: Clinic;
  lines?: { count: number }[];
}

import { useClinic } from "@/context/clinic-context";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function BillingHubPage() {
  const { clinics: contextClinics, selectedClinicId, setSelectedClinicId } = useClinic();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [sessions, setSessions] = useState<BillingSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null); // track generating state by clinic-month
  const [collapsedClinics, setCollapsedClinics] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch clinics
      const resClinics = await fetch("/api/ai-context");
      if (resClinics.ok) {
        const data = await resClinics.json();
        if (data.clinics) setClinics(data.clinics);
      }

      // Fetch sessions
      const resSessions = await fetch(`/api/billing/sessions?year=${selectedYear}`);
      if (resSessions.ok) {
        const data = await resSessions.json();
        if (data.sessions) setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Error loading billing hub data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch Clinics & Sessions
  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const toggleClinicCollapse = (clinicId: string) => {
    setCollapsedClinics(prev => ({
      ...prev,
      [clinicId]: !prev[clinicId]
    }));
  };

  // Compute KPIs
  const approvedSessions = sessions.filter(s => s.status === "approved");
  const pendingSessions = sessions.filter(s => s.status === "draft" || s.status === "pending_review");
  const totalNetoAño = approvedSessions.reduce((acc, s) => acc + (s.total_neto || 0), 0);

  // Filter clinics
  const filteredClinics = clinics.filter(c => selectedClinicId === "all" || c.id === selectedClinicId);

  // Helper to find session for clinic and month
  const getSessionForMonth = (clinicId: string, month: number) => {
    return sessions.find(s => s.clinic_id === clinicId && s.month === month && s.year === selectedYear);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/30">🟢 Aprobado</span>;
      case "pending_review":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/30">🟡 En Revisión</span>;
      case "invoiced":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-info/10 text-info border border-info/30">🟦 Facturado</span>;
      case "draft":
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-input">⚪ Borrador</span>;
      default:
        return null;
    }
  };

  const handleGenerateSession = async (clinicId: string, month: number) => {
    setIsGenerating(`${clinicId}-${month}`);
    try {
      const res = await fetch(`/api/billing/sessions/generate?clinic_id=${clinicId}&month=${month}&year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        if (data.session_id) {
          router.push(`/billing/${data.session_id}`);
        } else {
          alert('No se pudo generar la sesión: ' + (data.error || 'Error desconocido'));
        }
      } else {
        const errData = await res.json();
        alert('Error: ' + errData.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl shadow-sm border border-border">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/10 text-success rounded-xl">
              <Receipt className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cálculo y Facturación Contable</h1>
              <p className="text-sm text-muted-foreground">
                Organización multiclínica por meses
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            variant="outline"
            size="sm"
            className="gap-2 border-input text-foreground hover:bg-muted"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "Refrescando..." : "Refrescar Datos"}
          </Button>

          <Link href="/billing/new">
            <Button className="bg-success hover:bg-success/90 text-white font-medium shadow-sm gap-2">
              <Plus className="w-4 h-4" />
              Nueva Contabilidad
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-success/10 text-success rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase">NETO Aprobado ({selectedYear})</div>
            <div className="text-2xl font-extrabold text-foreground">{totalNetoAño.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €</div>
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-warning/10 text-warning rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase">Pendientes de Aprobación</div>
            <div className="text-2xl font-extrabold text-foreground">{pendingSessions.length} meses</div>
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-info/10 text-info rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase">Clínicas Activas</div>
            <div className="text-2xl font-extrabold text-foreground">{clinics.length} sedes</div>
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase">Meses Completados</div>
            <div className="text-2xl font-extrabold text-foreground">{approvedSessions.length} meses</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedYear(selectedYear - 1)}
            className="h-9 px-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg text-sm font-bold text-foreground">
            <CalendarIcon className="w-4 h-4 text-success" />
            Año {selectedYear}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedYear(selectedYear + 1)}
            className="h-9 px-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Clinic & Status Dropdowns */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>Clínica:</span>
            <select
              value={selectedClinicId}
              onChange={(e) => setSelectedClinicId(e.target.value)}
              className="bg-muted/40 border border-input rounded-lg px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todas las clínicas</option>
              {clinics.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Estado:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-muted/40 border border-input rounded-lg px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="pending_review">En Revisión</option>
              <option value="approved">Aprobado</option>
              <option value="invoiced">Facturado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Clinics & Months */}
      {loading ? (
        <div className="bg-card p-12 rounded-2xl border border-border text-center text-muted-foreground">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-success border-t-transparent mb-3"></div>
          <div>Cargando contabilidades del año {selectedYear}...</div>
        </div>
      ) : filteredClinics.length === 0 ? (
        <div className="bg-card p-12 rounded-2xl border border-border text-center text-muted-foreground">
          No hay clínicas configuradas.
        </div>
      ) : (
        <div className="space-y-8">
          {filteredClinics.map(clinic => {
            const isCollapsed = collapsedClinics[clinic.id] !== false; // collapsed by default

            return (
              <div key={clinic.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden transition-all">
                {/* Clinic Header */}
                <div 
                  className="px-6 py-4 border-b border-border flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
                  style={{ backgroundColor: `${clinic.color_hex || "#10b981"}10` }}
                  onClick={() => toggleClinicCollapse(clinic.id)}
                >
                  <div className="flex items-center gap-3">
                    <button 
                      type="button" 
                      className="p-1 rounded hover:bg-black/5 text-muted-foreground transition-colors"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-5 h-5 text-foreground" />
                      ) : (
                        <ChevronUp className="w-5 h-5 text-foreground" />
                      )}
                    </button>

                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: clinic.color_hex || "#10b981" }}
                    />
                    <h2 className="text-lg font-bold text-foreground">{clinic.name}</h2>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      Comisión base Dr.: <strong>{clinic.base_commission_pct || 60}%</strong> | Dto. Lab: <strong>{clinic.lab_discount_pct || 50}%</strong>
                    </span>
                    {clinic.tracks_payments && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                        <CreditCard className="w-3 h-3" /> Controla pagos
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Link href={`/billing/new?clinic_id=${clinic.id}&year=${selectedYear}`}>
                      <Button variant="ghost" size="sm" className="text-success hover:bg-success/10 gap-1 text-xs font-semibold">
                        <Plus className="w-3.5 h-3.5" /> Nueva sesión {clinic.name}
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* 12 Months Grid - Only render if expanded */}
                {!isCollapsed && (
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {MONTH_NAMES.map((monthName, idx) => {
                  const monthNum = idx + 1;
                  const session = getSessionForMonth(clinic.id, monthNum);

                  if (selectedStatus !== "all" && session?.status !== selectedStatus) {
                    return null;
                  }

                  return session ? (
                    <Link key={monthNum} href={`/billing/${session.id}`}>
                      <div className="group relative bg-card hover:bg-muted/40 p-4 rounded-xl border border-border hover:border-success shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-36">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-foreground text-sm">{monthName}</span>
                            {getStatusBadge(session.status)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {session.lines?.[0]?.count || 0} registros
                          </div>
                        </div>

                        <div className="border-t border-border/60 pt-2">
                          <div className="text-xs text-muted-foreground font-medium">NETO acumulado</div>
                          <div className="text-base font-extrabold text-success">
                            {session.total_neto.toLocaleString("es-ES", { minimumFractionDigits: 2 })} €
                          </div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div 
                      key={monthNum} 
                      onClick={() => handleGenerateSession(clinic.id, monthNum)}
                      className={`group bg-muted/40 hover:bg-success/10 p-4 rounded-xl border border-dashed border-border hover:border-success/40 transition-all cursor-pointer flex flex-col items-center justify-center text-center h-36 gap-2 ${isGenerating === `${clinic.id}-${monthNum}` ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {isGenerating === `${clinic.id}-${monthNum}` ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-success border-t-transparent mb-2"></div>
                          <span className="text-xs font-medium">Generando...</span>
                        </div>
                      ) : (
                        <>
                          <span className="font-semibold text-muted-foreground group-hover:text-success text-sm">{monthName}</span>
                          <div className="p-2 rounded-full bg-muted group-hover:bg-success/10 text-muted-foreground group-hover:text-success transition-all">
                            <Plus className="w-4 h-4" />
                          </div>
                          <span className="text-xs text-muted-foreground group-hover:text-success">Crear desde citas</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}