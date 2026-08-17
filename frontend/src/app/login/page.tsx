"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Activity, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar sesión");
      }

      // Success -> Redirect to home dashboard
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Credenciales incorrectas. Verifica tu usuario y contraseña.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-sidebar flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-(--brand-ai-to)/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Main Login Container */}
      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary via-primary to-primary/70 shadow-xl shadow-primary/20 ring-1 ring-white/20 mb-2">
            <Activity className="h-9 w-9 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              MeloSmile
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary/80 border border-primary/30">
                PRO
              </span>
            </h1>
            <p className="text-sm text-sidebar-muted-foreground mt-1">
              Plataforma de Gestión Clínica Odontológica
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="bg-sidebar-accent/80 backdrop-blur-xl border-sidebar-border text-sidebar-foreground shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="space-y-1 pb-4 text-center border-b border-sidebar-border/60 bg-sidebar/40">
            <CardTitle className="text-xl font-bold text-sidebar-foreground flex items-center justify-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Acceso Seguro
            </CardTitle>
            <CardDescription className="text-sidebar-muted-foreground text-xs">
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Banner */}
              {error && (
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 text-primary/80 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary/80" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider block">
                  Usuario
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sidebar-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    type="text"
                    required
                    placeholder="Ej. melosmile"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11 bg-sidebar/70 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-muted-foreground focus:border-primary focus:ring-primary/20 rounded-xl"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider block">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sidebar-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-sidebar/70 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-muted-foreground focus:border-primary focus:ring-primary/20 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sidebar-muted-foreground hover:text-sidebar-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-white font-semibold shadow-lg shadow-primary/20 gap-2 transition-all cursor-pointer disabled:opacity-70"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Iniciando sesión...</span>
                  </div>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-sidebar-muted-foreground">
          MeloSmile &copy; {new Date().getFullYear()} — Acceso restringido para personal autorizado
        </p>
      </div>
    </div>
  );
}