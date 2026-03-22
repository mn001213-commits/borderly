import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[var(--bg-snow)] text-[var(--deep-navy)]">
      <h2 className="text-xl font-bold">Page not found</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-[#1a1a2e] text-white rounded-xl"
      >
        Go home
      </Link>
    </div>
  );
}
