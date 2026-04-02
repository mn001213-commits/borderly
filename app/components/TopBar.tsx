"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import NotificationBell from "./NotificationBell";
import { User } from "lucide-react";
import { useT } from "./LangProvider";

const HIDE_LOGIN_PATHS = ["/login", "/signup", "/reset-password", "/update-password"];

export default function TopBar() {
  const { t } = useT();
  const { user } = useAuth();
  const pathname = usePathname();
  const hideLoginBtn = HIDE_LOGIN_PATHS.some((p) => pathname.startsWith(p));

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 backdrop-blur-lg"
      style={{
        background: "color-mix(in srgb, var(--bg-card) 98%, transparent)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <div className={`mx-auto flex h-14 items-center justify-between gap-4 px-4 sm:px-6 ${user ? "xl:mr-[340px]" : ""}`}>
        <Link href="/" className="flex items-center gap-2.5 no-underline shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/borderly-logo.png" alt="Borderly" className="h-8 w-8 rounded-xl object-cover" />
          <div className="b-logo-gradient text-[16px] font-extrabold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            borderly
          </div>
        </Link>

        <div className="flex items-center gap-1.5 shrink-0">
          {user ? (
            <>
              <NotificationBell className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl transition text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]" />

              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition no-underline text-inherit hover:bg-[var(--bg-elevated)]"
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
                    style={{ background: "var(--primary-light)", border: "2px solid var(--border-soft)" }}
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
          ) : !hideLoginBtn ? (
            <Link
              href="/login"
              className="b-btn-primary h-9 rounded-xl px-5 text-sm no-underline"
            >
              {t("common.login")}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
