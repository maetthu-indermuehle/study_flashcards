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

import { useState, useRef } from "react";
import Link from "next/link";
import type { CardDetail, CardFormData, TagOption } from "@/lib/cards/types";
import { saveFlaggedCard, updateCard } from "@/lib/cards/actions";
import CardForm, { type CardFormHandle } from "./CardForm";

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
  // formRef lets us trigger CardForm's internal submit imperatively.
  // modeRef (not state) avoids stale-closure issues when onSave reads it.
  const formRef = useRef<CardFormHandle>(null);
  const modeRef = useRef<"saveAndClear" | "keepFlagged" | null>(null);

  function trigger(action: "saveAndClear" | "keepFlagged") {
    modeRef.current = action;
    formRef.current?.submit();
  }

  return (
    <div>
      {/* hideActions removes CardForm's own "Save changes" row */}
      <CardForm
        ref={formRef}
        card={card}
        tags={tags}
        hideActions
        onSave={async (data) => {
          if (modeRef.current === "saveAndClear") return onSaveAndClear(data);
          if (modeRef.current === "keepFlagged") return onKeepFlagged(data);
          return { success: false, error: "No action selected" };
        }}
      />

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => trigger("saveAndClear")}
            className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            Save & clear flag
          </button>
          <button
            type="button"
            onClick={() => trigger("keepFlagged")}
            className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
          >
            Save & keep flagged
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Skip (no save)
          </button>
        </div>
      </div>
    </div>
  );
}
