import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuth } from "@/lib/apiAuth";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(req);
    if (authError) return authError;

    // Check admin role
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminProfile?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { user_id, approved } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    // Update NGO status
    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({
        ngo_verified: approved,
        ngo_status: approved ? "approved" : "rejected",
      })
      .eq("id", user_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Get NGO user email
    const { data: ngoUser } = await supabaseAdmin.auth.admin.getUserById(user_id);
    const ngoEmail = ngoUser?.user?.email;

    // Get NGO profile for org name
    const { data: ngoProfile } = await supabaseAdmin
      .from("profiles")
      .select("ngo_org_name, display_name")
      .eq("id", user_id)
      .single();

    const orgName = ngoProfile?.ngo_org_name || ngoProfile?.display_name || "Organization";

    // Send approval/rejection email to NGO
    if (resend && ngoEmail) {
      if (approved) {
        await resend.emails.send({
          from: "Borderly <noreply@borderly-global.com>",
          to: ngoEmail,
          subject: `[Borderly] Your organization has been approved!`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a2e;">Congratulations, ${orgName}!</h2>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 16px 0;">
                <p style="color: #166534; font-size: 16px; font-weight: bold;">Your organization has been verified on Borderly.</p>
                <p style="color: #166534;">You can now create Supporter posts and connect with the community.</p>
              </div>
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://borderly-global.com"}/"
                 style="display: inline-block; background: #1a1a2e; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600;">
                Go to Borderly
              </a>
            </div>
          `,
        });
      } else {
        await resend.emails.send({
          from: "Borderly <noreply@borderly-global.com>",
          to: ngoEmail,
          subject: `[Borderly] Organization registration update`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a2e;">Registration Update for ${orgName}</h2>
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 16px 0;">
                <p style="color: #991b1b;">Unfortunately, your organization registration was not approved at this time.</p>
                <p style="color: #991b1b;">Please contact us for more information.</p>
              </div>
            </div>
          `,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
