"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { countryName } from "@/lib/countries";
import { useT } from "@/app/components/LangProvider";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";

type NgoUser = {
  id: string;
  display_name: string | null;
  residence_country: string | null;
  languages: string[] | null;
};

export default function UsersPage() {
  const { t } = useT();
  const router = useRouter();
  const [users, setUsers] = useState<NgoUser[]>([]);
  const [country, setCountry] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const checkAdmin = useCallback(async () => {
    const { data: au } = await supabase.auth.getUser();
    const uid = au.user?.id ?? null;
    if (!uid) { router.replace("/"); return; }

    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .maybeSingle();

    if (prof?.role !== "admin") { router.replace("/"); return; }
    setAuthorized(true);
  }, [router]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  const load = useCallback(async () => {
    let q = supabase
      .from("profiles")
      .select("id, display_name, residence_country, languages")
      .eq("user_type", "ngo");

    if (country) q = q.eq("residence_country", country);

    const { data } = await q.order("display_name").limit(100);
    setUsers((data as NgoUser[]) ?? []);
  }, [country]);

  useEffect(() => {
    if (authorized) load();
  }, [authorized, load]);

  if (!authorized) return null;

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pt-4 pb-24">
        <div className="b-card mb-4 p-5">
          <h1 className="text-xl font-bold">{t("users.title")}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {t("pageInfo.partners.desc")}
          </p>
        </div>

        <div className="mb-4">
          <input
            placeholder={t("users.countryCodePlaceholder")}
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-soft)",
              color: "var(--deep-navy)",
            }}
          />
        </div>

        <div className="grid gap-3">
          {users.length === 0 ? (
            <div className="b-empty-state">
              <Building2 className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
              <div className="mt-2 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                {t("notif.noNotifications")}
              </div>
            </div>
          ) : (
            users.map((u) => (
              <Link
                key={u.id}
                href={`/u/${u.id}`}
                className="b-card flex items-center gap-4 p-4 no-underline text-inherit"
              >
                <div
                  className="h-12 w-12 flex-shrink-0 rounded-full grid place-items-center text-lg font-bold"
                  style={{ background: "var(--light-blue)", color: "var(--primary)" }}
                >
                  {(u.display_name?.[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold">{u.display_name}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {countryName(u.residence_country, "ko")}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
