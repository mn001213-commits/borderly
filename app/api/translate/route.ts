import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/apiAuth";

// Simple in-memory rate limiter: max 30 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(req);
    if (authError) return authError;

    // Rate limit check
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { text, targetLang } = await req.json();

    if (!text || !targetLang) {
      return NextResponse.json(
        { error: "text and targetLang are required" },
        { status: 400 }
      );
    }

    const trimmed = text.slice(0, 2000);

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      trimmed
    )}&langpair=autodetect|${encodeURIComponent(targetLang)}`;

    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Translation service unavailable" },
        { status: 502 }
      );
    }

    const data = await res.json();

    const translatedText =
      data?.responseData?.translatedText ?? trimmed;

    return NextResponse.json({ translatedText });
  } catch {
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}
