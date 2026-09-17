import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "melosmile_session";
const AUTH_TOKEN_VALUE = "valid_melosmile_session_token_oslysmile";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (sessionToken === AUTH_TOKEN_VALUE) {
    let user = {
      username: "Oslysmile",
      name: "Dra. Osly Melo",
      role: "Administrador",
    };
    try {
      const userCookie = cookieStore.get("melosmile_user")?.value;
      if (userCookie) {
        user = JSON.parse(userCookie);
      }
    } catch {}

    return NextResponse.json({
      authenticated: true,
      user,
    });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
