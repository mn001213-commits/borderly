import { supabase } from "@/lib/supabaseClient";

export type ReportTargetType = "post" | "comment";

export async function createReport({
  targetType,
  targetId,
  reason,
  detail = "",
}: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  detail?: string;
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Login required.");

  const trimmedReason = reason.trim();
  const trimmedDetail = detail.trim();

  if (!trimmedReason) {
    throw new Error("Please enter a reason.");
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    reason: trimmedReason,
    detail: trimmedDetail || null,
  });

  if (error) {
    if ((error as any)?.code === "23505") {
      throw new Error("You already reported this.");
    }
    throw error;
  }
}