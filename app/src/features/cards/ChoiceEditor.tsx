"use client";

/**
 * ChoiceEditor manages the list of multiple-choice options in the card form.
 * Choices can be added, removed, edited, and marked as correct/incorrect.
 */

import type { CardFormChoice } from "@/lib/cards/types";

type Props = {
  choices: CardFormChoice[];
  onChange: (choices: CardFormChoice[]) => void;
};

export default function ChoiceEditor({ choices, onChange }: Props) {
  function addChoice() {
    onChange([
      ...choices,
      { text: "", isCorrect: false, sortOrder: choices.length },
    ]);
  }

  function removeChoice(index: number) {
    const next = choices
      .filter((_, i) => i !== index)
      .map((c, i) => ({ ...c, sortOrder: i }));
    onChange(next);
  }

  function updateText(index: number, text: string) {
    onChange(choices.map((c, i) => (i === index ? { ...c, text } : c)));
  }

  function toggleCorrect(index: number) {
    onChange(
      choices.map((c, i) => (i === index ? { ...c, isCorrect: !c.isCorrect } : c)),
    );
  }

  const correctCount = choices.filter((c) => c.isCorrect).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">Choices</label>
        {choices.length > 0 && (
          <span
            className={`text-xs ${correctCount === 0 ? "text-red-500" : "text-slate-400"}`}
          >
            {correctCount === 0
              ? "Mark at least one correct"
              : `${correctCount} correct`}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {choices.map((choice, i) => (
          <div key={i} className="flex items-start gap-2">
            {/* Correct toggle */}
            <button
              type="button"
              onClick={() => toggleCorrect(i)}
              title={choice.isCorrect ? "Mark incorrect" : "Mark correct"}
              className={`mt-2 h-5 w-5 shrink-0 rounded-full border-2 transition ${
                choice.isCorrect
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-slate-300 hover:border-slate-400"
              }`}
            >
              {choice.isCorrect && (
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-full w-full p-0.5"
                >
                  <polyline points="3,8 6.5,12 13,4" />
                </svg>
              )}
            </button>

            {/* Text input */}
            <input
              type="text"
              value={choice.text}
              onChange={(e) => updateText(i, e.target.value)}
              placeholder={`Choice ${i + 1}`}
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-400 focus:outline-none"
            />

            {/* Remove */}
            <button
              type="button"
              onClick={() => removeChoice(i)}
              title="Remove choice"
              className="mt-1.5 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="3" x2="13" y2="13" />
                <line x1="13" y1="3" x2="3" y2="13" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addChoice}
        className="mt-3 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 transition"
      >
        + Add choice
      </button>
    </div>
  );
}
