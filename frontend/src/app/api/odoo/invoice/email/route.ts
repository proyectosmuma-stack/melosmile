import { NextResponse } from "next/server";
import { sendOdooInvoiceEmail } from "@/lib/odoo/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "invoiceId es requerido" },
        { status: 400 }
      );
    }

    // Call the client function to send email via Odoo
    await sendOdooInvoiceEmail(invoiceId);

    return NextResponse.json({
      success: true,
      message: "Email enviado correctamente a través de Odoo",
    });
  } catch (error: any) {
    console.error("Error al enviar email de Odoo:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al enviar email a través de Odoo" },
      { status: 500 }
    );
  }
}
