import { NextResponse } from "next/server";
import { getOdooPricelists } from "@/lib/odoo/client";

export async function GET() {
  try {
    const pricelists = await getOdooPricelists();
    return NextResponse.json({ success: true, data: pricelists });
  } catch (error: any) {
    console.error("Error fetching Odoo pricelists:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
