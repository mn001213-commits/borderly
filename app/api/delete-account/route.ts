import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    // Verify auth via Bearer token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = user.id;

    // Delete all user data in dependency order
    // 1. Reactions & read receipts (depend on messages)
    await supabaseAdmin.from("message_reactions").delete().eq("user_id", uid);
    await supabaseAdmin.from("message_read_receipts").delete().eq("user_id", uid);

    // 2. Messages
    await supabaseAdmin.from("messages").delete().eq("sender_id", uid);

    // 3. Conversation memberships & conversations created by user
    await supabaseAdmin.from("conversation_members").delete().eq("user_id", uid);
    await supabaseAdmin.from("direct_conversations").delete().eq("user1_id", uid);
    await supabaseAdmin.from("direct_conversations").delete().eq("user2_id", uid);

    // 4. Post interactions
    await supabaseAdmin.from("post_likes").delete().eq("user_id", uid);
    await supabaseAdmin.from("post_bookmarks").delete().eq("user_id", uid);
    await supabaseAdmin.from("comments").delete().eq("user_id", uid);

    // 5. Posts
    await supabaseAdmin.from("posts").delete().eq("user_id", uid);

    // 6. Meet data
    await supabaseAdmin.from("meet_participants").delete().eq("user_id", uid);
    await supabaseAdmin.from("meet_reminders").delete().eq("user_id", uid);
    await supabaseAdmin.from("meet_posts").delete().eq("host_id", uid);

    // 7. NGO data
    await supabaseAdmin.from("ngo_applications").delete().eq("user_id", uid);
    await supabaseAdmin.from("ngo_posts").delete().eq("user_id", uid);

    // 8. Social data
    await supabaseAdmin.from("follows").delete().eq("follower_id", uid);
    await supabaseAdmin.from("follows").delete().eq("following_id", uid);
    await supabaseAdmin.from("close_friends").delete().eq("user_id", uid);
    await supabaseAdmin.from("close_friends").delete().eq("friend_id", uid);
    await supabaseAdmin.from("blocks").delete().eq("blocker_id", uid);
    await supabaseAdmin.from("blocks").delete().eq("blocked_id", uid);

    // 9. Reports & notifications
    await supabaseAdmin.from("reports").delete().eq("reporter_id", uid);
    await supabaseAdmin.from("message_reports").delete().eq("reporter_id", uid);
    await supabaseAdmin.from("conversation_reports").delete().eq("reporter_id", uid);
    await supabaseAdmin.from("notifications").delete().eq("user_id", uid);

    // 10. Profile
    await supabaseAdmin.from("profiles").delete().eq("id", uid);

    // 11. Delete auth user
    await supabaseAdmin.auth.admin.deleteUser(uid);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}
