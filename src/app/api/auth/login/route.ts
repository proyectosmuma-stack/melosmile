import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/server";

const VALID_USER = process.env.AUTH_USERNAME || "Oslysmile";
const VALID_PASS = process.env.AUTH_PASSWORD || "@Konnan1983";
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

    const cleanUser = String(username).trim();
    const cleanPass = String(password).trim();

    // 1. Check Supabase DB (app_users table)
    let authenticatedUser: { username: string; name: string; role: string } | null = null;

    try {
      const { data: dbUser, error: dbError } = await (supabaseAdmin as any)
        .from("app_users")
        .select("id, username, password_hash, name, role, is_active")
        .ilike("username", cleanUser)
        .eq("is_active", true)
        .maybeSingle();

      if (!dbError && dbUser && dbUser.password_hash) {
        const isPasswordValid = bcrypt.compareSync(cleanPass, dbUser.password_hash);
        if (isPasswordValid) {
          authenticatedUser = {
            username: dbUser.username,
            name: dbUser.name || "Dra. Osly Melo",
            role: dbUser.role || "Administrador",
          };
        }
      }
    } catch (dbErr) {
      console.warn("DB auth lookup fallback:", dbErr);
    }

    // 2. Fallbacks (Hardened resilience for Oslysmile & emergency recovery)
    if (!authenticatedUser) {
      const isOslysmile =
        cleanUser.toLowerCase() === "oslysmile" && cleanPass === "@Konnan1983";
      const isEnvMatch =
        cleanUser.toLowerCase() === VALID_USER.toLowerCase() &&
        cleanPass === VALID_PASS;
      const isLegacyMatch =
        cleanUser.toLowerCase() === "clinica" &&
        cleanPass === "melosmile2024";

      if (isOslysmile || isEnvMatch) {
        authenticatedUser = {
          username: "Oslysmile",
          name: "Dra. Osly Melo",
          role: "Administrador",
        };
      } else if (isLegacyMatch) {
        authenticatedUser = {
          username: "clinica",
          name: "Dra. Osly Melo",
          role: "Administrador",
        };
      }
    }

    if (authenticatedUser) {
      const cookieStore = await cookies();

      // Set secure HTTP-Only session cookie valid for 30 days
      cookieStore.set(AUTH_COOKIE_NAME, AUTH_TOKEN_VALUE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });

      cookieStore.set("melosmile_user", JSON.stringify(authenticatedUser), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: "/",
      });

      return NextResponse.json({
        success: true,
        user: authenticatedUser,
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
