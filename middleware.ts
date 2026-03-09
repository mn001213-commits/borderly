import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  // Auth is handled client-side via supabase.auth.getUser()
  // Each protected page redirects to /login if not authenticated
  return NextResponse.next();
}
