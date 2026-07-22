import { NextResponse } from "next/server";
import { getOdooProducts } from "@/lib/odoo/client";

export async function GET() {
  try {
    const products = await getOdooProducts();
    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error("Error fetching Odoo products:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
