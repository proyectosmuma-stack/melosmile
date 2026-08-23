"use client";

import * as React from "react";
import { Camera, ImageOff, ChevronDown, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PhotoLightbox } from "./photo-lightbox";
import { isImageDocument } from "@/lib/utils/document-utils";

type ApiDocument = {
  id: string;
  appointment_id: string | null;
  appointment_date: string | null;
  reason_cita: string | null;
  document_type: string | null;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  description: string | null;
  created_at: string | null;
  resolved_url: string | null;
};

type LightboxPhoto = {
  id: string;
  url: string | null;
  file_name: string;
  document_type: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  description: string | null;
  created_at: string | null;
};

type Group = {
  key: string;
  appointment_id: string | null;
  appointment_date: string | null;
  reason_cita: string | null;
  created_at_ref: string | null;
  photos: LightboxPhoto[];
};

type Props = {
  patientId: string;
};

function formatLongDateEs(dateStr: string | null): string {
  if (!dateStr) return "Sin fecha";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  const s = d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toLightboxPhoto(doc: ApiDocument): LightboxPhoto {
  return {
    id: doc.id,
    url: doc.resolved_url,
    file_name: doc.file_name,
    document_type: doc.document_type,
    file_size_bytes: doc.file_size_bytes,
    mime_type: doc.mime_type,
    description: doc.description,
    created_at: doc.created_at,
  };
}

function Thumbnail({
  photo,
  onClick,
}: {
  photo: LightboxPhoto;
  onClick: () => void;
}) {
  const [error, setError] = React.useState(false);

  if (error || !photo.url) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Ver ${photo.file_name}`}
        className="group relative aspect-square w-full overflow-hidden rounded-md bg-muted border border-border flex flex-col items-center justify-center gap-1.5 cursor-zoom-in hover:bg-muted/80 transition-colors"
      >
        <ImageOff className="h-6 w-6 text-muted-foreground" />
        <span className="text-[10px] font-medium text-muted-foreground px-2 text-center leading-tight line-clamp-2">
          {photo.file_name}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver ${photo.file_name}`}
      className="group relative aspect-square w-full overflow-hidden rounded-md bg-muted border border-border cursor-zoom-in"
    >
      <img
        src={photo.url}
        alt={photo.file_name}
        loading="lazy"
        decoding="async"
        onError={() => setError(true)}
        className="aspect-square w-full object-cover rounded-md group-hover:opacity-90 transition-opacity"
      />
      <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-black/5 group-hover:ring-primary/20 transition-all" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="pointer-events-none absolute bottom-1 left-1 right-1 text-[10px] font-bold text-white leading-tight line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
        {photo.file_name}
      </span>
    </button>
  );
}

export function PhotoGallery({ patientId }: Props) {
  const [docs, setDocs] = React.useState<ApiDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const limit = 200;

  const [collapsedKeys, setCollapsedKeys] = React.useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = React.useState<{ groupKey: string; index: number } | null>(null);

  const fetchPage = React.useCallback(
    async (nextOffset: number, append: boolean) => {
      try {
        if (!append) setLoading(true);
        else setLoadingMore(true);
        setError(null);
        const res = await fetch(
          `/api/documents?patientId=${encodeURIComponent(patientId)}&limit=${limit}&offset=${nextOffset}`
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `Error ${res.status}`);
        }
        const json = (await res.json()) as { documents: ApiDocument[]; total: number; hasMore: boolean };
        const incoming: ApiDocument[] = Array.isArray(json.documents) ? json.documents : [];
        // filtrar imágenes y merge sin duplicar por id
        const filtered = incoming.filter((d) =>
          isImageDocument({ file_name: d.file_name, document_type: d.document_type, mime_type: d.mime_type })
        );
        setDocs((prev) => {
          if (!append) return filtered;
          const seen = new Set(prev.map((p) => p.id));
          const merged = [...prev];
          for (const doc of filtered) {
            if (!seen.has(doc.id)) {
              merged.push(doc);
              seen.add(doc.id);
            }
          }
          return merged;
        });
        setHasMore(Boolean(json.hasMore));
        setOffset(nextOffset);
      } catch (e: any) {
        setError(e.message || "No se pudieron cargar las fotografías");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [patientId]
  );

  React.useEffect(() => {
    setDocs([]);
    setOffset(0);
    setHasMore(false);
    setError(null);
    if (patientId) fetchPage(0, false);
  }, [patientId, fetchPage]);

  const groups: Group[] = React.useMemo(() => {
    const map = new Map<string, Group>();
    for (const doc of docs) {
      const hasApt = Boolean(doc.appointment_id && doc.appointment_date);
      const key = hasApt ? `apt-${doc.appointment_id}` : "sin-cita";
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          appointment_id: doc.appointment_id,
          appointment_date: doc.appointment_date,
          reason_cita: doc.reason_cita,
          created_at_ref: doc.created_at,
          photos: [],
        };
        map.set(key, g);
      }
      // Mantener la fecha más reciente como referencia para sin-cita
      if (!hasApt && doc.created_at && g.created_at_ref && new Date(doc.created_at) > new Date(g.created_at_ref)) {
        g.created_at_ref = doc.created_at;
      }
      g.photos.push(toLightboxPhoto(doc));
      // Si hay motivo, conserva el primero no-nulo
      if (!g.reason_cita && doc.reason_cita) g.reason_cita = doc.reason_cita;
    }

    const arr = [...map.values()];
    arr.sort((a, b) => {
      const aDate = a.appointment_date ?? a.created_at_ref;
      const bDate = b.appointment_date ?? b.created_at_ref;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    return arr;
  }, [docs]);

  const activeGroupPhotos: LightboxPhoto[] = React.useMemo(() => {
    if (!lightbox) return [];
    const g = groups.find((x) => x.key === lightbox.groupKey);
    return g ? g.photos : [];
  }, [groups, lightbox]);

  const activeIndex = lightbox ? lightbox.index : null;

  const handleThumbClick = (groupKey: string, idx: number) => {
    setLightbox({ groupKey, index: idx });
  };

  const handleLightboxChange = (i: number | null) => {
    if (i === null) setLightbox(null);
    else if (lightbox) setLightbox({ ...lightbox, index: i });
  };

  const toggleCollapse = (key: string) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-5 space-y-6">
        {[0, 1].map((g) => (
          <div key={g} className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-bold text-foreground">No se pudieron cargar las fotografías</p>
        <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={() => fetchPage(0, false)} className="rounded-xl gap-1.5 mt-1">
          <RefreshCw className="h-3.5 w-3.5" /> Reintentar
        </Button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Camera className="h-7 w-7 text-primary" />
        </div>
        <p className="text-sm font-bold text-foreground">Sin fotografías clínicas aún</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Las fotografías clínicas asociadas a citas aparecerán aquí agrupadas cronológicamente. Usa la zona de
          documentos para subir las primeras imágenes.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      {groups.map((group) => {
        const isSinCita = group.key === "sin-cita";
        const collapsed = collapsedKeys.has(group.key);
        const headerDate = isSinCita ? "Sin cita asociada" : formatLongDateEs(group.appointment_date);
        const sub = isSinCita
          ? group.photos.length === 1
            ? "1 fotografía sin cita vinculada"
            : `${group.photos.length} fotografías sin cita vinculada`
          : group.reason_cita || "Cita clínica";

        return (
          <div key={group.key} className="space-y-3">
            <button
              type="button"
              onClick={() => toggleCollapse(group.key)}
              className="w-full flex items-center justify-between gap-3 group text-left"
              aria-expanded={!collapsed}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Camera className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground leading-none truncate">{headerDate}</p>
                  <p className="text-xs font-medium text-muted-foreground truncate">{sub}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center rounded-full bg-muted border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  {group.photos.length}
                </span>
                <span
                  className={`h-7 w-7 rounded-xl border border-border bg-card flex items-center justify-center transition-transform duration-200 ${collapsed ? "-rotate-90" : "rotate-0"}`}
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </span>
              </div>
            </button>

            {!collapsed && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 animate-in fade-in-0 duration-200">
                {group.photos.map((photo, idx) => (
                  <Thumbnail key={photo.id} photo={photo} onClick={() => handleThumbClick(group.key, idx)} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={() => fetchPage(offset + limit, true)}
            className="rounded-xl gap-2 font-semibold"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loadingMore ? "Cargando..." : "Cargar más"}
          </Button>
        </div>
      )}

      <PhotoLightbox photos={activeGroupPhotos} index={activeIndex} onIndexChange={handleLightboxChange} />
    </div>
  );
}
