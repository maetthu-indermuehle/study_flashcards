"use client";

/**
 * FlaggedQueue steps through all flagged cards one at a time.
 *
 * For each card, the full edit form is shown below the flag note. Three
 * actions are available:
 *   - "Save & clear flag": saves edits + removes the flag, advances.
 *   - "Keep flagged": saves edits but keeps the flag, advances.
 *   - "Skip": advances without saving.
 *
 * When all cards have been handled, a completion screen is shown.
 */

import { useState } from "react";
import Link from "next/link";
import type { CardDetail, CardFormData, TagOption } from "@/lib/cards/types";
import { saveFlaggedCard, updateCard } from "@/lib/cards/actions";
import CardForm from "./CardForm";

type Props = {
  cards: CardDetail[];
  tags: TagOption[];
};

export default function FlaggedQueue({ cards, tags }: Props) {
  const [handled, setHandled] = useState<Set<string>>(new Set());

  const remaining = cards.filter((c) => !handled.has(c.id));

  if (remaining.length === 0) {
    return (
      <div className="grid flex-1 place-items-center py-20">
        <div className="text-center">
          <p className="mb-2 text-3xl">✓</p>
          <h2 className="mb-1 text-xl font-semibold text-slate-950">
            All caught up
          </h2>
          <p className="mb-6 text-slate-500">
            No more flagged cards to review.
          </p>
          <Link
            href="/cards"
            className="rounded-md bg-slate-950 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Back to cards
          </Link>
        </div>
      </div>
    );
  }

  const card = remaining[0];

  function advance() {
    setHandled((prev) => new Set([...prev, card.id]));
    // index stays the same — the next card slides into the same position
  }

  async function handleSaveAndClear(data: CardFormData) {
    const result = await saveFlaggedCard(card.id, data);
    if (result.success) advance();
    return result;
  }

  async function handleKeepFlagged(data: CardFormData) {
    const result = await updateCard(card.id, data, "flagged edit");
    if (result.success) advance();
    return result;
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            1 of {remaining.length} flagged
          </span>
          <button
            onClick={advance}
            className="text-slate-400 hover:text-slate-600 text-xs"
          >
            Skip →
          </button>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200">
          <div
            className="h-1.5 rounded-full bg-amber-400 transition-all"
            style={{
              width: `${((cards.length - remaining.length) / cards.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Flag note */}
      {card.flagNote && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Your flag note
          </p>
          <p className="text-sm text-amber-900">{card.flagNote}</p>
        </div>
      )}

      {/* Card identifier */}
      {card.originalId && (
        <p className="mb-4 font-mono text-xs text-slate-400">{card.originalId}</p>
      )}

      {/* Edit form with custom save callbacks */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <FlaggedCardForm
          card={card}
          tags={tags}
          onSaveAndClear={handleSaveAndClear}
          onKeepFlagged={handleKeepFlagged}
          onSkip={advance}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FlaggedCardForm — wraps CardForm with the three-button action row
// ---------------------------------------------------------------------------

type FlaggedFormProps = {
  card: CardDetail;
  tags: TagOption[];
  onSaveAndClear: (data: CardFormData) => Promise<{ success: boolean; error?: string }>;
  onKeepFlagged: (data: CardFormData) => Promise<{ success: boolean; error?: string }>;
  onSkip: () => void;
};

function FlaggedCardForm({
  card,
  tags,
  onSaveAndClear,
  onKeepFlagged,
  onSkip,
}: FlaggedFormProps) {
  // We intercept the form's save by using a shared data ref pattern:
  // CardForm calls our onSave callback instead of the default Server Action.
  // The action buttons below trigger that callback with different semantics.

  const [mode, setMode] = useState<"saveAndClear" | "keepFlagged" | null>(null);

  // CardForm's onSave is called when the user clicks its internal save button.
  // But in FlaggedQueue, we replace the save button entirely. Instead, we use
  // CardForm in a "data capture" mode — the form renders only fields (no
  // internal submit button) and we provide our own action buttons.

  // Since CardForm's save button is always rendered, we hide it via CSS and
  // instead provide our own buttons below. Our onSave captures the data,
  // sets mode, and CardForm proceeds normally.

  return (
    <div>
      <CardForm
        card={card}
        tags={tags}
        onSave={async (data) => {
          if (mode === "saveAndClear") return onSaveAndClear(data);
          if (mode === "keepFlagged") return onKeepFlagged(data);
          return { success: false, error: "No action selected" };
        }}
      />

      {/* Override the CardForm's action row with our own below. The form's
          own "Save changes" button will still be visible — for the flagged
          queue context we add our explicit buttons here and instruct users
          via the labels. In a future refactor, CardForm could accept a
          renderActions prop; for now this is pragmatic. */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
          After editing above, choose an action:
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("saveAndClear")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              mode === "saveAndClear"
                ? "bg-emerald-600 text-white"
                : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Save & clear flag
          </button>
          <button
            type="button"
            onClick={() => setMode("keepFlagged")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              mode === "keepFlagged"
                ? "bg-amber-600 text-white"
                : "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Save & keep flagged
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Skip (no save)
          </button>
        </div>
        {mode && (
          <p className="mt-2 text-xs text-slate-500">
            Mode selected: <strong>{mode === "saveAndClear" ? "Save & clear flag" : "Save & keep flagged"}</strong>.
            Now click <strong>Save changes</strong> in the form above to apply.
          </p>
        )}
      </div>
    </div>
  );
}
