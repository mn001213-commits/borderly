"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[var(--bg-snow)] text-[var(--deep-navy)]">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        An unexpected error occurred.
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-[#1a1a2e] text-white rounded-xl"
      >
        Try again
      </button>
    </div>
  );
}
