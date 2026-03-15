import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGIN = "https://borderly-tawny.vercel.app";
const isProd = process.env.NODE_ENV === "production";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- CORS preflight for API routes ---
  if (pathname.startsWith("/api") && request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // --- CSRF protection for API mutation requests ---
  if (pathname.startsWith("/api") && request.method !== "GET") {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: "CSRF: origin mismatch" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "CSRF: invalid origin" }, { status: 403 });
      }
    }
  }

  const response = NextResponse.next();

  // --- Security headers (production) ---
  if (isProd) {
    const csp = [
      "default-src 'self'",
      // unsafe-inline needed for Next.js hydration scripts; unsafe-eval removed
      "script-src 'self' 'unsafe-inline' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://*.supabase.co https://*.supabase.in",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co wss://*.supabase.in https://api.mymemory.translated.net https://accounts.google.com",
      "frame-src https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  // --- CORS header for API responses ---
  if (pathname.startsWith("/api")) {
    response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
