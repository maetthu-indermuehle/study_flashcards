"use client";

/**
 * StudyShell owns the interaction state machine for one card.
 *
 * It sits at the Server Component / Client Component boundary: the parent
 * Server Component (study/page.tsx) fetches a card and passes it here as a
 * prop. StudyShell manages the idle → answered/revealed transition locally,
 * then calls router.push('/study') for "Next", which triggers a full RSC
 * re-render so the Server Component fetches a fresh card via getNextCard.
 *
 * The parent renders <StudyShell key={card.id} card={card} />, ensuring
 * React unmounts and remounts this component (resetting all state) whenever
 * a new card arrives.
 */

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import MultipleChoiceCard from "./MultipleChoiceCard";
import OpenAnswerCard from "./OpenAnswerCard";
import type { StudyCard } from "@/lib/study/types";

type MCPhase =
  | { name: "idle" }
  | { name: "answered"; selectedId: string; isCorrect: boolean };

type OAPhase = { name: "idle" } | { name: "revealed" };

type Props = {
  card: StudyCard;
};

export default function StudyShell({ card }: Props) {
  const router = useRouter();

  const [mcPhase, setMcPhase] = useState<MCPhase>({ name: "idle" });
  const [oaPhase, setOaPhase] = useState<OAPhase>({ name: "idle" });

  // Flag state
  const [flagged, setFlagged] = useState(card.flagged);
  const [flagNote, setFlagNote] = useState(card.flagNote ?? "");
  const [noteOpen, setNoteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when the note panel opens
  useEffect(() => {
    if (noteOpen) textareaRef.current?.focus();
  }, [noteOpen]);

  function handleNext() {
    // router.push triggers a new RSC render; the Server Component fetches a
    // fresh card. scroll:false prevents the page jumping to the top.
    router.push("/study", { scroll: false });
  }

  function handleFlagButtonClick() {
    // If already flagged: open the note panel to edit/unflag.
    // If not flagged: open the note panel to add a note and save.
    setNoteOpen((open) => !open);
  }

  async function handleSaveFlag() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/study/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, note: flagNote }),
      });
      if (res.ok) {
        const data = await res.json();
        setFlagged(data.flagged);
        setFlagNote(data.note ?? "");
        setNoteOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUnflag() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/study/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, unflag: true }),
      });
      if (res.ok) {
        setFlagged(false);
        setFlagNote("");
        setNoteOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Card toolbar: source ID + flag button */}
      <div className="mb-3 flex items-center justify-between">
        {card.originalId ? (
          <span className="font-mono text-xs text-slate-400">{card.originalId}</span>
        ) : (
          <span />
        )}
        <button
          onClick={handleFlagButtonClick}
          title={flagged ? "Edit flag note" : "Flag for review"}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition ${
            flagged
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          }`}
        >
          <FlagIcon filled={flagged} />
          {flagged ? "Flagged" : "Flag"}
        </button>
      </div>

      {/* Inline note panel */}
      {noteOpen && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="mb-2 text-xs font-semibold text-amber-700">
            {flagged ? "Edit flag note" : "Flag this card for review"}
          </p>
          <textarea
            ref={textareaRef}
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
            placeholder="What's wrong with this card? (optional)"
            rows={3}
            className="w-full resize-none rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleSaveFlag}
              disabled={saving}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              {flagged ? "Update note" : "Save flag"}
            </button>
            {flagged && (
              <button
                onClick={handleUnflag}
                disabled={saving}
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                Remove flag
              </button>
            )}
            <button
              onClick={() => setNoteOpen(false)}
              className="ml-auto rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {card.type === "MULTIPLE_CHOICE" ? (
        <MultipleChoiceCard
          card={card}
          cardId={card.id}
          phase={mcPhase}
          onAnswer={(selectedId, isCorrect) =>
            setMcPhase({ name: "answered", selectedId, isCorrect })
          }
          onNext={handleNext}
        />
      ) : (
        <OpenAnswerCard
          card={card}
          cardId={card.id}
          phase={oaPhase}
          onReveal={() => setOaPhase({ name: "revealed" })}
          onNext={handleNext}
        />
      )}
    </div>
  );
}

function FlagIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="13"
      height="13"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 2v12M2 2h9l-2.5 4L11 10H2" />
    </svg>
  );
}
