import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ✅ 너(운영자) 계정만 허용하고 싶으면 여기에 UID 넣기
const ADMIN_UIDS = new Set<string>([
  // "운영자_uid_여기에",
]);

export async function GET(req: Request) {
  // 1) Authorization header에서 사용자 JWT 읽기
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  // 2) 토큰으로 유저 확인 (admin이지만 user 검사 가능)
  const { data: userRes, error: uErr } = await supabaseAdmin.auth.getUser(token);
  if (uErr || !userRes.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const uid = userRes.user.id;

  // 3) 운영자 체크 (UID 제한)
  if (ADMIN_UIDS.size > 0 && !ADMIN_UIDS.has(uid)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4) 신고 목록 가져오기 (message_reports, conversation_reports 둘 다)
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