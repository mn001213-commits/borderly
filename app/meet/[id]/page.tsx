import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import MeetPageClient from "./MeetPageClient";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data: meet } = await supabase
    .from("meets")
    .select("title, description, image_url")
    .eq("id", id)
    .maybeSingle();

  if (!meet) {
    return { title: "Meet not found | Borderly" };
  }

  const description = meet.description?.slice(0, 160) ?? "";

  return {
    title: `${meet.title} | Borderly`,
    description,
    openGraph: {
      title: meet.title,
      description,
      ...(meet.image_url ? { images: [meet.image_url] } : {}),
    },
  };
}

export default function MeetPage() {
  return <MeetPageClient />;
}
