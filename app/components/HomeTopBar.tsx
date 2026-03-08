"use client";

import Link from "next/link";
import NotificationBell from "@/app/components/NotificationBell";

type HomeTopBarProps = {
  homeHref?: string;
  createHref?: string;
  profileHref?: string;
  createLabel?: string;
};

export default function HomeTopBar({
  homeHref = "/",
  createHref = "/create",
  profileHref = "/profile",
  createLabel = "New Post",
}: HomeTopBarProps) {
  return (
    <header className="sticky top-3 z-20 flex items-center justify-between gap-3 rounded-3xl border border-slate-200/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
      <Link
        href={homeHref}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-4 py-2 text-sm font-extrabold text-slate-800 shadow-sm transition hover:bg-slate-50"
      >
        Home
      </Link>

      <div className="flex items-center gap-2">
        <NotificationBell />

        <Link
          href={createHref}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:shadow-md"
        >
          {createLabel}
        </Link>

        <Link
          href={profileHref}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/70 bg-white shadow-sm transition hover:bg-slate-50"
          aria-label="Profile"
          title="Profile"
        >
          <span className="text-sm font-semibold">P</span>
        </Link>
      </div>
    </header>
  );
}