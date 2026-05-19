import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { hasRole } from "@/lib/auth/permissions";
import { getDecksForUser } from "@/lib/export/queries";
import HamburgerMenu from "@/features/nav/HamburgerMenu";

export const metadata: Metadata = {
  title: "Export — PPL Flashcards",
};

export default async function ExportPage() {
  const session = await readSessionCookie();
  if (!session) redirect("/login");
  if (!hasRole(session.role, "EDITOR")) redirect("/");

  const decks = await getDecksForUser(session.userId);
  const isAdmin = hasRole(session.role, "ADMIN");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <h1 className="text-lg font-semibold">Export &amp; Backup</h1>
        <HamburgerMenu role={session.role} email={session.email} />
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">

        {/* ── Deck exports ── */}
        <section>
          <h2 className="mb-1 text-base font-semibold text-slate-200">Decks</h2>
          <p className="mb-4 text-sm text-slate-400">
            Download all cards in a deck, or only the cards that are new or
            changed since the last import (diff). The JSON format is
            round-trip compatible with the importer.
          </p>

          {decks.length === 0 ? (
            <p className="text-sm text-slate-500">No decks found.</p>
          ) : (
            <div className="space-y-3">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-4"
                >
                  <div className="mb-3 flex items-baseline gap-2">
                    <span className="font-medium text-slate-100">{deck.name}</span>
                    <span className="text-xs text-slate-500">
                      {deck._count.cards} card{deck._count.cards !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/api/export/deck/${deck.id}/json`}
                      className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                      JSON (all)
                    </a>
                    <a
                      href={`/api/export/deck/${deck.id}/csv`}
                      className="rounded bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-500"
                    >
                      CSV (all)
                    </a>
                    <a
                      href={`/api/export/deck/${deck.id}/diff`}
                      className="rounded border border-amber-500 px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-500/10"
                    >
                      JSON (diff only)
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Admin section ── */}
        {isAdmin && (
          <section>
            <h2 className="mb-1 text-base font-semibold text-slate-200">Admin</h2>
            <p className="mb-4 text-sm text-slate-400">
              Export data that requires admin access.
            </p>

            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <div className="mb-3">
                <span className="font-medium text-slate-100">Users</span>
                <p className="mt-0.5 text-xs text-slate-400">
                  All user accounts (id, email, display name, role, created date).
                  Does not include passwords or session data.
                </p>
              </div>
              <a
                href="/api/export/users"
                className="rounded bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-500"
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
