import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// IP-based rate limiter: max 5 requests per minute (stricter — unauthenticated endpoint)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let email: string;
  try {
    const body = await req.json();
    email = body.email;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const normalizedEmail = email.trim().toLowerCase();

  // Fetch all users and find by email (Supabase JS v2 has no getUserByEmail)
  const { data: listData, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    return NextResponse.json({ exists: false });
  }

  const matchedUser = listData.users.find(
    (u) => u.email?.toLowerCase() === normalizedEmail
  );

  if (!matchedUser) {
    return NextResponse.json({ exists: false });
  }

  // Primary check: app_metadata.providers (more reliable than identities)
  const providers: string[] = matchedUser.app_metadata?.providers ?? [];
  const hasEmailInProviders = providers.includes("email");
  const hasGoogleInProviders = providers.includes("google");

  // Fallback check: identities array
  const identities = matchedUser.identities ?? [];
  const hasEmailInIdentities = identities.some((i) => i.provider === "email");
  const hasGoogleInIdentities = identities.some((i) => i.provider === "google");

  const isEmailAccount = hasEmailInProviders || hasEmailInIdentities;
  const isGoogleAccount = hasGoogleInProviders || hasGoogleInIdentities;

  if (isGoogleAccount && !isEmailAccount) {
    return NextResponse.json({ exists: true, isOAuthOnly: true, provider: "google" });
  }

  return NextResponse.json({ exists: true, isOAuthOnly: false });
}
