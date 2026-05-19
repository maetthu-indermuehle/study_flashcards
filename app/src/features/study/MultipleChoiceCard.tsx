"use client";

import CardFeedback from "./CardFeedback";
import QuestionText from "./QuestionText";
import type { MultipleChoiceCard as MultipleChoiceCardType } from "@/lib/study/types";

type Phase =
  | { name: "idle" }
  | { name: "answered"; selectedId: string; isCorrect: boolean };

type Props = {
  card: MultipleChoiceCardType;
  phase: Phase;
  onAnswer: (choiceId: string, isCorrect: boolean) => void;
  onNext: () => void;
  cardId: string;
};

export default function MultipleChoiceCard({ card, phase, onAnswer, onNext, cardId }: Props) {
  return (
    <div>
      {/* Question */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-400">
          Multiple choice
        </p>
        <QuestionText text={card.question} />
      </div>

      {/* Choices */}
      <div className="mt-4 space-y-3">
        {card.choices.map((choice) => {
          const isAnswered = phase.name === "answered";
          const isSelected = isAnswered && phase.selectedId === choice.id;
          const isCorrect = choice.isCorrect;

          let className =
            "flex min-h-[3rem] w-full items-center rounded-lg border px-4 py-3 text-left text-sm font-medium transition";

          if (!isAnswered) {
            className +=
              " border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-sky-400 hover:bg-sky-50 dark:hover:border-sky-500 dark:hover:bg-sky-900/20 active:scale-[0.98]";
          } else if (isCorrect) {
            className +=
              " border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/25 text-emerald-800 dark:text-emerald-300";
          } else if (isSelected) {
            className += " border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/25 text-red-700 dark:text-red-300";
          } else {
            className += " border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-600";
          }

          return (
            <button
              key={choice.id}
              disabled={isAnswered}
              onClick={() => onAnswer(choice.id, choice.isCorrect)}
              className={className}
            >
              {isAnswered && isCorrect && <span className="mr-2 text-emerald-600 dark:text-emerald-400">✓</span>}
              {isAnswered && isSelected && !isCorrect && <span className="mr-2 text-red-500 dark:text-red-400">✗</span>}
              {choice.text}
            </button>
          );
        })}
      </div>

      {phase.name === "answered" && (
        <CardFeedback cardId={cardId} explanation={card.explanation} reference={card.reference} onNext={onNext} />
      )}
    </div>
  );
}
