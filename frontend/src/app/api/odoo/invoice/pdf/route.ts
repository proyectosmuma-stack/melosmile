import { NextResponse } from "next/server";
import { getOdooInvoicePdf } from "@/lib/odoo/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceIdParam = searchParams.get("invoiceId");

    if (!invoiceIdParam) {
      return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
    }

    const invoiceId = parseInt(invoiceIdParam, 10);
    if (isNaN(invoiceId)) {
      return NextResponse.json({ error: "Invalid invoiceId" }, { status: 400 });
    }

    const base64Pdf = await getOdooInvoicePdf(invoiceId);

    if (!base64Pdf) {
      return NextResponse.json({ error: "No se pudo obtener el PDF de Odoo" }, { status: 404 });
    }

    const pdfBuffer = Buffer.from(base64Pdf, "base64");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Factura_${invoiceId}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error fetching Odoo PDF:", error);
    return NextResponse.json(
      { error: error.message || "Error al conectar con Odoo" },
      { status: 500 }
    );
  }
}
