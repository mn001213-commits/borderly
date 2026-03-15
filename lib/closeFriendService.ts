import { supabase } from "@/lib/supabaseClient";

export async function getCloseFriends(userId: string) {
  const { data } = await supabase
    .from("close_friends")
    .select("friend_id")
    .eq("user_id", userId);
  return (data ?? []).map((r: any) => r.friend_id as string);
}

export async function isCloseFriend(userId: string, friendId: string) {
  const { data } = await supabase
    .from("close_friends")
    .select("id")
    .eq("user_id", userId)
    .eq("friend_id", friendId)
    .maybeSingle();
  return !!data;
}

export async function addCloseFriend(userId: string, friendId: string) {
  return await supabase
    .from("close_friends")
    .upsert({ user_id: userId, friend_id: friendId }, { onConflict: "user_id,friend_id" });
}

export async function removeCloseFriend(userId: string, friendId: string) {
  return await supabase
    .from("close_friends")
    .delete()
    .eq("user_id", userId)
    .eq("friend_id", friendId);
}

export async function getCloseFriendCount(userId: string) {
  const { count } = await supabase
    .from("close_friends")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}
