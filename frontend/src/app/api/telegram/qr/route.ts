import { NextRequest } from 'next/server';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import QRCode from 'qrcode';
import { supabaseAdmin as supabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  // 1. Obtener api_id y api_hash de la configuración de Supabase
  const { data: settings } = await (supabase as any)
    .from('messaging_settings')
    .select('telegram_api_id, telegram_api_hash, telegram_phone')
    .eq('id', 1)
    .single();

  const apiId = Number(settings?.telegram_api_id || process.env.TELEGRAM_API_ID || 31158011);
  const apiHash = settings?.telegram_api_hash || process.env.TELEGRAM_API_HASH || '9258407c8ea67b1e5d97bd04214ed6f8';

  const stream = new ReadableStream({
    async start(controller) {
      let isStreamClosed = false;
      const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
        connectionRetries: 5,
      });

      const sendEvent = (payload: any) => {
        if (isStreamClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          isStreamClosed = true;
        }
      };

      const closeStream = async () => {
        if (isStreamClosed) return;
        isStreamClosed = true;
        try {
          await client.disconnect();
        } catch {
          // ignore disconnect errors
        }
        try {
          controller.close();
        } catch {
          // ignore close errors
        }
      };

      // Si el cliente cierra el modal o corta la conexión HTTP
      req.signal.addEventListener('abort', () => {
        closeStream();
      });

      try {
        sendEvent({ type: 'status', message: 'Conectando con servidores de Telegram...' });
        await client.connect();

        const user: any = await client.signInUserWithQrCode(
          { apiId, apiHash },
          {
            qrCode: async (code: { token: Buffer; expires: number }) => {
              if (isStreamClosed) return;
              const tokenBase64 = Buffer.from(code.token).toString('base64url');
              const qrUrl = `tg://login?token=${tokenBase64}`;
              const qrDataUrl = await QRCode.toDataURL(qrUrl, {
                width: 340,
                margin: 2,
                color: {
                  dark: '#0f172a',
                  light: '#ffffff',
                },
              });

              // Telegram expira los QR en ~30s
              const secondsLeft = Math.max(10, Math.min(35, Math.floor(code.expires - Date.now() / 1000) || 30));

              sendEvent({
                type: 'qr',
                qrDataUrl,
                expires: secondsLeft,
              });
            },
            onError: async (err: Error): Promise<boolean> => {
              console.error('[Telegram QR Error]:', err);
              sendEvent({ type: 'error', message: err.message || 'Error durante la autenticación por QR' });
              return true; // stop auth flow on error
            },
          }
        );

        if (user && !isStreamClosed) {
          const sessionString = client.session.save();
          const userPhone = user.phone ? (user.phone.startsWith('+') ? user.phone : `+${user.phone}`) : settings?.telegram_phone;
          const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Usuario Telegram';

          // Actualizar base de datos Supabase
          const { error: dbError } = await (supabase as any)
            .from('messaging_settings')
            .update({
              telegram_enabled: true,
              telegram_phone: userPhone,
              telegram_session_string: sessionString,
              updated_at: new Date().toISOString(),
            })
            .eq('id', 1);

          if (dbError) {
            console.error('[Telegram Save DB Error]:', dbError);
          }

          sendEvent({
            type: 'success',
            user: {
              id: String(user.id),
              name: userName,
              phone: userPhone,
              username: user.username,
            },
          });
        }
      } catch (err: any) {
        if (!isStreamClosed) {
          console.error('[Telegram QR Stream Exception]:', err);
          sendEvent({ type: 'error', message: err.message || 'Fallo de conexión con Telegram' });
        }
      } finally {
        await closeStream();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
