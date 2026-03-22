"use client";

import { supabase } from "./supabaseClient";

export async function getMyUserId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export async function blockUser(meId: string, otherId: string) {
  const { error } = await supabase.from("blocks").insert({
    blocker_id: meId,
    blocked_id: otherId,
  });
  if (error) throw error;
}

export async function unblockUser(meId: string, otherId: string) {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", meId)
    .eq("blocked_id", otherId);

  if (error) throw error;
}