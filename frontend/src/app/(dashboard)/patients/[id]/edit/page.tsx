"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Save, Loader2, User, Phone, Mail, MapPin, FileText,
  Stethoscope, AlertCircle, Pill, Activity, Building2, Baby,
  CreditCard, Plus, X, BadgeCheck, Tag as TagIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { TagInput, TagItem } from "@/components/patients/tag-input";

type Clinic = { id: string; name: string };

function Field({ label, name, value, onChange, type = "text", placeholder = "", required = false }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}{required && <span className="text-rose-500 ml-1">*</span>}</label>
      <input
        type={type} name={name} value={value} onChange={onChange} required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all"
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
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</label>
      <textarea
        name={name} value={value} onChange={onChange} rows={rows} placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all resize-none"
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

  const [form, setForm] = useState({
    first_name: "", last_name: "", dni_nie: "", dob: "", gender: "",
    phone: "", email: "", address: "",
    allergies: "", important_diseases: "", previous_operations: "", current_medication: "", treatment_plan: "",
    in_treatment: "true",
    // Billing
    nif_cif: "", billing_name: "", billing_address: "", billing_city: "",
    billing_postal_code: "", billing_country: "España",
  });

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
        const dob = p.dob ? p.dob.split("T")[0] : "";
        setForm({
          first_name: p.first_name ?? "", last_name: p.last_name ?? "",
          dni_nie: p.dni_nie ?? "", dob, gender: p.gender ?? "",
          phone: p.phone ?? "", email: p.email ?? "", address: p.address ?? "",
          allergies: p.allergies ?? "", important_diseases: p.important_diseases ?? "",
          previous_operations: p.previous_operations ?? "",
          current_medication: p.current_medication ?? "",
          treatment_plan: p.treatment_plan ?? "",
          in_treatment: p.in_treatment ? "true" : "false",
          nif_cif: (p as any).nif_cif ?? "", billing_name: (p as any).billing_name ?? "",
          billing_address: (p as any).billing_address ?? "", billing_city: (p as any).billing_city ?? "",
          billing_postal_code: (p as any).billing_postal_code ?? "",
          billing_country: (p as any).billing_country ?? "España",
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

      // Update patient
      const { error: updateErr } = await (supabase as any).from("patients").update({
        first_name: form.first_name, last_name: form.last_name,
        dni_nie: form.dni_nie || null, dob: form.dob || null,
        gender: form.gender || null, phone: form.phone || null,
        email: form.email || null, address: form.address || null,
        allergies: form.allergies || null, important_diseases: form.important_diseases || null,
        previous_operations: form.previous_operations || null,
        current_medication: form.current_medication || null,
        treatment_plan: form.treatment_plan || null,
        in_treatment: form.in_treatment === "true",
        nif_cif: form.nif_cif || null, billing_name: form.billing_name || null,
        billing_address: form.billing_address || null, billing_city: form.billing_city || null,
        billing_postal_code: form.billing_postal_code || null, billing_country: form.billing_country,
      }).eq("id", patientId);

      if (updateErr) {
        console.error("Error actualizando paciente:", updateErr);
        alert(`Error al guardar datos: ${updateErr.message}`);
        return;
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
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
        <span className="ml-3 text-slate-600 font-medium">Cargando datos del paciente...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[900px] mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={`/patients/${targetId}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver a la ficha
        </Link>
        <div className="flex items-center gap-3">
          {success && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4" /> Guardado correctamente
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs shadow-md shadow-rose-500/20"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Cambios
          </Button>
        </div>
      </div>

      <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
        <User className="h-6 w-6 text-rose-500" /> Editar Ficha del Paciente
      </h1>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Datos Personales ─────────────────────────────────── */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-rose-500" /> Datos Personales
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre" name="first_name" value={form.first_name} onChange={handleChange} required placeholder="Nombre" />
            <Field label="Apellidos" name="last_name" value={form.last_name} onChange={handleChange} required placeholder="Apellidos" />
            <Field label="DNI / NIE" name="dni_nie" value={form.dni_nie} onChange={handleChange} placeholder="12345678A" />
            <Field label="Fecha de Nacimiento" name="dob" value={form.dob} onChange={handleChange} type="date" />
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Sexo</label>
              <select name="gender" value={form.gender} onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all">
                <option value="">Seleccionar...</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Estado</label>
              <select name="in_treatment" value={form.in_treatment} onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all">
                <option value="true">En Tratamiento</option>
                <option value="false">Alta</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* ── Etiquetas & Categorización ─────────────────────────── */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TagIcon className="h-4 w-4 text-rose-500" /> Etiquetas & Categorización (Familiar, Henryschein, Referido...)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs font-medium text-slate-500">
              Busca o crea etiquetas dinámicas para organizar y filtrar a este paciente (estilo WordPress):
            </p>
            <TagInput selectedTags={selectedTags} onChange={setSelectedTags} />
          </CardContent>
        </Card>

        {/* ── Contacto ─────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Phone className="h-4 w-4 text-rose-500" /> Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Teléfono" name="phone" value={form.phone} onChange={handleChange} type="tel" placeholder="+34 600 000 000" />
            <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" placeholder="correo@ejemplo.com" />
            <div className="sm:col-span-2">
              <Field label="Dirección" name="address" value={form.address} onChange={handleChange} placeholder="Calle, número, ciudad..." />
            </div>
          </CardContent>
        </Card>

        {/* ── Clínicas Vinculadas ───────────────────────────────── */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-rose-500" /> Clínicas Asignadas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-500 mb-3">Selecciona las clínicas a las que pertenece este paciente. Marca una como principal.</p>
            <div className="flex flex-wrap gap-2">
              {allClinics.map(clinic => {
                const selected = selectedClinicIds.includes(clinic.id);
                const isPrimary = primaryClinicId === clinic.id;
                return (
                  <div key={clinic.id} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    selected
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-200"
                  }`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleClinic(clinic.id)}
                      className="accent-blue-500 cursor-pointer"
                    />
                    <span onClick={() => toggleClinic(clinic.id)}>{clinic.name}</span>
                    {selected && (
                      <button
                        type="button"
                        onClick={() => setPrimaryClinicId(isPrimary ? null : clinic.id)}
                        className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-lg font-bold border transition-all ${
                          isPrimary ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-400 border-blue-200 hover:bg-blue-100"
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
          <Card className="border-0 shadow-sm rounded-2xl bg-amber-50 border-amber-200">
            <CardHeader className="pb-3 border-b border-amber-100">
              <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                <Baby className="h-4 w-4 text-amber-600" /> Representante Legal (Menor de edad)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {representatives.map((rep, i) => (
                <div key={i} className="bg-white rounded-xl border border-amber-100 p-4 space-y-3 relative">
                  <button type="button" onClick={() => removeRep(i)}
                    className="absolute top-3 right-3 text-slate-300 hover:text-red-500">
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
                        className="accent-amber-500" id={`primary-rep-${i}`} />
                      <label htmlFor={`primary-rep-${i}`} className="text-xs font-semibold text-amber-700">Contacto principal</label>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addRep} className="h-8 gap-1.5 text-xs rounded-xl border-amber-200 text-amber-700 hover:bg-amber-100">
                <Plus className="h-3.5 w-3.5" /> Añadir representante
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Anamnesis ─────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlertIcon className="h-4 w-4 text-rose-500" /> Anamnesis Médica
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

        {/* ── Datos de Facturación (para Odoo) ─────────────────── */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-rose-500" /> Datos de Facturación (Odoo)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="NIF / CIF" name="nif_cif" value={form.nif_cif} onChange={handleChange} placeholder="12345678A" />
            <Field label="Nombre / Razón Social" name="billing_name" value={form.billing_name} onChange={handleChange} placeholder="Nombre o empresa para factura" />
            <div className="sm:col-span-2">
              <Field label="Dirección Fiscal" name="billing_address" value={form.billing_address} onChange={handleChange} placeholder="Calle, número, piso..." />
            </div>
            <Field label="Ciudad" name="billing_city" value={form.billing_city} onChange={handleChange} placeholder="Madrid" />
            <Field label="Código Postal" name="billing_postal_code" value={form.billing_postal_code} onChange={handleChange} placeholder="28001" />
            <Field label="País" name="billing_country" value={form.billing_country} onChange={handleChange} placeholder="España" />
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end gap-3 pb-6">
          <Link href={`/patients/${targetId}`}>
            <Button variant="outline" type="button" className="h-10 rounded-xl text-sm font-semibold">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving} className="h-10 gap-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-md shadow-rose-500/20">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Cambios
          </Button>
        </div>
      </form>
    </div>
  );
}

// inline icon stub (avoids import collision)
function ShieldAlertIcon(props: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
