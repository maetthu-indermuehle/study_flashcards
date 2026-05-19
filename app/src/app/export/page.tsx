import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { hasRole } from "@/lib/auth/permissions";
import { listSubjectGroups } from "@/lib/study/preset-queries";
import ExportDeckCard from "@/features/export/ExportDeckCard";
import HamburgerMenu from "@/features/nav/HamburgerMenu";

export const metadata: Metadata = {
  title: "Export — PPL Flashcards",
};

export default async function ExportPage() {
  const session = await readSessionCookie();
  if (!session) redirect("/login");
  if (!hasRole(session.role, "EDITOR")) redirect("/");

  const subjectGroups = await listSubjectGroups(session.userId);
  const isAdmin = hasRole(session.role, "ADMIN");

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-slate-900 text-slate-950 dark:text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <h1 className="text-lg font-semibold">Export &amp; Backup</h1>
        <HamburgerMenu role={session.role} email={session.email} />
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">

        {/* ── Deck exports ── */}
        <section>
          <h2 className="mb-1 text-base font-semibold text-slate-800 dark:text-slate-200">Decks</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Select topics to export a subset, or leave everything unchecked to
            export the whole deck. <strong className="text-slate-700 dark:text-slate-300">Diff</strong> exports
            only new and changed cards — drop the file into{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-700 px-1 text-xs">data/questions/</code>{" "}
            to update the seed for the next deployment.
          </p>

          {subjectGroups.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No decks found.</p>
          ) : (
            <div className="space-y-4">
              {subjectGroups.map((subject) => (
                <ExportDeckCard key={subject.deckId} subject={subject} />
              ))}
            </div>
          )}
        </section>

        {/* ── Admin section ── */}
        {isAdmin && (
          <section>
            <h2 className="mb-1 text-base font-semibold text-slate-800 dark:text-slate-200">Admin</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Export data that requires admin access.
            </p>

            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="mb-3">
                <span className="font-medium text-slate-800 dark:text-slate-100">Users</span>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  All user accounts (id, email, display name, role, created date).
                  Does not include passwords or session data.
                </p>
              </div>
              <a
                href="/api/export/users"
                className="rounded bg-slate-700 dark:bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600 dark:hover:bg-slate-500"
              >
                JSON
              </a>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
