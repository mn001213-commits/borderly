import { supabase } from "@/lib/supabaseClient";
import { t as rawT } from "@/lib/i18n";

/**
 * Resolves localized title/body for a notification.
 * If meta contains title_key/body_key, translates using those keys and fills in variables.
 * Falls back to stored title/body for legacy notifications.
 */
export function resolveNotifText(
  n: { title: string; body: string | null; meta?: any },
  tFn: (key: string) => string = rawT
): { title: string; body: string | null } {
  const meta = n.meta ?? {};

  function fillVars(template: string, vars: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  }

  const vars: Record<string, string> = {
    actor: meta.actor ?? "",
    content: meta.content ?? "",
    title: meta.meet_title ?? "",
  };

  const title = meta.title_key ? fillVars(tFn(meta.title_key), vars) : n.title;
  const body = meta.body_key ? fillVars(tFn(meta.body_key), vars) : n.body;

  return { title, body };
}

export type NotificationType = "comment" | "like" | "dm" | "meet" | "follow";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  meta: any;
  is_read: boolean;
  created_at: string;
};

async function getMe() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

export async function getUnreadCount() {
  const user = await getMe();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) throw error;

  return count ?? 0;
}

export async function listNotifications(limit = 50) {
  const user = await getMe();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []) as NotificationRow[];
}

export async function markAllRead() {
  const { error } = await supabase.rpc("mark_all_notifications_read");

  if (error) throw error;
}

export async function markRead(ids: string[]) {
  if (!ids.length) return;

  const { error } = await supabase.rpc("mark_notifications_read", {
    p_ids: ids,
  });

  if (error) throw error;
}

export async function createNotification({
  userId,
  type,
  title,
  body = null,
  link = null,
  meta = {},
}: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  meta?: any;
}) {
  if (!userId) return;

  const { data: targetProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    if (process.env.NODE_ENV === "development") console.error("createNotification profile lookup error:", profileError);
    return;
  }

  if (!targetProfile) {
    console.warn("createNotification skipped: profile not found for userId:", userId);
    return;
  }

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    link,
    meta,
  });

  if (error) {
    if (process.env.NODE_ENV === "development") console.error("createNotification error:", error);
    return;
  }
}