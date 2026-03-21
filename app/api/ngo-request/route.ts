import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { org_name, org_url, purpose } = await req.json();

    // Send email to admin
    if (resend && ADMIN_EMAIL) {
      await resend.emails.send({
        from: "Borderly <noreply@borderly.app>",
        to: ADMIN_EMAIL,
        subject: `[Borderly] New NGO Registration Request: ${org_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">New NGO Registration Request</h2>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 16px 0;">
              <p><strong>Organization:</strong> ${org_name}</p>
              <p><strong>Website:</strong> ${org_url || "Not provided"}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Purpose:</strong></p>
              <p style="white-space: pre-wrap;">${purpose}</p>
            </div>
            <p style="color: #666; font-size: 14px;">
              Review and approve this request at your admin dashboard:
              <a href="https://borderly-tawny.vercel.app/admin/ngo">Admin NGO Dashboard</a>
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
