import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { org_name, org_purpose, org_url, purpose } = await req.json();

    if (!org_name || org_name.trim().length < 2) {
      return NextResponse.json({ error: "Organization name is required (min 2 chars)" }, { status: 400 });
    }
    if (!org_purpose || org_purpose.trim().length < 5) {
      return NextResponse.json({ error: "Organization purpose is required (min 5 chars)" }, { status: 400 });
    }
    if (!purpose || purpose.trim().length < 10) {
      return NextResponse.json({ error: "Activity purpose is required (min 10 chars)" }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({
        user_type: "ngo",
        ngo_verified: false,
        ngo_org_name: org_name.trim(),
        ngo_org_purpose: org_purpose.trim(),
        ngo_org_url: org_url?.trim() || null,
        ngo_purpose: purpose.trim(),
        ngo_status: "pending",
      })
      .eq("id", user.id);

    if (updateErr) {
      console.error("[ngo-onboarding] DB error:", updateErr.message);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
