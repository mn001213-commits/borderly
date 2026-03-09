"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DmRedirectPage() {
  const router = useRouter();
  const params = useParams<{ chatId: string }>();
  const chatId = params?.chatId;

  useEffect(() => {
    if (!chatId) return;
    router.replace(`/chats/${chatId}`);
  }, [chatId, router]);

  return <div style={{ padding: 16 }}>Redirecting...</div>;
}