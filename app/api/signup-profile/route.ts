import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, display_name, residence_country, origin_country, languages, user_type } = body;

    if (!id || !display_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("profiles").upsert(
      {
        id,
        display_name,
        residence_country: residence_country || null,
        origin_country: origin_country || null,
        languages: languages || [],
        user_type: user_type || "local",
        ngo_verified: false,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("[signup-profile] DB error:", error.message);
      return NextResponse.json({ error: "Profile creation failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
