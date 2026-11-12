import { NextResponse } from "next/server";
import { getWhatsAppQr } from "@/lib/whatsapp/evolution";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const qrData = await getWhatsAppQr();
    if (!qrData.success) {
      return NextResponse.json(
        { success: false, error: qrData.error },
        { status: 400 }
      );
    }
    return NextResponse.json(qrData);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Error al obtener código QR" },
      { status: 500 }
    );
  }
}
