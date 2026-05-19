"use client";

/**
 * HamburgerMenu — right-side slide-in drawer for app navigation.
 *
 * Opens with a ☰ button; closes via the ✕ button or the dark overlay.
 * Role-based sections are passed as props from the parent Server Component
 * so no DB query is needed here.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/lib/session/types";
import { useTheme } from "@/components/ThemeProvider";

type Props = {
  role: UserRole;
  email: string;
};

export default function HamburgerMenu({ role, email }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { dark, toggle: toggleTheme } = useTheme();

  const close = () => setOpen(false);
  const isEditor = role === "EDITOR" || role === "ADMIN";
  const isAdmin = role === "ADMIN";

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition"
      >
        <BarsIcon />
      </button>

      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-white dark:bg-slate-800 shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 px-4 py-3.5">
          <span className="truncate text-sm text-slate-500 dark:text-slate-400">{email}</span>
          <button
            onClick={close}
            aria-label="Close menu"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition"
          >
            <XIcon />
          </button>
        </div>

        {/* Nav body */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-3">

          {/* Study */}
          <NavLink href="/study/setup" onClick={close}>Study setup</NavLink>

          {/* Content management — EDITOR+ */}
          {isEditor && (
            <>
              <Divider />
              <SectionLabel>Content</SectionLabel>
              <NavLink href="/cards" onClick={close}>Browse cards</NavLink>
              <NavLink href="/import" onClick={close}>Import cards</NavLink>
              <NavLink href="/export" onClick={close}>Export &amp; backup</NavLink>
            </>
          )}

          {/* Admin — ADMIN only */}
          {isAdmin && (
            <>
              <Divider />
              <SectionLabel>Administration</SectionLabel>
              <NavLink href="/admin/users" onClick={close}>
                <span className="flex-1">Users</span>
                <span className="rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400">
                  admin
                </span>
              </NavLink>
            </>
          )}

          {/* Account — pinned to the bottom */}
          <div className="mt-auto">
            <Divider />

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
              {dark ? "Light mode" : "Dark mode"}
            </button>

            <NavLink href="/profile" onClick={close}>Profile</NavLink>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
            >
              Sign out
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
    >
      {children}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="my-2 border-t border-slate-100 dark:border-slate-700" />;
}

function BarsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <line x1="3" y1="5" x2="17" y2="5" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="15" x2="17" y2="15" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="4" x2="14" y2="14" />
      <line x1="14" y1="4" x2="4" y2="14" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
