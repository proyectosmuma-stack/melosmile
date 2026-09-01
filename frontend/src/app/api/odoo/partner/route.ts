import { NextResponse } from 'next/server';
import { upsertOdooPartner } from '@/lib/odoo/client';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const partnerId = await upsertOdooPartner(data);
    
    return NextResponse.json({ success: true, partnerId });
  } catch (error: any) {
    console.error('Error in /api/odoo/partner:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar partner en Odoo' },
      { status: 500 }
    );
  }
}
