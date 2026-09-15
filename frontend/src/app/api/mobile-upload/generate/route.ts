import { NextResponse } from "next/server";
import { SignJWT } from "jose";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { appointmentId, patientId, appointmentDate } = body;

    if (!appointmentId || !patientId || !appointmentDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Usamos el JWT secret de Supabase si existe, sino caemos en un fallback
    const secret = new TextEncoder().encode(
      process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || "melosmile-secret-key-12345"
    );

    // Creamos un JWT firmado que expira en 15 minutos
    const token = await new SignJWT({
      appointmentId,
      patientId,
      appointmentDate,
      purpose: "mobile_upload",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secret);

    // Obtener la URL base dinámicamente o usar el HOST si existe
    const host = req.headers.get("host") || "localhost:3028";
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;
    const uploadUrl = `${baseUrl}/c/${token}`;

    return NextResponse.json({ token, url: uploadUrl });
  } catch (error: any) {
    console.error("Error generating mobile upload token:", error);
    return NextResponse.json({ error: "Failed to generate token" }, { status: 500 });
  }
}
