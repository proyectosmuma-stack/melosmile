"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Upload, Camera, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function MobileUploadPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // We decode the JWT token (base64) to show the date/patient if we want,
  // but it's not strictly necessary as it's handled server-side.

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
      setStatus("idle");
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !token) return;
    
    setUploading(true);
    setStatus("idle");
    setErrorMessage("");
    setProgress(0);

    let successCount = 0;
    
    let imageCompression: any = null;
    try {
      const mod = await import('browser-image-compression');
      imageCompression = mod.default || mod;
    } catch (e) {
      console.warn("Image compression module not found", e);
    }

    try {
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        
        if (imageCompression && file.type.startsWith('image/')) {
          try {
            const options = { maxSizeMB: 1.5, maxWidthOrHeight: 2048, useWebWorker: true };
            const compressedBlob = await imageCompression(file, options);
            file = new File([compressedBlob], file.name, { type: file.type });
          } catch (e) {
            console.warn("Error compressing image:", e);
          }
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("token", token);

        const response = await fetch("/api/mobile-upload/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Error al subir la imagen");
        }
        
        successCount++;
        setProgress(Math.round((successCount / files.length) * 100));
      }
      
      setStatus("success");
      setFiles([]);
    } catch (error: any) {
      console.error("Upload error:", error);
      setStatus("error");
      setErrorMessage(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4 font-sans selection:bg-primary/20">
      <div className="w-full max-w-md mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subir Fotos a la Cita</h1>
          <p className="text-slate-500 text-sm px-4">
            Personal de clínica: selecciona fotos o haz una nueva para adjuntarlas directamente a la ficha del paciente.
          </p>
        </div>

        <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
          <CardContent className="p-6 space-y-6">
            
            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-3">
              <Button 
                size="lg" 
                className="w-full h-14 rounded-2xl text-base font-semibold shadow-md shadow-primary/20 transition-transform active:scale-[0.98]"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <ImageIcon className="mr-2 h-5 w-5" />
                Seleccionar Fotos
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Selected Files Preview */}
            {files.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-sm font-bold text-slate-700">{files.length} foto(s) seleccionada(s)</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {files.map((file, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      {!uploading && (
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                        >
                          <span className="text-xs font-bold leading-none">&times;</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <Button 
                  size="lg" 
                  variant="default"
                  className="w-full h-14 rounded-2xl text-base font-bold mt-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Subiendo... {progress}%
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-5 w-5" />
                      Subir a Melosmile
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Status Messages */}
            {status === "success" && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <h3 className="font-bold text-emerald-800">¡Subida completada!</h3>
                <p className="text-sm text-emerald-600 mt-1">
                  Las fotos ya están disponibles en el ordenador. Puedes cerrar esta ventana o subir más fotos.
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                <h3 className="font-bold text-red-800">Error al subir</h3>
                <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
              </div>
            )}
            
          </CardContent>
        </Card>
        
        <div className="text-center">
          <p className="text-xs text-slate-400 font-medium">Conexión segura con Melosmile Clinic</p>
        </div>
      </div>
    </div>
  );
}
