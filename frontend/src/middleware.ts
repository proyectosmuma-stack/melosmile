import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "melosmile_session";
const AUTH_TOKEN_VALUE = "valid_melosmile_session_token_oslysmile";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, Next.js internal paths, public auth & AI context/webhook endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/ai-context") ||
    pathname.startsWith("/api/dispatcher") ||
    pathname.startsWith("/api/billing/document-cleaner") ||
    pathname.includes(".") || // static files like favicon.ico, images, etc.
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = sessionToken === AUTH_TOKEN_VALUE;

  // If user is accessing /login
  if (pathname === "/login") {
    if (isAuthenticated) {
      // Already logged in -> redirect to main dashboard
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Not logged in -> show login page
    return NextResponse.next();
  }

  // For any other path (protected system routes)
  if (!isAuthenticated) {
    // If it's an API route call, return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para continuar." },
        { status: 401 }
      );
    }

    // Redirect unauthenticated user to /login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
