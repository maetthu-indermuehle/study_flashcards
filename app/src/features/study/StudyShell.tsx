"use client";

/**
 * StudyShell owns the interaction state machine for one card.
 *
 * It sits at the Server Component / Client Component boundary: the parent
 * Server Component (study/page.tsx) fetches a card and passes it here as a
 * prop. StudyShell manages the idle → answered/revealed transition locally,
 * then calls router.refresh() for "Next", which clears the client cache and
 * re-renders the Server Component so it fetches a fresh card via getNextCard.
 *
 * The parent renders <StudyShell key={card.id} card={card} />, ensuring
 * React unmounts and remounts this component (resetting all state) whenever
 * a new card arrives.
 */

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MultipleChoiceCard from "./MultipleChoiceCard";
import OpenAnswerCard from "./OpenAnswerCard";
import CardIdBadge from "./CardIdBadge";
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

  const [flagged, setFlagged] = useState(card.flagged);
  const [flagNote, setFlagNote] = useState(card.flagNote ?? "");
  const [noteOpen, setNoteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (noteOpen) textareaRef.current?.focus();
  }, [noteOpen]);

  function handleNext() {
    // router.refresh() re-fetches the Server Component at the current URL and
    // clears the client cache. router.push() to the same URL is a no-op in
    // Next.js 16 App Router, so refresh is the correct primitive here.
    router.refresh();
  }

  function handleFlagButtonClick() {
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
      {/* Card toolbar */}
      <div className="mb-3 flex items-center justify-between">
        {card.originalId ? (
          <CardIdBadge originalId={card.originalId} topics={card.topics} tags={card.tags} />
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={handleFlagButtonClick}
            title={flagged ? "Edit flag note" : "Flag for review"}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition ${
              flagged
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <FlagIcon filled={flagged} />
            {flagged ? "Flagged" : "Flag"}
          </button>
          <Link
            href={`/cards/${card.id}`}
            title="Edit this card"
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300 transition"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Inline note panel */}
      {noteOpen && (
        <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
          <p className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
            {flagged ? "Edit flag note" : "Flag this card for review"}
          </p>
          <textarea
            ref={textareaRef}
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
            placeholder="What's wrong with this card? (optional)"
            rows={3}
            className="w-full resize-none rounded-md border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-400 dark:focus:border-amber-500 focus:outline-none"
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
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
              >
                Remove flag
              </button>
            )}
            <button
              onClick={() => setNoteOpen(false)}
              className="ml-auto rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13"
      fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2v12M2 2h9l-2.5 4L11 10H2" />
    </svg>
  );
}
