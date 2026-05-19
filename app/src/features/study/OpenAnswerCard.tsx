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

export default function OpenAnswerCard({ card, phase, onReveal, onNext, cardId }: Props) {
  return (
    <div>
      {/* Question */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
          Open answer
        </p>
        <QuestionText text={card.question} />
      </div>

      {phase.name === "idle" ? (
        <button
          onClick={onReveal}
          className="mt-4 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98]"
        >
          Reveal answer
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/25 p-5">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Answer
            </p>
            <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">{card.answer}</p>
          </div>
          <CardFeedback cardId={cardId} explanation={card.explanation} reference={card.reference} onNext={onNext} />
        </div>
      )}
    </div>
  );
}
