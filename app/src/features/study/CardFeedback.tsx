"use client";

import { useState } from "react";
import type { StudyCardReference } from "@/lib/study/types";

type Rating = "WRONG" | "HARD" | "GOOD" | "EASY";

type Props = {
  cardId: string;
  explanation: string | null;
  reference: StudyCardReference | null;
  onNext: () => void;
};

const RATING_BUTTONS: { rating: Rating; label: string; className: string }[] = [
  {
    rating: "WRONG",
    label: "Wrong",
    className:
      "border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/35 active:scale-[0.97]",
  },
  {
    rating: "HARD",
    label: "Hard",
    className:
      "border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/35 active:scale-[0.97]",
  },
  {
    rating: "GOOD",
    label: "Good",
    className:
      "border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/35 active:scale-[0.97]",
  },
  {
    rating: "EASY",
    label: "Easy",
    className:
      "border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/35 active:scale-[0.97]",
  },
];

export default function CardFeedback({ cardId, explanation, reference, onNext }: Props) {
  const [submitting, setSubmitting] = useState(false);

  function handleRate(rating: Rating) {
    if (submitting) return;
    setSubmitting(true);
    // Fire the review in the background so onNext() / router.refresh()
    // can start fetching the next card immediately rather than waiting
    // for the DB write to complete first.
    fetch("/api/study/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, rating }),
    }).catch(() => {});
    onNext();
  }

  return (
    <div className="mt-5 space-y-4">
      {explanation && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Explanation
          </p>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{explanation}</p>
        </div>
      )}

      {reference && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Source:{" "}
          {reference.url ? (
            <a href={reference.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600 dark:hover:text-slate-300">
              {reference.label}
            </a>
          ) : (
            <span className="italic">{reference.label}</span>
          )}
        </p>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          How did it go?
        </p>
        <div className="grid grid-cols-4 gap-2">
          {RATING_BUTTONS.map(({ rating, label, className }) => (
            <button
              key={rating}
              onClick={() => handleRate(rating)}
              disabled={submitting}
              className={`rounded-lg py-3.5 text-sm font-semibold transition disabled:opacity-50 ${className}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
