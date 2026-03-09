"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyNotificationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/notifications");
  }, [router]);

  return null;
}
