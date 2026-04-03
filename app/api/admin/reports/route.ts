import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuth } from "@/lib/apiAuth";

export async function GET(req: Request) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  const uid = user.id;

  // DB에서 admin role 확인
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", uid)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: mr, error: mrErr } = await supabaseAdmin
    .from("message_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (mrErr) return NextResponse.json({ error: "Internal server error" }, { status: 500 });

  const { data: cr, error: crErr } = await supabaseAdmin
    .from("conversation_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (crErr) return NextResponse.json({ error: "Internal server error" }, { status: 500 });

  return NextResponse.json({
    message_reports: mr ?? [],
    conversation_reports: cr ?? [],
  });
}
