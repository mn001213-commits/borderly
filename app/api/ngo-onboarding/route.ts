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

    const { org_name, org_purpose, org_url, purpose, rep_name, rep_email, rep_phone, activity_countries } = await req.json();

    if (!org_name || org_name.trim().length < 2) {
      return NextResponse.json({ error: "Organization name is required (min 2 chars)" }, { status: 400 });
    }
    if (!org_purpose || org_purpose.trim().length < 5) {
      return NextResponse.json({ error: "Organization purpose is required (min 5 chars)" }, { status: 400 });
    }
    if (!purpose || purpose.trim().length < 10) {
      return NextResponse.json({ error: "Activity purpose is required (min 10 chars)" }, { status: 400 });
    }
    if (!rep_name || rep_name.trim().length < 2) {
      return NextResponse.json({ error: "Representative name is required (min 2 chars)" }, { status: 400 });
    }
    if (!rep_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rep_email.trim())) {
      return NextResponse.json({ error: "Valid representative email is required" }, { status: 400 });
    }
    if (!rep_phone || rep_phone.trim().length < 5) {
      return NextResponse.json({ error: "Representative phone is required (min 5 chars)" }, { status: 400 });
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
        ngo_rep_name: rep_name.trim(),
        ngo_rep_email: rep_email.trim(),
        ngo_rep_phone: rep_phone.trim(),
        ngo_activity_countries: Array.isArray(activity_countries) ? activity_countries : [],
        ngo_status: "pending",
      })
      .eq("id", user.id);

    if (updateErr) {
      if (process.env.NODE_ENV === "development") console.error("[ngo-onboarding] DB error:", updateErr.message, updateErr.details, updateErr.hint);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("[ngo-onboarding] Unexpected error:", e);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
