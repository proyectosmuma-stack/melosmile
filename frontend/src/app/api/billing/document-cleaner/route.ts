import { NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/document-cleaner';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Forward the document and metadata to n8n Agent 10
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error('N8N agent failed to process document');
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    console.error('Error in document-cleaner proxy:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
