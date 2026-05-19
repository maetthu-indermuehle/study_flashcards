"use client";

/**
 * ImportPreview — step 2 of the import wizard.
 *
 * Displays the dry-run result: card counts, any validation errors/warnings,
 * and a sample of the first 10 cards. If there are hard errors the confirm
 * button is disabled. Warnings still allow import to proceed.
 */

import type { DryRunResult } from "@/lib/import/actions";

type Props = {
  result: Extract<DryRunResult, { ok: true }>;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
};

export default function ImportPreview({ result, onConfirm, onBack, loading }: Props) {
  const hasErrors = result.errors.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Deck target */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
        Importing into deck: <span className="font-semibold text-slate-950 dark:text-slate-100">{result.deckName}</span>
        {!result.subject && (
          <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">(no subject in file — using existing deck)</span>
        )}
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-center">
          <p className="text-2xl font-semibold text-slate-950 dark:text-slate-100">{result.totalCards}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total cards</p>
        </div>
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
          <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{result.toCreate}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500">New</p>
        </div>
        <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 p-4 text-center">
          <p className="text-2xl font-semibold text-sky-700 dark:text-sky-400">{result.toUpdate}</p>
          <p className="text-xs text-sky-600 dark:text-sky-500">Update</p>
        </div>
      </div>

      {/* Hard errors — block import */}
      {result.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
            {result.errors.length} error{result.errors.length > 1 ? "s" : ""} — import blocked
          </p>
          <ul className="space-y-1">
            {result.errors.map((e, i) => (
              <li key={i} className="text-xs text-red-700 dark:text-red-400">
                <span className="font-mono">{e.sourceId}</span> — {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings — allow import */}
      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            {result.warnings.length} warning{result.warnings.length > 1 ? "s" : ""}
          </p>
          <ul className="space-y-1">
            {result.warnings.slice(0, 5).map((w, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-mono">{w.sourceId}</span> — {w.message}
              </li>
            ))}
            {result.warnings.length > 5 && (
              <li className="text-xs text-amber-500 dark:text-amber-500">
                …and {result.warnings.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Sample cards */}
      {result.sample.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            First {result.sample.length} cards
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {result.sample.map((card) => (
              <div key={card.sourceId} className="flex items-start gap-3 px-4 py-2.5">
                <span className="mt-0.5 font-mono text-xs text-slate-400 dark:text-slate-500 shrink-0">
                  {card.sourceId}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{card.question}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    card.isNew
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
                  }`}
                >
                  {card.isNew ? "new" : "update"}
                </span>
              </div>
            ))}
            {result.totalCards > result.sample.length && (
              <p className="px-4 py-2 text-xs text-slate-400 dark:text-slate-500">
                …and {result.totalCards - result.sample.length} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          onClick={onConfirm}
          disabled={hasErrors || loading}
          className="rounded-md bg-slate-950 dark:bg-slate-100 px-5 py-2 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-40"
        >
          {loading
            ? "Importing…"
            : hasErrors
              ? "Fix errors to import"
              : `Import ${result.totalCards} card${result.totalCards === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
