"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import NotificationBell from "./NotificationBell";
import { User } from "lucide-react";
import { useT } from "./LangProvider";

export default function TopBar() {
  const { t } = useT();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md" style={{ borderBottom: "1px solid var(--border-soft)" }}>
      <div className="mx-auto flex h-[60px] items-center justify-between gap-4 px-4 sm:px-6 xl:mr-[340px]">
        <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/penguin.png" alt="Borderly" className="h-8 w-8 rounded-xl object-cover" />
          <div className="text-[16px] font-bold tracking-tight" style={{ color: "var(--deep-navy)" }}>
            BORDERLY
          </div>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <NotificationBell className="relative inline-flex h-10 w-10 items-center justify-center rounded-full transition text-[var(--text-secondary)]" />

              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-2xl px-2.5 py-1.5 transition no-underline text-inherit"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--light-blue)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt="Me"
                    className="h-8 w-8 rounded-full object-cover"
                    style={{ border: "2px solid var(--border-soft)" }}
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ background: "var(--light-blue)", border: "2px solid var(--border-soft)" }}
                  >
                    <User className="h-4 w-4" style={{ color: "var(--primary)" }} />
                  </div>
                )}
                <span
                  className="hidden lg:block max-w-[100px] truncate text-[13px] font-semibold"
                  style={{ color: "var(--deep-navy)" }}
                >
                  {user.displayName ?? t("common.account")}
                </span>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-2xl px-5 text-sm font-semibold text-white no-underline transition hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              {t("common.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
