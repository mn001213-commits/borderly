import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAuth } from "@/lib/apiAuth";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAuth(req);
  if (authError) return authError;

  try {
    const { org_name, org_purpose, org_url, purpose, rep_name, rep_email, rep_phone, activity_countries } = await req.json() as {
      org_name: string;
      org_purpose: string;
      org_url: string;
      purpose: string;
      rep_name?: string;
      rep_email?: string;
      rep_phone?: string;
      activity_countries?: string[];
    };

    // Send email to admin
    if (resend && ADMIN_EMAIL) {
      const countriesText = Array.isArray(activity_countries) && activity_countries.length > 0
        ? activity_countries.join(", ")
        : "Not provided";

      await resend.emails.send({
        from: "Borderly <noreply@borderly-global.com>",
        to: ADMIN_EMAIL,
        subject: `[Borderly] New Supporter Registration Request: ${org_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">New Supporter Registration Request</h2>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 16px 0;">
              <p><strong>Organization:</strong> ${escapeHtml(org_name)}</p>
              <p><strong>Organization Purpose:</strong></p>
              <p style="white-space: pre-wrap;">${escapeHtml(org_purpose || "Not provided")}</p>
              <p><strong>Website:</strong> ${escapeHtml(org_url || "Not provided")}</p>
              <p><strong>Activity Countries:</strong> ${escapeHtml(countriesText)}</p>
              <p><strong>Borderly Activity Purpose:</strong></p>
              <p style="white-space: pre-wrap;">${escapeHtml(purpose)}</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;">
              <p><strong>Representative:</strong> ${escapeHtml(rep_name || "Not provided")}</p>
              <p><strong>Rep Email:</strong> ${escapeHtml(rep_email || "Not provided")}</p>
              <p><strong>Rep Phone:</strong> ${escapeHtml(rep_phone || "Not provided")}</p>
            </div>
            <p style="color: #666; font-size: 14px;">
              Review and approve this request at your admin dashboard:
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://borderly-global.com"}/admin/ngo">Admin Supporter Dashboard</a>
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
