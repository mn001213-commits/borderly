"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DmPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/chats");
  }, [router]);

  return <div style={{ padding: 16 }}>이동중…</div>;
}