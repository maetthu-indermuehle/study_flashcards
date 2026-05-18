import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/permissions";
import { getImportHistory } from "@/lib/import/actions";
import ImportWizard from "@/features/import/ImportWizard";

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
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Imported
        </span>
      );
    case "FAILED":
      return (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          Failed
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {status}
        </span>
      );
  }
}

export default async function ImportPage() {
  // Authoritative auth check — EDITOR role required.
  await requireRole("EDITOR");

  const history = await getImportHistory();

  return (
    <main className="min-h-dvh bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-8 flex items-center gap-4 border-b border-slate-200 pb-4">
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Home
          </Link>
          <h1 className="text-xl font-semibold text-slate-950">Import cards</h1>
        </header>

        <ImportWizard />

        {/* Import history */}
        {history.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Recent imports
            </h2>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {history.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-slate-400">
                      {batch.id}
                    </p>
                    {batch.summary && (
                      <p className="mt-0.5 text-sm text-slate-600">
                        {batch.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {statusBadge(batch.status)}
                    <span className="text-xs text-slate-400">
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
