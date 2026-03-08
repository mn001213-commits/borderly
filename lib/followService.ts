import { supabase } from "@/lib/supabaseClient";

export async function followUser(myId: string, targetId: string) {
  return await supabase.from("follows").insert({
    follower_id: myId,
    following_id: targetId,
  });
}

export async function unfollowUser(myId: string, targetId: string) {
  return await supabase
    .from("follows")
    .delete()
    .eq("follower_id", myId)
    .eq("following_id", targetId);
}

export async function isFollowing(myId: string, targetId: string) {
  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", myId)
    .eq("following_id", targetId)
    .maybeSingle();

  return !!data;
}

export async function getFollowerCount(userId: string) {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);

  return count ?? 0;
}

export async function getFollowingCount(userId: string) {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);

  return count ?? 0;
}

export async function getFollowers(userId: string) {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId);

  return data ?? [];
}

export async function getFollowing(userId: string) {
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  return data ?? [];
}
