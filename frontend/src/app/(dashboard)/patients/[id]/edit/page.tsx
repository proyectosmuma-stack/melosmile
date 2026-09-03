"use client";

import React, { useState, useEffect } from "react";
import { Tables } from '@/lib/supabase/types';


// Form state type - separate from DB type to avoid conflicts
type PatientForm = {
  first_name: string;
  last_name: string;
  dni_nie: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  // New contact address fields
  address_2: string;
  postal_code: string;
  city: string;
  province: string;
  country: string;
  allergies: string;
  important_diseases: string;
  previous_operations: string;
  current_medication: string;
  treatment_plan: string;
  in_treatment: string; // "true" | "false"
  // Billing
  nif_cif: string;
  billing_name: string;
  billing_address: string;
  billing_address_2: string;
  billing_city: string;
  billing_postal_code: string;
  billing_province: string;
  billing_country: string;
  // Checkbox unificación
  billing_same_as_contact: boolean;
  full_name: string;
};
import {
  ArrowLeft, Save, Loader2, User, Phone, Mail, MapPin, FileText,
  Stethoscope, AlertCircle, Pill, Activity, Building2, Baby,
  Plus, X, BadgeCheck, Tag as TagIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { TagInput, TagItem } from "@/components/patients/tag-input";

const billingFields = ['nif_cif', 'billing_name', 'billing_address', 'billing_address_2', 'billing_city', 'billing_postal_code', 'billing_province', 'billing_country', 'email', 'phone'];


type Clinic = { id: string; name: string };

function Field({ label, name, value, onChange, type = "text", placeholder = "", required = false, disabled = false }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: string; placeholder?: string; required?: boolean; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}{required && <span className="text-primary ml-1">*</span>}</label>
      <input
        type={type} name={name} value={value} onChange={onChange} required={required} disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function TextArea({ label, name, value, onChange, placeholder = "", rows = 3 }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</label>
      <textarea
        name={name} value={value} onChange={onChange} rows={rows} placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/40 transition-all resize-none"
      />
    </div>
  );
}

type RepForm = {
  id?: string;
  full_name: string;
  relationship: string;
  dni_nie: string;
  phone: string;
  email: string;
  is_primary_contact: boolean;
};

export default function EditPatientPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter();
  const resolvedParams = React.use(params as any) as { id: string };
  const targetId = resolvedParams?.id;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [allClinics, setAllClinics] = useState<Clinic[]>([]);
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  const [primaryClinicId, setPrimaryClinicId] = useState<string | null>(null);
  const [representatives, setRepresentatives] = useState<RepForm[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);
  const [isMinor, setIsMinor] = useState(false);

// const { toast } = useToast();
  const [form, setForm] = useState<PatientForm>({
    first_name: "", last_name: "", dni_nie: "", dob: "", gender: "",
    phone: "", email: "", address: "",
    // Nuevos campos dirección estructurada (contacto)
    address_2: "", postal_code: "", city: "", province: "", country: "España",
    allergies: "", important_diseases: "", previous_operations: "", current_medication: "", treatment_plan: "",
    in_treatment: "true",
    // Billing
    nif_cif: "", billing_name: "", billing_address: "", billing_address_2: "", billing_city: "",
    billing_postal_code: "", billing_province: "", billing_country: "España",
    // Checkbox unificación
    billing_same_as_contact: true,
    full_name: "",
  });

  const [oldBillingValues, setOldBillingValues] = useState<Partial<PatientForm>>({});
  const [showBillingSection, setShowBillingSection] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // Check minor status when dob changes
    if (name === "dob" && value) {
      const birth = new Date(value);
      const today = new Date();
      let years = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) years--;
      setIsMinor(years < 18);
    }
  };

  // Handler para checkbox "Datos de facturación diferentes"
  const handleBillingSameAsContactChange = (checked: boolean) => {
    setForm(prev => {
      const next = { ...prev, billing_same_as_contact: !checked }; // checked = true -> different = false
      if (!checked) {
        // Son iguales: autollenar facturación desde contacto
        next.billing_name = `${prev.first_name} ${prev.last_name}`.trim();
        next.nif_cif = prev.dni_nie;
        next.billing_address = prev.address;
        next.billing_address_2 = prev.address_2;
        next.billing_city = prev.city;
        next.billing_postal_code = prev.postal_code;
        next.billing_province = prev.province;
        next.billing_country = prev.country;
      }
      return next;
    });
    setShowBillingSection(checked); // checked = true -> mostrar sección facturación
  };

  const handleRepChange = (index: number, field: keyof RepForm, value: string | boolean) => {
    setRepresentatives(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const addRep = () => {
    setRepresentatives(prev => [...prev, { full_name: "", relationship: "", dni_nie: "", phone: "", email: "", is_primary_contact: prev.length === 0 }]);
  };

  const removeRep = (index: number) => {
    setRepresentatives(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Get all clinics
      const { data: clinicsData } = await supabase.from("clinics").select("id, name").order("name");
      if (clinicsData) setAllClinics(clinicsData);

      if (!targetId) return;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
      let query = supabase.from("patients").select("*");
      if (isUuid) {
        query = query.eq("id", targetId);
      } else {
        query = query.eq("historia_id", targetId);
      }
      let { data: pData } = await query.limit(1);
      let p = pData?.[0];
      if (p) {
        const patient = p as any;
        const dob = patient.dob ? patient.dob.split("T")[0] : "";
        const sameAsContact = patient.billing_same_as_contact ?? true;
        setForm({
          first_name: patient.first_name ?? "", last_name: patient.last_name ?? "",
          dni_nie: patient.dni_nie ?? "", dob, gender: patient.gender ?? "",
          phone: patient.phone ?? "", email: patient.email ?? "", address: patient.address ?? "",
          // Nuevos campos contacto
          address_2: patient.address_2 ?? "", postal_code: patient.postal_code ?? "",
          city: patient.city ?? "", province: patient.province ?? "", country: patient.country ?? "España",
          allergies: patient.allergies ?? "", important_diseases: patient.important_diseases ?? "",
          previous_operations: patient.previous_operations ?? "",
          current_medication: patient.current_medication ?? "",
          treatment_plan: patient.treatment_plan ?? "",
          in_treatment: patient.in_treatment ? "true" : "false",
          // Billing
          nif_cif: patient.nif_cif ?? "", billing_name: patient.billing_name ?? "",
          billing_address: patient.billing_address ?? "", billing_city: patient.billing_city ?? "",
          billing_postal_code: patient.billing_postal_code ?? "",
          billing_country: patient.billing_country ?? "España",
          billing_address_2: patient.billing_address_2 ?? "",
          billing_province: patient.billing_province ?? "",
          // Checkbox
          billing_same_as_contact: sameAsContact,
          full_name: `${patient.first_name} ${patient.last_name}`,
        });
        setShowBillingSection(!sameAsContact); // mostrar si son diferentes

        setOldBillingValues({
          nif_cif: patient.nif_cif,
          billing_name: patient.billing_name,
          billing_address: patient.billing_address,
          billing_address_2: patient.billing_address_2,
          billing_city: patient.billing_city,
          billing_postal_code: patient.billing_postal_code,
          billing_province: patient.billing_province,
          billing_country: patient.billing_country,
          email: patient.email,
          phone: patient.phone,
        });


        if (dob) {
          const birth = new Date(dob);
          const today = new Date();
          let years = today.getFullYear() - birth.getFullYear();
          if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) years--;
          setIsMinor(years < 18);
        }

        // Patient clinics
        const { data: pc } = await (supabase as any).from("patient_clinics").select("clinic_id, is_primary").eq("patient_id", p.id);
        if (pc) {
          setSelectedClinicIds(pc.map((c: any) => c.clinic_id));
          const primary = pc.find((c: any) => c.is_primary);
          if (primary) setPrimaryClinicId(primary.clinic_id);
        }

        // Representatives
        const { data: reps } = await (supabase as any).from("patient_representatives").select("*").eq("patient_id", p.id);
        if (reps) {
          setRepresentatives(reps.map((r: any) => ({
            id: r.id, full_name: r.full_name, relationship: r.relationship ?? "",
            dni_nie: r.dni_nie ?? "", phone: r.phone ?? "", email: r.email ?? "",
            is_primary_contact: r.is_primary_contact ?? false,
          })));
        }

        // Tags
        const { data: pTags } = await (supabase as any)
          .from("patient_tags")
          .select("tags ( id, name, color )")
          .eq("patient_id", p.id);

        if (pTags) {
          const loadedTags: TagItem[] = pTags
            .map((pt: any) => pt.tags)
            .filter(Boolean);
          setSelectedTags(loadedTags);
        }
      }

      setLoading(false);
    }
    fetchData();
  }, [targetId]);

  const toggleClinic = (clinicId: string) => {
    setSelectedClinicIds(prev =>
      prev.includes(clinicId) ? prev.filter(id => id !== clinicId) : [...prev, clinicId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!targetId) return;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
      let query = supabase.from("patients").select("id");
      if (isUuid) {
        query = query.eq("id", targetId);
      } else {
        query = query.eq("historia_id", targetId);
      }
      let { data: pData } = await query.limit(1);
      let patientId = pData?.[0]?.id ?? targetId;

      // Capture old billing values before update
      const oldPatient = await supabase.from("patients").select("*").eq("id", patientId).single();
      const oldValues = (oldPatient.data as unknown as Partial<PatientForm> || {});

      // Update patient
      // Si billing_same_as_contact = true, sincronizar facturación con contacto antes de guardar
      const formToSave = { ...form };
      if (form.billing_same_as_contact) {
        formToSave.billing_name = `${form.first_name} ${form.last_name}`.trim();
        formToSave.nif_cif = form.dni_nie;
        formToSave.billing_address = form.address;
        formToSave.billing_address_2 = form.address_2;
        formToSave.billing_city = form.city;
        formToSave.billing_postal_code = form.postal_code;
        formToSave.billing_province = form.province;
        formToSave.billing_country = form.country;
      }

      const { error: updateErr } = await (supabase as any).from("patients").update({
        first_name: formToSave.first_name, last_name: formToSave.last_name,
        dni_nie: formToSave.dni_nie || null, dob: formToSave.dob || null,
        gender: formToSave.gender || null, phone: formToSave.phone || null,
        email: formToSave.email || null, address: formToSave.address || null,
        // Nuevos campos contacto
        address_2: formToSave.address_2 || null, postal_code: formToSave.postal_code || null,
        city: formToSave.city || null, province: formToSave.province || null, country: formToSave.country || null,
        allergies: formToSave.allergies || null, important_diseases: formToSave.important_diseases || null,
        previous_operations: formToSave.previous_operations || null,
        current_medication: formToSave.current_medication || null,
        treatment_plan: formToSave.treatment_plan || null,
        in_treatment: formToSave.in_treatment === "true",
        nif_cif: formToSave.nif_cif || null, billing_name: formToSave.billing_name || null,
        billing_address: formToSave.billing_address || null, billing_address_2: formToSave.billing_address_2 || null, billing_city: formToSave.billing_city || null,
        billing_postal_code: formToSave.billing_postal_code || null, billing_province: formToSave.billing_province || null, billing_country: formToSave.billing_country,
        billing_same_as_contact: formToSave.billing_same_as_contact,
      }).eq("id", patientId);

      if (updateErr) {
        console.error("Error actualizando paciente:", updateErr);
        alert(`Error al guardar datos: ${updateErr.message}`);
        return;
      }

      // After successful Supabase update, check for billing changes
      const newValues: PatientForm = {
        ...form,
        full_name: `${form.first_name} ${form.last_name}`,
      };

      const changed = billingFields.some((f) => (oldValues as any)[f] !== (newValues as any)[f]);

      if (changed) {
        try {
          const { data: pData } = await supabase.from('patients').select('odoo_partner_id').eq('id', patientId).single();
          
          if (!pData?.odoo_partner_id) {
            // No ha sido facturado nunca, solo guardar en local
            console.log("Datos de facturación guardados en Melosmile. Se sincronizarán con Odoo al registrar la primera factura.");
          } else {
            const odooRes = await fetch('/api/odoo/partner', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newValues),
            });
            
            if (!odooRes.ok) {
              const errData = await odooRes.json();
              throw new Error(errData.error || `HTTP error ${odooRes.status}`);
            }
            alert("Sincronización Odoo exitosa: Los datos de facturación del paciente se han sincronizado con Odoo.");
          }
        } catch (odooError: any) {
          console.error("Error sincronizando con Odoo:", odooError);
          alert(`Datos guardados en Melosmile, pero falló la sincronización con Odoo: ${odooError.message || odooError}`);
        }
      }

      // Update patient_clinics
      const { error: delPcErr } = await (supabase as any).from("patient_clinics").delete().eq("patient_id", patientId);
      if (delPcErr) {
        console.error("Error eliminando clínicas anteriores:", delPcErr);
      }
      if (selectedClinicIds.length > 0) {
        const { error: insPcErr } = await (supabase as any).from("patient_clinics").insert(
          selectedClinicIds.map(cid => ({
            patient_id: patientId,
            clinic_id: cid,
            is_primary: cid === primaryClinicId,
          }))
        );
        if (insPcErr) {
          console.error("Error guardando clínicas asignadas:", insPcErr);
          alert(`Atención: Error al guardar clínicas asignadas: ${insPcErr.message}`);
        }
      }

      // Update representatives
      await (supabase as any).from("patient_representatives").delete().eq("patient_id", patientId);
      if (representatives.length > 0) {
        await (supabase as any).from("patient_representatives").insert(
          representatives.map(r => ({
            patient_id: patientId,
            full_name: r.full_name,
            relationship: r.relationship || null,
            dni_nie: r.dni_nie || null,
            phone: r.phone || null,
            email: r.email || null,
            is_primary_contact: r.is_primary_contact,
          }))
        );
      }

      // Update patient_tags
      await (supabase as any).from("patient_tags").delete().eq("patient_id", patientId);
      if (selectedTags.length > 0) {
        await (supabase as any).from("patient_tags").insert(
          selectedTags.map(t => ({
            patient_id: patientId,
            tag_id: t.id,
          }))
        );
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/patients/${patientId}`);
        router.refresh();
      }, 500);
    } catch (err) {
      console.error("Error guardando:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground font-medium">Cargando datos del paciente...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[900px] mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={`/patients/${targetId}`} className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver a la ficha
        </Link>
        <div className="flex items-center gap-3">
          {success && (
            <span className="text-xs font-bold text-success bg-success/10 border border-success/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4" /> Guardado correctamente
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs shadow-md shadow-primary/20"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Cambios
          </Button>
        </div>
      </div>

      <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
        <User className="h-6 w-6 text-primary" /> Editar Ficha del Paciente
      </h1>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Datos Personales ─────────────────────────────────── */}
        <Card className="border-0 shadow-sm rounded-2xl bg-card">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Datos Personales
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre" name="first_name" value={form.first_name} onChange={handleChange} required placeholder="Nombre" />
            <Field label="Apellidos" name="last_name" value={form.last_name} onChange={handleChange} required placeholder="Apellidos" />
            <Field label="DNI / NIE" name="dni_nie" value={form.dni_nie} onChange={handleChange} placeholder="12345678A" />
            <Field label="Fecha de Nacimiento" name="dob" value={form.dob} onChange={handleChange} type="date" />
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Sexo</label>
              <select name="gender" value={form.gender} onChange={handleChange}
                className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/60 transition-all">
                <option value="">Seleccionar...</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Estado</label>
              <select name="in_treatment" value={form.in_treatment} onChange={handleChange}
                className="w-full rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/60 transition-all">
                <option value="true">En Tratamiento</option>
                <option value="false">Alta</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* ── Etiquetas & Categorización ─────────────────────────── */}
        <Card className="border-0 shadow-sm rounded-2xl bg-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <TagIcon className="h-4 w-4 text-primary" /> Etiquetas & Categorización (Familiar, Henryschein, Referido...)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Busca o crea etiquetas dinámicas para organizar y filtrar a este paciente (estilo WordPress):
            </p>
            <TagInput selectedTags={selectedTags} onChange={setSelectedTags} />
          </CardContent>
        </Card>

        {/* ── Contacto y Facturación ───────────────────────────────────── */}
        <Card className="border-0 shadow-sm rounded-2xl bg-card">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" /> Contacto y Facturación
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-6">

            {/* Checkbox unificación */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border/60">
              <input
                type="checkbox"
                id="billing-different"
                checked={!form.billing_same_as_contact}
                onChange={(e) => handleBillingSameAsContactChange(e.target.checked)}
                className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0"
              />
              <label htmlFor="billing-different" className="text-sm font-medium text-foreground cursor-pointer leading-relaxed">
                <span className="font-semibold">Los datos de facturación son diferentes a los de contacto</span>
                <br />
                <span className="text-xs text-muted-foreground">Desmarcado = se usan los mismos datos (se autollenan desde contacto)</span>
              </label>
            </div>

            {/* SECCIÓN CONTACTO (siempre visible) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Teléfono" name="phone" value={form.phone} onChange={handleChange} type="tel" placeholder="+34 600 000 000" />
              <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" placeholder="correo@ejemplo.com" />
              <Field label="Dirección (Calle)" name="address" value={form.address} onChange={handleChange} placeholder="Calle, número..." />
              <Field label="Dirección 2 (opcional)" name="address_2" value={form.address_2} onChange={handleChange} placeholder="Piso, puerta, urbanización..." />
              <Field label="C.P." name="postal_code" value={form.postal_code} onChange={handleChange} placeholder="28001" />
              <Field label="Ciudad" name="city" value={form.city} onChange={handleChange} placeholder="Madrid" />
              <Field label="Provincia" name="province" value={form.province} onChange={handleChange} placeholder="Madrid" />
              <Field label="País" name="country" value={form.country} onChange={handleChange} placeholder="España" />
            </div>

            {/* SECCIÓN FACTURACIÓN (condicional - slide animation) */}
            <div
              id="billing-section"
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showBillingSection
                  ? "max-h-[800px] opacity-100 mt-4 pt-4 border-t border-border/60"
                  : "max-h-0 opacity-0 -mt-4"
              }`}
              role="region"
              aria-labelledby="billing-different"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="NIF / CIF" name="nif_cif" value={form.nif_cif} onChange={handleChange} placeholder="12345678A" disabled={form.billing_same_as_contact} />
                <Field label="Nombre / Razón Social" name="billing_name" value={form.billing_name} onChange={handleChange} placeholder="Nombre o empresa para factura" disabled={form.billing_same_as_contact} />
                <div className="sm:col-span-2">
                  <Field label="Dirección Fiscal" name="billing_address" value={form.billing_address} onChange={handleChange} placeholder="Calle, número, piso..." disabled={form.billing_same_as_contact} />
                </div>
                <Field label="Dirección Fiscal 2 (opcional)" name="billing_address_2" value={form.billing_address_2} onChange={handleChange} placeholder="Piso, puerta, etc." disabled={form.billing_same_as_contact} />
                <Field label="Ciudad" name="billing_city" value={form.billing_city} onChange={handleChange} placeholder="Madrid" disabled={form.billing_same_as_contact} />
                <Field label="Código Postal" name="billing_postal_code" value={form.billing_postal_code} onChange={handleChange} placeholder="28001" disabled={form.billing_same_as_contact} />
                <Field label="Provincia" name="billing_province" value={form.billing_province} onChange={handleChange} placeholder="Madrid" disabled={form.billing_same_as_contact} />
                <Field label="País" name="billing_country" value={form.billing_country} onChange={handleChange} placeholder="España" disabled={form.billing_same_as_contact} />
              </div>
              {form.billing_same_as_contact && (
                <p className="text-xs text-muted-foreground italic">
                  Los campos de facturación se autollenan desde los datos de contacto. Marca la casilla arriba para editarlos independientemente.
                </p>
              )}
            </div>

          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm rounded-2xl bg-card">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Clínicas Asignadas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground mb-3">Selecciona las clínicas a las que pertenece este paciente. Marca una como principal.</p>
            <div className="flex flex-wrap gap-2">
              {allClinics.map(clinic => {
                const selected = selectedClinicIds.includes(clinic.id);
                const isPrimary = primaryClinicId === clinic.id;
                return (
                  <div key={clinic.id} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    selected
                      ? "bg-info/10 border-info/30 text-info"
                      : "bg-muted border-border text-muted-foreground hover:border-info/40"
                  }`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleClinic(clinic.id)}
                      className="accent-info cursor-pointer"
                    />
                    <span onClick={() => toggleClinic(clinic.id)}>{clinic.name}</span>
                    {selected && (
                      <button
                        type="button"
                        onClick={() => setPrimaryClinicId(isPrimary ? null : clinic.id)}
                        className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-lg font-bold border transition-all ${
                          isPrimary ? "bg-info text-white border-info" : "bg-card text-info/70 border-info/40 hover:bg-info/10"
                        }`}
                      >
                        {isPrimary ? "Principal ✓" : "Principal"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Representantes (si es menor) ─────────────────────── */}
        {isMinor && (
          <Card className="border-0 shadow-sm rounded-2xl bg-warning/10 border-warning/30">
            <CardHeader className="pb-3 border-b border-warning/20">
              <CardTitle className="text-sm font-bold text-warning flex items-center gap-2">
                <Baby className="h-4 w-4 text-warning" /> Representante Legal (Menor de edad)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {representatives.map((rep, i) => (
                <div key={i} className="bg-card rounded-xl border border-warning/20 p-4 space-y-3 relative">
                  <button type="button" onClick={() => removeRep(i)}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Nombre completo" name="full_name" value={rep.full_name} onChange={(e) => handleRepChange(i, "full_name", e.target.value)} required placeholder="Nombre del representante" />
                    <Field label="Parentesco" name="relationship" value={rep.relationship} onChange={(e) => handleRepChange(i, "relationship", e.target.value)} placeholder="Madre, Padre, Tutor..." />
                    <Field label="DNI/NIE" name="dni_nie" value={rep.dni_nie} onChange={(e) => handleRepChange(i, "dni_nie", e.target.value)} placeholder="12345678A" />
                    <Field label="Teléfono" name="phone" value={rep.phone} onChange={(e) => handleRepChange(i, "phone", e.target.value)} placeholder="+34 600 000 000" />
                    <Field label="Email" name="email" value={rep.email} onChange={(e) => handleRepChange(i, "email", e.target.value)} placeholder="email@ejemplo.com" />
                    <div className="flex items-center gap-2 pt-5">
                      <input type="checkbox" checked={rep.is_primary_contact}
                        onChange={(e) => handleRepChange(i, "is_primary_contact", e.target.checked)}
                        className="accent-warning" id={`primary-rep-${i}`} />
                      <label htmlFor={`primary-rep-${i}`} className="text-xs font-semibold text-warning">Contacto principal</label>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addRep} className="h-8 gap-1.5 text-xs rounded-xl border-warning/30 text-warning hover:bg-warning/10">
                <Plus className="h-3.5 w-3.5" /> Añadir representante
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Anamnesis ─────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm rounded-2xl bg-card">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" /> Anamnesis Médica
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextArea label="Alergias" name="allergies" value={form.allergies} onChange={handleChange} placeholder="Aspirinas, AAS, penicilina..." />
            <TextArea label="Antecedentes médicos" name="important_diseases" value={form.important_diseases} onChange={handleChange} placeholder="Enfermedades relevantes..." />
            <TextArea label="Operaciones previas" name="previous_operations" value={form.previous_operations} onChange={handleChange} placeholder="Apéndice, amígdalas..." />
            <TextArea label="Medicación actual" name="current_medication" value={form.current_medication} onChange={handleChange} placeholder="Ninguna / Especificar..." />
            <div className="sm:col-span-2">
              <TextArea label="Plan de tratamiento" name="treatment_plan" value={form.treatment_plan} onChange={handleChange} rows={4} placeholder="Descripción del plan de tratamiento en curso..." />
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end gap-3 pb-6">
          <Link href={`/patients/${targetId}`}>
            <Button variant="outline" type="button" className="h-10 rounded-xl text-sm font-semibold">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving} className="h-10 gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-md shadow-primary/20">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Cambios
          </Button>
        </div>
      </form>
    </div>
  );
}

// inline icon stub (avoids import collision)
