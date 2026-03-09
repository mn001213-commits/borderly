import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ADMIN_UIDS = new Set<string>([
  // Add admin UIDs here if needed, e.g. "uuid-here"
]);

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  const { data: userRes, error: uErr } = await supabaseAdmin.auth.getUser(token);
  if (uErr || !userRes.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const uid = userRes.user.id;

  if (ADMIN_UIDS.size > 0 && !ADMIN_UIDS.has(uid)) {
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
