import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
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
