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
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Importing into deck: <span className="font-semibold text-slate-950">{result.deckName}</span>
        {!result.subject && (
          <span className="ml-2 text-xs text-slate-400">(no subject in file — using existing deck)</span>
        )}
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-semibold text-slate-950">{result.totalCards}</p>
          <p className="text-xs text-slate-500">Total cards</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-2xl font-semibold text-emerald-700">{result.toCreate}</p>
          <p className="text-xs text-emerald-600">New</p>
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-center">
          <p className="text-2xl font-semibold text-sky-700">{result.toUpdate}</p>
          <p className="text-xs text-sky-600">Update</p>
        </div>
      </div>

      {/* Hard errors — block import */}
      {result.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm font-semibold text-red-700">
            {result.errors.length} error{result.errors.length > 1 ? "s" : ""} — import blocked
          </p>
          <ul className="space-y-1">
            {result.errors.map((e, i) => (
              <li key={i} className="text-xs text-red-700">
                <span className="font-mono">{e.sourceId}</span> — {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings — allow import */}
      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-700">
            {result.warnings.length} warning{result.warnings.length > 1 ? "s" : ""}
          </p>
          <ul className="space-y-1">
            {result.warnings.slice(0, 5).map((w, i) => (
              <li key={i} className="text-xs text-amber-700">
                <span className="font-mono">{w.sourceId}</span> — {w.message}
              </li>
            ))}
            {result.warnings.length > 5 && (
              <li className="text-xs text-amber-500">
                …and {result.warnings.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Sample cards */}
      {result.sample.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">
            First {result.sample.length} cards
          </p>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {result.sample.map((card) => (
              <div key={card.sourceId} className="flex items-start gap-3 px-4 py-2.5">
                <span className="mt-0.5 font-mono text-xs text-slate-400 shrink-0">
                  {card.sourceId}
                </span>
                <span className="text-sm text-slate-700 flex-1">{card.question}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    card.isNew
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {card.isNew ? "new" : "update"}
                </span>
              </div>
            ))}
            {result.totalCards > result.sample.length && (
              <p className="px-4 py-2 text-xs text-slate-400">
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
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          onClick={onConfirm}
          disabled={hasErrors || loading}
          className="rounded-md bg-slate-950 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
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
