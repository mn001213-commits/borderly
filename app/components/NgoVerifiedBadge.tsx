"use client";

import { ShieldCheck } from "lucide-react";

export default function NgoVerifiedBadge({
  verified,
  size = 14,
}: {
  verified?: boolean | null;
  size?: number;
}) {
  if (!verified) return null;

  return (
    <span title="Verified Partner" className="inline-flex items-center">
      <ShieldCheck
        className="shrink-0"
        style={{ width: size, height: size, color: "#43A047" }}
      />
    </span>
  );
}
