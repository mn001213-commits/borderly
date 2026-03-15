import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Supabase JS client stores sessions in localStorage (not cookies),
// so middleware cannot verify auth. Protected route auth is handled
// client-side via supabase.auth.getUser() + router.replace("/login").
// Middleware only handles CSRF protection for API routes.

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF protection for API mutation routes
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
