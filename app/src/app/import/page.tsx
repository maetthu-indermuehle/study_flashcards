import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { hasRole } from "@/lib/auth/permissions";
import { getImportHistory } from "@/lib/import/actions";
import ImportWizard from "@/features/import/ImportWizard";
import HamburgerMenu from "@/features/nav/HamburgerMenu";

export const metadata: Metadata = {
  title: "Import cards — PPL Flashcards",
};

/**
 * Formats an ImportBatch status string for display.
 */
function statusBadge(status: string) {
  switch (status) {
    case "IMPORTED":
      return (
        <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Imported
        </span>
      );
    case "FAILED":
      return (
        <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
          Failed
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          {status}
        </span>
      );
  }
}

export default async function ImportPage() {
  const session = await readSessionCookie();
  if (!session || !hasRole(session.role, "EDITOR")) redirect("/login");

  const history = await getImportHistory();

  return (
    <main className="min-h-dvh bg-stone-50 dark:bg-slate-900 text-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-8 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <h1 className="text-xl font-semibold text-slate-950 dark:text-slate-100">Import cards</h1>
          <HamburgerMenu role={session.role} email={session.email} />
        </header>

        <ImportWizard />

        {/* Import history */}
        {history.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Recent imports
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              {history.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-slate-400 dark:text-slate-500">
                      {batch.id}
                    </p>
                    {batch.summary && (
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                        {batch.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {statusBadge(batch.status)}
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
