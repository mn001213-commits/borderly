import { supabase } from "@/lib/supabaseClient";

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
