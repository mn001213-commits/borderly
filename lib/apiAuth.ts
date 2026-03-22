import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabaseAdmin";

export async function requireAuth(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  return { user: data.user, error: null } as const;
}
