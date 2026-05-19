import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { hasRole } from "@/lib/auth/permissions";
import HamburgerMenu from "@/features/nav/HamburgerMenu";

export const metadata: Metadata = {
  title: "Admin — PPL Flashcards",
};

/**
 * Layout for all /admin/* routes.
 *
 * Does an authoritative session read (Server Component) and redirects
 * non-admins rather than relying solely on the optimistic proxy check.
 * The proxy is the first gate; this is the second.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSessionCookie();
  if (!session || !hasRole(session.role, "ADMIN")) {
    redirect("/");
  }

  return (
    <div className="min-h-dvh bg-stone-50 dark:bg-slate-900 text-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <nav className="flex items-center gap-3">
            <Link
              href="/admin/users"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100"
            >
              Users
            </Link>
          </nav>
          <HamburgerMenu role={session.role} email={session.email} />
        </header>
        {children}
      </div>
    </div>
  );
}
