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
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:scale-[0.97]",
  },
  {
    rating: "HARD",
    label: "Hard",
    className:
      "border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 active:scale-[0.97]",
  },
  {
    rating: "GOOD",
    label: "Good",
    className:
      "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-[0.97]",
  },
  {
    rating: "EASY",
    label: "Easy",
    className:
      "border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 active:scale-[0.97]",
  },
];

/**
 * Shown after a card is answered or revealed.
 * Displays explanation, an optional source reference, and four rating buttons
 * (WRONG / HARD / GOOD / EASY). Clicking a button POSTs the review, then
 * calls onNext() to load the next card.
 */
export default function CardFeedback({ cardId, explanation, reference, onNext }: Props) {
  const [submitting, setSubmitting] = useState(false);

  async function handleRate(rating: Rating) {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/study/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, rating }),
      });
    } finally {
      // Navigate even if the request failed — don't block the study flow.
      onNext();
    }
  }

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

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
