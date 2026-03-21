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
    const errors: string[] = [];

    // Helper: delete and collect errors without stopping
    const del = async (table: string, column: string) => {
      const { error } = await supabaseAdmin.from(table).delete().eq(column, uid);
      if (error) errors.push(`${table}: ${error.message}`);
    };

    // Delete all user data in dependency order
    // 1. Reactions & read receipts
    await del("message_reactions", "user_id");
    await del("message_read_receipts", "user_id");

    // 2. Messages
    await del("messages", "sender_id");

    // 3. Conversation memberships & conversations
    await del("conversation_members", "user_id");
    await del("direct_conversations", "user1_id");
    await del("direct_conversations", "user2_id");

    // 4. Post interactions
    await del("post_likes", "user_id");
    await del("post_bookmarks", "user_id");
    await del("comments", "user_id");

    // 5. Posts
    await del("posts", "user_id");

    // 6. Meet data
    await del("meet_participants", "user_id");
    await del("meet_reminders", "user_id");
    await del("meet_posts", "host_id");

    // 7. NGO data
    await del("ngo_applications", "user_id");
    await del("ngo_posts", "user_id");

    // 8. Social data
    await del("follows", "follower_id");
    await del("follows", "following_id");
    await del("close_friends", "user_id");
    await del("close_friends", "friend_id");
    await del("blocks", "blocker_id");
    await del("blocks", "blocked_id");

    // 9. Reports & notifications
    await del("reports", "reporter_id");
    await del("message_reports", "reporter_id");
    await del("conversation_reports", "reporter_id");
    await del("notifications", "user_id");

    // 10. Profile
    await del("profiles", "id");

    // 11. Delete auth user — this MUST succeed
    const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (deleteAuthErr) {
      return NextResponse.json(
        { error: `Failed to delete auth user: ${deleteAuthErr.message}`, dataErrors: errors },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, warnings: errors.length > 0 ? errors : undefined });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}
