import { supabase } from "./supabaseClient";

export async function createGroupConversation(
  name: string,
  memberIds: string[]
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Create conversation
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert({
      type: "group",
      name: name.trim(),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (convErr || !conv) return null;

  const conversationId = conv.id as string;

  // Add creator as admin + all members
  const members = [
    { conversation_id: conversationId, user_id: user.id, role: "admin" },
    ...memberIds
      .filter((id) => id !== user.id)
      .map((id) => ({
        conversation_id: conversationId,
        user_id: id,
        role: "member",
      })),
  ];

  const { error: memErr } = await supabase
    .from("conversation_members")
    .insert(members);

  if (memErr) {
    // Cleanup conversation if members insert fails
    await supabase.from("conversations").delete().eq("id", conversationId);
    return null;
  }

  return conversationId;
}

export async function getGroupMembers(conversationId: string) {
  const { data: members, error: memErr } = await supabase
    .from("conversation_members")
    .select("user_id, role")
    .eq("conversation_id", conversationId);

  if (memErr || !members) return [];

  const userIds = members.map((m: any) => m.user_id);

  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map<
    string,
    { display_name: string | null; avatar_url: string | null }
  >();

  for (const p of profiles ?? []) {
    profileMap.set(p.id, {
      display_name: p.display_name,
      avatar_url: p.avatar_url,
    });
  }

  return members.map((m: any) => ({
    user_id: m.user_id,
    role: m.role ?? "member",
    display_name: profileMap.get(m.user_id)?.display_name ?? null,
    avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
  }));
}

export async function addGroupMember(
  conversationId: string,
  userId: string
) {
  // Verify caller is admin of the group
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: myMembership } = await supabase
    .from("conversation_members")
    .select("role")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myMembership || myMembership.role !== "admin") return false;

  const { error } = await supabase.from("conversation_members").upsert(
    [{ conversation_id: conversationId, user_id: userId, role: "member" }],
    { onConflict: "conversation_id,user_id" }
  );
  return !error;
}

export async function removeGroupMember(
  conversationId: string,
  userId: string
) {
  // Verify caller is admin of the group (or removing themselves)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  if (user.id !== userId) {
    const { data: myMembership } = await supabase
      .from("conversation_members")
      .select("role")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!myMembership || myMembership.role !== "admin") return false;
  }

  const { error } = await supabase
    .from("conversation_members")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  return !error;
}

export async function leaveGroup(conversationId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  return removeGroupMember(conversationId, user.id);
}

export async function updateGroupName(
  conversationId: string,
  name: string
) {
  // Verify caller is admin of the group
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: myMembership } = await supabase
    .from("conversation_members")
    .select("role")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myMembership || myMembership.role !== "admin") return false;

  const { error } = await supabase
    .from("conversations")
    .update({ name: name.trim().slice(0, 50) })
    .eq("id", conversationId);
  return !error;
}

export async function getConversationInfo(conversationId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, type, name, avatar_url, created_by")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) return null;
  return data as {
    id: string;
    type: string;
    name: string | null;
    avatar_url: string | null;
    created_by: string | null;
  };
}

export async function searchUsers(query: string, excludeIds: string[] = []) {
  let q = supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .ilike("display_name", `%${query}%`)
    .limit(20);

  if (excludeIds.length > 0) {
    // Filter client-side since .not().in() can be tricky
    const { data, error } = await q;
    if (error || !data) return [];
    return data.filter((p: any) => !excludeIds.includes(p.id));
  }

  const { data, error } = await q;
  if (error || !data) return [];
  return data;
}
