import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { hasRole } from "@/lib/auth/permissions";

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
    <div className="min-h-dvh bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              ← Home
            </Link>
            <nav className="flex items-center gap-3">
              <Link
                href="/admin/users"
                className="text-sm font-medium text-slate-700 hover:text-slate-950"
              >
                Users
              </Link>
            </nav>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Admin
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}
