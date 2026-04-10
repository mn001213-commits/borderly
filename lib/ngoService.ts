import { supabase } from "./supabaseClient";

// ── Types ──

export type NgoCategory =
  | "general"
  | "environment"
  | "education"
  | "health"
  | "human_rights"
  | "community"
  | "animal_welfare"
  | "disaster_relief"
  | "refugee_support"
  | "arts_culture"
  | "social_gathering";

export type NgoChatType = "group" | "dm";

export type NgoPost = {
  id: string;
  ngo_user_id: string;
  title: string;
  description: string;
  location: string;
  website_url: string;
  image_url: string | null;
  category: NgoCategory;
  questions: string[];
  max_applicants: number | null;
  is_closed: boolean;
  chat_type: NgoChatType;
  group_conversation_id: string | null;
  created_at: string;
  // from view
  ngo_name?: string;
  ngo_avatar_url?: string | null;
  ngo_verified?: boolean;
  application_count?: number;
  approved_count?: number;
};

export type NgoApplication = {
  id: string;
  ngo_post_id: string;
  applicant_id: string;
  answers: string[];
  status: "pending" | "approved" | "rejected";
  created_at: string;
  // joined
  applicant_name?: string;
  applicant_avatar_url?: string | null;
};

// ── NGO Posts ──

export async function listNgoPosts(category?: NgoCategory, limit = 50) {
  let query = supabase
    .from("v_ngo_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category && category !== "general") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as NgoPost[];
}

export async function getNgoPost(id: string) {
  const { data, error } = await supabase
    .from("v_ngo_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as NgoPost;
}

export async function createNgoPost(post: {
  title: string;
  description: string;
  category: NgoCategory;
  location?: string;
  website_url?: string;
  image_url?: string | null;
  questions: string[];
  max_applicants?: number | null;
  chat_type?: NgoChatType;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("ngo_posts")
    .insert({
      ngo_user_id: uid,
      title: post.title,
      description: post.description,
      category: post.category,
      location: post.location || "",
      website_url: post.website_url || "",
      image_url: post.image_url,
      questions: post.questions,
      max_applicants: post.max_applicants ?? null,
      chat_type: post.chat_type ?? "group",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function updateNgoPost(
  id: string,
  updates: Partial<{
    title: string;
    description: string;
    category: NgoCategory;
    location: string;
    website_url: string;
    image_url: string | null;
    questions: string[];
    max_applicants: number | null;
    is_closed: boolean;
  }>
) {
  const { error } = await supabase
    .from("ngo_posts")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteNgoPost(id: string) {
  const { error } = await supabase.from("ngo_posts").delete().eq("id", id);
  if (error) throw error;
}

// ── Applications ──

export async function applyToNgoPost(ngoPostId: string, answers: string[]) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("ngo_applications")
    .insert({
      ngo_post_id: ngoPostId,
      applicant_id: uid,
      answers,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function getMyApplication(ngoPostId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;

  const { data } = await supabase
    .from("ngo_applications")
    .select("*")
    .eq("ngo_post_id", ngoPostId)
    .eq("applicant_id", uid)
    .maybeSingle();

  return data as NgoApplication | null;
}

export async function listApplications(ngoPostId: string) {
  const { data, error } = await supabase
    .from("ngo_applications")
    .select("*")
    .eq("ngo_post_id", ngoPostId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const apps = (data ?? []) as NgoApplication[];

  // Batch load applicant profiles
  const ids = [...new Set(apps.map((a) => a.applicant_id))];
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);

    const map = new Map(
      (profiles ?? []).map((p: any) => [p.id, p])
    );

    for (const app of apps) {
      const p = map.get(app.applicant_id);
      if (p) {
        app.applicant_name = p.display_name;
        app.applicant_avatar_url = p.avatar_url;
      }
    }
  }

  return apps;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "approved" | "rejected"
) {
  const { error } = await supabase
    .from("ngo_applications")
    .update({ status })
    .eq("id", applicationId);

  if (error) throw error;
}

// ── Create NGO conversation on approval ──

export async function createNgoConversation(
  ngoUserId: string,
  applicantId: string,
  post: Pick<NgoPost, "id" | "title" | "chat_type" | "group_conversation_id">
) {
  if (post.chat_type === "dm") {
    // DM mode: create a new 1:1 conversation for each approved applicant
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .insert({
        type: "ngo",
        name: null,
        created_by: ngoUserId,
      })
      .select("id")
      .single();

    if (convErr) throw convErr;

    const { error: memErr } = await supabase
      .from("conversation_members")
      .insert([
        { conversation_id: conv.id, user_id: ngoUserId, role: "admin" },
        { conversation_id: conv.id, user_id: applicantId, role: "member" },
      ]);

    if (memErr) throw memErr;

    return conv.id as string;
  }

  // Group mode: reuse shared group conversation or create it on first approval
  if (post.group_conversation_id) {
    // Add new member to existing group
    const { error: memErr } = await supabase
      .from("conversation_members")
      .insert({ conversation_id: post.group_conversation_id, user_id: applicantId, role: "member" });

    // Ignore duplicate member error (idempotent)
    if (memErr && !memErr.message.includes("duplicate")) throw memErr;

    return post.group_conversation_id;
  }

  // First approval: create the group conversation
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .insert({
      type: "ngo",
      name: `Supporters: ${post.title}`,
      created_by: ngoUserId,
    })
    .select("id")
    .single();

  if (convErr) throw convErr;

  const { error: memErr } = await supabase
    .from("conversation_members")
    .insert([
      { conversation_id: conv.id, user_id: ngoUserId, role: "admin" },
      { conversation_id: conv.id, user_id: applicantId, role: "member" },
    ]);

  if (memErr) throw memErr;

  // Save group_conversation_id back to the post for future approvals
  await supabase
    .from("ngo_posts")
    .update({ group_conversation_id: conv.id })
    .eq("id", post.id);

  return conv.id as string;
}

// ── Admin: list unverified NGOs ──

export async function listUnverifiedNgos() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, ngo_verified, created_at")
    .eq("user_type", "ngo")
    .eq("ngo_verified", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listAllNgos() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, ngo_verified, ngo_org_name, ngo_org_purpose, ngo_org_url, ngo_purpose, ngo_status, ngo_rep_name, ngo_rep_email, ngo_rep_phone, ngo_activity_countries, created_at")
    .eq("user_type", "ngo")
    .order("ngo_verified", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function verifyNgo(userId: string, verified: boolean) {
  const { error } = await supabase
    .from("profiles")
    .update({ ngo_verified: verified })
    .eq("id", userId);

  if (error) throw error;
}
