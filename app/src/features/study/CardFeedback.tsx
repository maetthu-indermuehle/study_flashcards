"use client";

import type { StudyCardReference } from "@/lib/study/types";

type Props = {
  explanation: string | null;
  reference: StudyCardReference | null;
  onNext: () => void;
};

/**
 * Shown after a card is answered or revealed.
 * Displays the explanation, an optional source reference, and a Next button.
 * Shared between MultipleChoiceCard and OpenAnswerCard.
 */
export default function CardFeedback({ explanation, reference, onNext }: Props) {
  return (
    <div className="mt-5 space-y-4">
      {explanation && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Explanation
          </p>
          <p className="text-sm leading-relaxed text-slate-700">{explanation}</p>
        </div>
      )}

      {reference && (
        <p className="text-xs text-slate-400">
          Source:{" "}
          {reference.url ? (
            <a
              href={reference.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-600"
            >
              {reference.label}
            </a>
          ) : (
            <span className="italic">{reference.label}</span>
          )}
        </p>
      )}

      <button
        onClick={onNext}
        className="w-full rounded-lg bg-slate-950 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
      >
        Next card →
      </button>
    </div>
  );
}
