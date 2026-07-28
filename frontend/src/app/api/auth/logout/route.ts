import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "melosmile_session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);

  return NextResponse.json({ success: true, message: "Sesión cerrada correctamente." });
}

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);

  const response = NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3028"));
  return response;
}
