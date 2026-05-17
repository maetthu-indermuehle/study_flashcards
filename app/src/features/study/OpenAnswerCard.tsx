"use client";

import CardFeedback from "./CardFeedback";
import QuestionText from "./QuestionText";
import type { OpenAnswerCard as OpenAnswerCardType } from "@/lib/study/types";

type Phase = { name: "idle" } | { name: "revealed" };

type Props = {
  card: OpenAnswerCardType;
  phase: Phase;
  onReveal: () => void;
  onNext: () => void;
  cardId: string;
};

/**
 * Renders an open-answer card.
 *
 * In the `idle` phase: shows the question and a Reveal button.
 * In the `revealed` phase: shows the answer text and CardFeedback below.
 */
export default function OpenAnswerCard({
  card,
  phase,
  onReveal,
  onNext,
  cardId,
}: Props) {
  return (
    <div>
      {/* Question */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-sky-700">
          Open answer
        </p>
        <QuestionText text={card.question} />
      </div>

      {phase.name === "idle" ? (
        <button
          onClick={onReveal}
          className="mt-4 w-full rounded-lg border border-slate-300 bg-white py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98]"
        >
          Reveal answer
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Answer */}
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Answer
            </p>
            <p className="text-sm leading-relaxed text-slate-800">{card.answer}</p>
          </div>

          <CardFeedback
            cardId={cardId}
            explanation={card.explanation}
            reference={card.reference}
            onNext={onNext}
          />
        </div>
      )}
    </div>
  );
}
