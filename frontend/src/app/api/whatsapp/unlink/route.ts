import { NextResponse } from "next/server";
import { disconnectWhatsApp } from "@/lib/whatsapp/evolution";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await disconnectWhatsApp();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Error al desvincular WhatsApp" },
      { status: 500 }
    );
  }
}
