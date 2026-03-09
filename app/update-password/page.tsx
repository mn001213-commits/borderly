"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, KeyRound, CheckCircle } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase will auto-detect the recovery token from the URL hash
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if user is already authenticated (token already processed)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/"), 2000);
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F0F7FF] flex items-center justify-center">
        <div className="text-sm text-gray-500">Verifying reset link...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-8">
        <Link
          href="/login"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </Link>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <KeyRound className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Set New Password</h1>
              <p className="text-xs text-gray-500">Choose a strong password</p>
            </div>
          </div>

          {done ? (
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
              <div className="text-base font-semibold text-gray-900">Password updated!</div>
              <p className="mt-2 text-sm text-gray-500">Redirecting you to the home page...</p>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">New Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  type="password"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200 bg-[#F0F7FF] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400 disabled:opacity-70"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirm Password</label>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  type="password"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200 bg-[#F0F7FF] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400 disabled:opacity-70"
                />
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
