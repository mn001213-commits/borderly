import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, display_name, residence_country, origin_country, languages, user_type } = body;

    if (!id || !display_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const upsertData: Record<string, unknown> = {
      id,
      display_name,
      residence_country: residence_country || null,
      origin_country: origin_country || null,
      languages: languages || [],
      user_type: user_type || "local",
      ngo_verified: false,
    };

    // Pass through NGO fields if present
    if (body.ngo_org_name) upsertData.ngo_org_name = body.ngo_org_name;
    if (body.ngo_org_purpose) upsertData.ngo_org_purpose = body.ngo_org_purpose;
    if (body.ngo_org_url !== undefined) upsertData.ngo_org_url = body.ngo_org_url;
    if (body.ngo_purpose) upsertData.ngo_purpose = body.ngo_purpose;
    if (body.ngo_status) upsertData.ngo_status = body.ngo_status;
    if (body.ngo_rep_name) upsertData.ngo_rep_name = body.ngo_rep_name;
    if (body.ngo_rep_email) upsertData.ngo_rep_email = body.ngo_rep_email;
    if (body.ngo_rep_phone) upsertData.ngo_rep_phone = body.ngo_rep_phone;
    if (body.ngo_activity_countries) upsertData.ngo_activity_countries = body.ngo_activity_countries;

    const { error } = await supabaseAdmin.from("profiles").upsert(
      upsertData,
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
