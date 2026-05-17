"use client";

/**
 * StudyShell owns the interaction state machine for one card.
 *
 * It sits at the Server Component / Client Component boundary: the parent
 * Server Component (study/page.tsx) fetches a card and passes it here as a
 * prop. StudyShell manages the idle → answered/revealed transition locally,
 * then calls router.push('/study') for "Next", which triggers a full RSC
 * re-render so the Server Component fetches a fresh random card.
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

  function handleNext() {
    // router.push triggers a new RSC render; the Server Component fetches a
    // fresh random card. scroll:false prevents the page jumping to the top.
    router.push("/study", { scroll: false });
  }

  if (card.type === "MULTIPLE_CHOICE") {
    return (
      <MultipleChoiceCard
        card={card}
        phase={mcPhase}
        onAnswer={(selectedId, isCorrect) =>
          setMcPhase({ name: "answered", selectedId, isCorrect })
        }
        onNext={handleNext}
      />
    );
  }

  return (
    <OpenAnswerCard
      card={card}
      phase={oaPhase}
      onReveal={() => setOaPhase({ name: "revealed" })}
      onNext={handleNext}
    />
  );
}
