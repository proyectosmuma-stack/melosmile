import { NextResponse } from "next/server";
import { getWhatsAppStatus } from "@/lib/whatsapp/evolution";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getWhatsAppStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, isConnected: false, state: "close", error: err.message },
      { status: 500 }
    );
  }
}
