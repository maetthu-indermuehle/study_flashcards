"use client";

import CardFeedback from "./CardFeedback";
import type { MultipleChoiceCard as MultipleChoiceCardType } from "@/lib/study/types";

type Phase =
  | { name: "idle" }
  | { name: "answered"; selectedId: string; isCorrect: boolean };

type Props = {
  card: MultipleChoiceCardType;
  phase: Phase;
  onAnswer: (choiceId: string, isCorrect: boolean) => void;
  onNext: () => void;
};

/**
 * Renders a multiple-choice card.
 *
 * In the `idle` phase: shows the question and four tappable choice buttons.
 * In the `answered` phase: marks the correct choice green and any incorrect
 * selection red; all buttons are disabled. CardFeedback is rendered below.
 */
export default function MultipleChoiceCard({
  card,
  phase,
  onAnswer,
  onNext,
}: Props) {
  return (
    <div>
      {/* Question */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-sky-700">
          Multiple choice
        </p>
        <p className="text-lg font-medium leading-snug text-slate-950">
          {card.question}
        </p>
      </div>

      {/* Choices */}
      <div className="mt-4 space-y-3">
        {card.choices.map((choice) => {
          const isAnswered = phase.name === "answered";
          const isSelected =
            isAnswered && phase.selectedId === choice.id;
          const isCorrect = choice.isCorrect;

          let className =
            "flex min-h-[3rem] w-full items-center rounded-lg border px-4 py-3 text-left text-sm font-medium transition";

          if (!isAnswered) {
            className +=
              " border-slate-200 bg-white text-slate-800 hover:border-sky-400 hover:bg-sky-50 active:scale-[0.98]";
          } else if (isCorrect) {
            className +=
              " border-emerald-400 bg-emerald-50 text-emerald-800";
          } else if (isSelected) {
            className += " border-red-400 bg-red-50 text-red-700";
          } else {
            className += " border-slate-200 bg-white text-slate-400";
          }

          return (
            <button
              key={choice.id}
              disabled={isAnswered}
              onClick={() => onAnswer(choice.id, choice.isCorrect)}
              className={className}
            >
              {isAnswered && isCorrect && (
                <span className="mr-2 text-emerald-600">✓</span>
              )}
              {isAnswered && isSelected && !isCorrect && (
                <span className="mr-2 text-red-500">✗</span>
              )}
              {choice.text}
            </button>
          );
        })}
      </div>

      {phase.name === "answered" && (
        <CardFeedback
          explanation={card.explanation}
          reference={card.reference}
          onNext={onNext}
        />
      )}
    </div>
  );
}
