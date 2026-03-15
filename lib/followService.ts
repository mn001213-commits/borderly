import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notificationService";

export async function followUser(myId: string, targetId: string) {
  const result = await supabase.from("follows").insert({
    follower_id: myId,
    following_id: targetId,
  });

  if (!result.error) {
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", myId)
      .maybeSingle();

    const name = myProfile?.display_name ?? "Someone";
    createNotification({
      userId: targetId,
      type: "follow",
      title: `${name} started following you`,
      link: `/u/${myId}`,
      meta: { follower_id: myId },
    });
  }

  return result;
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
