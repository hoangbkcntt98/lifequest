"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function AppHeader({ title, subtitle }: AppHeaderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await apiFetch("/api/auth/logout", {
        method: "POST",
      });

      router.push("/login");
    } catch {
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="relative mb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
          {subtitle && (
            <p className="text-slate-400 text-sm md:text-base mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Desktop menu */}
        <nav className="hidden md:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-700 px-4 py-2 hover:bg-slate-800"
          >
            Dashboard
          </Link>

          <Link
            href="/missions"
            className="rounded-xl bg-indigo-500 px-4 py-2 font-medium hover:bg-indigo-400"
          >
            Missions
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-xl border border-red-500/30 px-4 py-2 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            {loggingOut ? "..." : "Logout"}
          </button>
        </nav>

        {/* Mobile burger button */}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="md:hidden rounded-xl border border-slate-700 px-3 py-2 text-xl hover:bg-slate-800"
          aria-label="Open menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-52 rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-xl md:hidden">
          <div className="flex flex-col gap-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 hover:bg-slate-800"
            >
              Dashboard
            </Link>

            <Link
              href="/missions"
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3 hover:bg-slate-800"
            >
              Missions
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-left rounded-xl px-4 py-3 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}