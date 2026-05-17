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

import { useState } from "react";
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
  const [flagged, setFlagged] = useState(card.flagged);
  const [flagging, setFlagging] = useState(false);

  function handleNext() {
    // router.push triggers a new RSC render; the Server Component fetches a
    // fresh card. scroll:false prevents the page jumping to the top.
    router.push("/study", { scroll: false });
  }

  async function handleFlag() {
    if (flagging) return;
    setFlagging(true);
    try {
      const res = await fetch("/api/study/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setFlagged(data.flagged);
      }
    } finally {
      setFlagging(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Card toolbar: flag button + source ID */}
      <div className="mb-3 flex items-center justify-between">
        {card.originalId ? (
          <span className="font-mono text-xs text-slate-400">{card.originalId}</span>
        ) : (
          <span />
        )}
        <button
          onClick={handleFlag}
          disabled={flagging}
          title={flagged ? "Remove flag" : "Flag for review"}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
            flagged
              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          }`}
        >
          <FlagIcon filled={flagged} />
          {flagged ? "Flagged" : "Flag"}
        </button>
      </div>

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
