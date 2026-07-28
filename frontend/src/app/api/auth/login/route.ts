import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const VALID_USER = "Oslysmile";
const VALID_PASS = "@Konnan1983";
export const AUTH_COOKIE_NAME = "melosmile_session";
export const AUTH_TOKEN_VALUE = "valid_melosmile_session_token_oslysmile";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Por favor ingresa el usuario y la contraseña." },
        { status: 400 }
      );
    }

    if (username === VALID_USER && password === VALID_PASS) {
      const cookieStore = await cookies();
      
      // Set secure HTTP-Only session cookie valid for 30 days
      cookieStore.set(AUTH_COOKIE_NAME, AUTH_TOKEN_VALUE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });

      return NextResponse.json({
        success: true,
        user: {
          username: VALID_USER,
          name: "Dra. Osly Melo",
          role: "Administrador",
        },
      });
    }

    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar el inicio de sesión." },
      { status: 500 }
    );
  }
}
