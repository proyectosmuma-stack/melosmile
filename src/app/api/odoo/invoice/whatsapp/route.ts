import { NextResponse } from "next/server";
import { getOdooInvoicePdf } from "@/lib/odoo/client";
import { sendWhatsAppDocument } from "@/lib/whatsapp/evolution";

const WHATSAPP_CAPTION = "¡Hola! Le enviamos la factura de su tratamiento en MeloSmile. Adjuntamos el PDF para su archivo. Gracias por confiar en nosotros.";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invoiceId, phone, invoiceNumber } = body;

    if (!invoiceId || !phone) {
      return NextResponse.json(
        { success: false, error: "invoiceId y phone son requeridos" },
        { status: 400 }
      );
    }

    const base64Pdf = await getOdooInvoicePdf(invoiceId);
    if (!base64Pdf) {
      return NextResponse.json({ success: false, error: "No se pudo obtener el PDF de Odoo" }, { status: 404 });
    }

    const fileName = invoiceNumber
      ? `Factura_${String(invoiceNumber).replace(/[^a-zA-Z0-9_\-/]/g, "_")}.pdf`
      : `Factura_${invoiceId}.pdf`;

    const result = await sendWhatsAppDocument({
      phone,
      fileName,
      mediaBase64: base64Pdf,
      caption: WHATSAPP_CAPTION,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Error al enviar WhatsApp" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (error: any) {
    console.error("Error enviando factura por WhatsApp:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al enviar factura por WhatsApp" },
      { status: 500 }
    );
  }
}