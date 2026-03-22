import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuth } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth(req);
    if (authError) return authError;

    const uid = user.id;
    const errors: string[] = [];

    // Helper: delete rows matching column = uid, collect errors without stopping
    const del = async (table: string, column: string) => {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, uid);
      if (error) errors.push(`${table}.${column}: ${error.message}`);
    };

    // Helper: delete rows matching column IN ids
    const delIn = async (table: string, column: string, ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .in(column, ids);
      if (error) errors.push(`${table}.${column}(cascade): ${error.message}`);
    };

    // ── 1. Collect IDs of user's own content ──

    const { data: myMessages } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("sender_id", uid);
    const msgIds = (myMessages ?? []).map((m: { id: string }) => m.id);

    const { data: myPosts } = await supabaseAdmin
      .from("posts")
      .select("id")
      .eq("user_id", uid);
    const postIds = (myPosts ?? []).map((p: { id: string }) => p.id);

    const { data: myMeets } = await supabaseAdmin
      .from("meet_posts")
      .select("id")
      .eq("host_id", uid);
    const meetIds = (myMeets ?? []).map((m: { id: string }) => m.id);

    // ── 2. Delete OTHER users' references to MY messages ──

    await delIn("message_reactions", "message_id", msgIds);
    await delIn("message_read_receipts", "message_id", msgIds);

    // Also delete my own reactions/receipts on other people's messages
    await del("message_reactions", "user_id");
    await del("message_read_receipts", "user_id");

    // ── 3. Delete my messages (now safe — no FK references remain) ──

    await del("messages", "sender_id");

    // ── 4. Conversation memberships ──
    // Remove my membership; keep direct_conversations intact for the other party

    await del("conversation_members", "user_id");

    // ── 5. Delete OTHER users' references to MY posts ──

    await delIn("post_likes", "post_id", postIds);
    await delIn("post_bookmarks", "post_id", postIds);
    await delIn("comments", "post_id", postIds);

    // Also delete my own likes/bookmarks/comments on other people's posts
    await del("post_likes", "user_id");
    await del("post_bookmarks", "user_id");
    await del("comments", "user_id");

    // ── 6. Delete my posts (now safe — no FK references remain) ──

    await del("posts", "user_id");

    // ── 7. Delete OTHER users' references to MY meets ──

    await delIn("meet_participants", "meet_id", meetIds);
    await delIn("meet_reminders", "meet_id", meetIds);

    // Also delete my own participation/reminders in other people's meets
    await del("meet_participants", "user_id");
    await del("meet_reminders", "user_id");

    // ── 8. Delete my meets (now safe — no FK references remain) ──

    await del("meet_posts", "host_id");

    // ── 9. NGO data ──

    await del("ngo_applications", "user_id");
    await del("ngo_posts", "user_id");

    // ── 10. Social relationships (both directions) ──

    await del("follows", "follower_id");
    await del("follows", "following_id");
    await del("close_friends", "user_id");
    await del("close_friends", "friend_id");
    await del("blocks", "blocker_id");
    await del("blocks", "blocked_id");

    // ── 11. Reports & notifications ──

    await del("reports", "reporter_id");
    await del("message_reports", "reporter_id");
    await del("conversation_reports", "reporter_id");
    await del("notifications", "user_id");
    await del("notifications", "target_user_id");

    // ── 12. Profile ──

    await del("profiles", "id");

    // ── 13. Delete auth user — this MUST succeed ──

    const { error: deleteAuthErr } =
      await supabaseAdmin.auth.admin.deleteUser(uid);
    if (deleteAuthErr) {
      return NextResponse.json(
        {
          error: `Failed to delete auth user: ${deleteAuthErr.message}`,
          dataErrors: errors,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
