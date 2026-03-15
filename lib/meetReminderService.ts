import { supabase } from "./supabaseClient";
import { createNotification } from "./notificationService";

const REMINDER_WINDOWS = [
  { type: "24h", ms: 24 * 60 * 60 * 1000 },
  { type: "1h", ms: 60 * 60 * 1000 },
  { type: "15m", ms: 15 * 60 * 1000 },
] as const;

export async function checkAndSendMeetReminders(userId: string) {
  // 1. Get meets the user has joined that haven't started yet
  const { data: participations } = await supabase
    .from("meet_participants")
    .select("meet_id")
    .eq("user_id", userId);

  if (!participations || participations.length === 0) return;

  const meetIds = participations.map((p: any) => p.meet_id);

  const { data: meets } = await supabase
    .from("meet_posts")
    .select("id, title, start_at")
    .in("id", meetIds)
    .eq("is_closed", false)
    .not("start_at", "is", null);

  if (!meets || meets.length === 0) return;

  const now = Date.now();

  // 2. Get already sent reminders
  const { data: sentReminders } = await supabase
    .from("meet_reminders")
    .select("meet_id, reminder_type")
    .eq("user_id", userId)
    .in("meet_id", meetIds);

  const sentSet = new Set(
    (sentReminders ?? []).map((r: any) => `${r.meet_id}:${r.reminder_type}`)
  );

  // 3. Check each meet for each reminder window
  for (const meet of meets) {
    const startAt = new Date(meet.start_at).getTime();
    if (startAt <= now) continue; // already started

    const timeUntil = startAt - now;

    for (const window of REMINDER_WINDOWS) {
      const key = `${meet.id}:${window.type}`;
      if (sentSet.has(key)) continue;

      // Send reminder if within the window (and not too early)
      // e.g., for "1h" window: send when timeUntil <= 1h
      if (timeUntil <= window.ms) {
        try {
          const label =
            window.type === "24h"
              ? "24 hours"
              : window.type === "1h"
                ? "1 hour"
                : "15 minutes";
          await createNotification({
            userId,
            type: "meet",
            title: "Meet reminder",
            body: `"${meet.title}" starts in ${label}!`,
            link: `/meet/${meet.id}`,
            meta: { meet_id: meet.id },
          });

          await supabase.from("meet_reminders").insert({
            meet_id: meet.id,
            user_id: userId,
            reminder_type: window.type,
          });
        } catch {} // ignore duplicates
      }
    }
  }
}
