"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getUser } from "@/lib/auth";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm transition ${
        pathname.startsWith(href)
          ? "bg-accent/20 text-white"
          : "text-muted hover:bg-panel hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-slate-800 bg-panel/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold text-white">
            Knowledge Assistant
          </Link>
          <nav className="flex gap-1">
            {link("/dashboard", "Documents")}
            {link("/chat", "Chat")}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted">
          {user?.email && <span>{user.email}</span>}
          <button
            type="button"
            onClick={() => {
              clearAuth();
              router.push("/login");
            }}
            className="rounded-lg border border-slate-700 px-3 py-1.5 hover:border-slate-500 hover:text-white"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
