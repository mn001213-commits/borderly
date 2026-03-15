"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { countryName } from "@/lib/countries";
import { useT } from "@/app/components/LangProvider";

type User = {
  id: string;
  display_name: string | null;
  country_code: string | null;
  languages: string[] | null;
  social_status: string | null;
};

export default function UsersPage() {
  const { t } = useT();
  const [users, setUsers] = useState<User[]>([]);
  const [country, setCountry] = useState("");
  const [social, setSocial] = useState("");

  useEffect(() => {
    load();
  }, [country, social]);

  const load = async () => {
    let q = supabase
      .from("profiles")
      .select("id, display_name, country_code, languages, social_status");

    if (country) q = q.eq("country_code", country);
    if (social) q = q.eq("social_status", social);

    const { data } = await q.limit(50);
    setUsers((data as User[]) ?? []);
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <h1 className="text-xl font-bold">{t("users.title")}</h1>

        <div className="mt-4 flex gap-3">
          <input
            placeholder={t("users.countryCodePlaceholder")}
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-gray-400"
          />

          <select
            value={social}
            onChange={(e) => setSocial(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-gray-400"
          >
            <option value="">{t("common.all")}</option>
            <option value="worker">{t("users.employee")}</option>
            <option value="job_seeker">{t("users.jobSeeker")}</option>
            <option value="student">{t("users.student")}</option>
            <option value="homemaker">{t("users.homemaker")}</option>
            <option value="freelancer">{t("users.freelancer")}</option>
          </select>
        </div>

        <div className="mt-5 grid gap-3">
          {users.map((u) => (
            <Link
              key={u.id}
              href={`/u/${u.id}`}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm no-underline text-inherit flex items-center gap-4"
            >
              <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gray-200 grid place-items-center text-lg font-bold">
                {(u.display_name?.[0] ?? "?").toUpperCase()}
              </div>
              <div>
                <div className="font-bold">{u.display_name}</div>
                <div className="text-sm text-gray-500">
                  {countryName(u.country_code, "ko")} · {u.social_status}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
