import { NextResponse } from 'next/server';
import { upsertOdooPartner, OdooPartnerNotFoundError } from '@/lib/odoo/client';

export async function POST(request: Request) {
  try {
    const { odoo_partner_id, patient_id, force_create, ...rest } = await request.json();
    const partnerId = await upsertOdooPartner({
      ...rest,
      odoo_partner_id: odoo_partner_id || undefined,
      patient_id: patient_id || undefined,
      force_create: force_create || false,
    });

    return NextResponse.json({ success: true, partnerId });
  } catch (error: any) {
    if (error instanceof OdooPartnerNotFoundError) {
      // Soft response: UI should ask the user to confirm first-time billing creation
      return NextResponse.json(
        {
          success: false,
          needs_confirmation: true,
          odoo_partner_id: error.odoo_partner_id,
          message: error.message,
        },
        { status: 409 }
      );
    }
    console.error('Error in /api/odoo/partner:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar partner en Odoo' },
      { status: 500 }
    );
  }
}
