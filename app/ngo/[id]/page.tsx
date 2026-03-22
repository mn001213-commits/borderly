import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import NgoPageClient from "./NgoPageClient";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data: post } = await supabase
    .from("ngo_posts")
    .select("title, description, image_url")
    .eq("id", id)
    .maybeSingle();

  if (!post) {
    return { title: "Supporter post not found | Borderly" };
  }

  const description = post.description?.slice(0, 160) ?? "";

  return {
    title: `${post.title} | Borderly`,
    description,
    openGraph: {
      title: post.title,
      description,
      ...(post.image_url ? { images: [post.image_url] } : {}),
    },
  };
}

export default function NgoDetailPage() {
  return <NgoPageClient />;
}
