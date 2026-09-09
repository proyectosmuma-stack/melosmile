import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies() as any;
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data, error } = await supabase
      .from('system_notifications')
      .select('id, title, message, type, read, link, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching system notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Unexpected error in GET /api/notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cookieStore = cookies() as any;
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const body = await request.json();
    const { id, read, link, title, message, type } = body;

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const updateData: {
      read?: boolean;
      link?: string;
      title?: string;
      message?: string;
      type?: string;
    } = {};

    if (typeof read !== 'undefined') updateData.read = read;
    if (typeof link !== 'undefined') updateData.link = link;
    if (typeof title !== 'undefined') updateData.title = title;
    if (typeof message !== 'undefined') updateData.message = message;
    if (typeof type !== 'undefined') updateData.type = type;

    const { error } = await supabase
      .from('system_notifications')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating system notification:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unexpected error in PATCH /api/notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
