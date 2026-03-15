import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  const { data: userRes, error: uErr } = await supabaseAdmin.auth.getUser(token);
  if (uErr || !userRes.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const uid = userRes.user.id;

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

  if (mrErr) return NextResponse.json({ error: mrErr.message }, { status: 500 });

  const { data: cr, error: crErr } = await supabaseAdmin
    .from("conversation_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (crErr) return NextResponse.json({ error: crErr.message }, { status: 500 });

  return NextResponse.json({
    message_reports: mr ?? [],
    conversation_reports: cr ?? [],
  });
}
