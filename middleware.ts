import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGIN = "https://borderly-tawny.vercel.app";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS preflight
  if (request.method === "OPTIONS") {
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

  // CSRF protection for mutation requests
  if (request.method !== "GET") {
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
  response.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
