import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import UserProfileClient from "./UserProfileClient";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = { params: Promise<{ userId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return { title: "User not found | Borderly" };
  }

  const name = profile.display_name ?? "User";
  const description = profile.bio?.slice(0, 160) ?? `${name}'s profile on Borderly`;

  return {
    title: `${name} | Borderly`,
    description,
    openGraph: {
      title: `${name} | Borderly`,
      description,
      ...(profile.avatar_url ? { images: [profile.avatar_url] } : {}),
    },
  };
}

export default function UserPage() {
  return <UserProfileClient />;
}
