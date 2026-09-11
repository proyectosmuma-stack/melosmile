import { NextResponse } from "next/server";
import { getWhatsAppProxy, setWhatsAppProxy } from "@/lib/whatsapp/evolution";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getWhatsAppProxy();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Error al obtener configuración de proxy" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { enabled, host, port, protocol, username, password } = body;

    if (enabled && (!host || !port || !protocol)) {
      return NextResponse.json(
        { success: false, error: "host, port y protocol son requeridos para habilitar proxy" },
        { status: 400 }
      );
    }

    const result = await setWhatsAppProxy({
      enabled: Boolean(enabled),
      host: host || "",
      port: Number(port) || 8080,
      protocol: protocol || "http",
      username: username || undefined,
      password: password || undefined,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Error al configurar proxy en WhatsApp" },
      { status: 500 }
    );
  }
}
