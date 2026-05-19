"use client";

/**
 * StudySession wraps StudyShell and owns the client-side card-history stack.
 *
 * Sitting between the Server Component page and the per-card StudyShell, it is
 * NOT re-mounted on soft navigations (router.refresh / router.push to the same
 * route), so its useRef history survives across both "Next" refreshes and
 * "← Prev" pushes. StudyShell, by contrast, still gets key={card.id} so it
 * resets its internal state on every new card.
 *
 * History grows on every "Next" (push current card.id before refreshing) and
 * shrinks on every "← Prev" (pop the previous id, push to ?card=<id>).
 */

import { useRef } from "react";
import { useRouter } from "next/navigation";
import StudyShell from "./StudyShell";
import type { StudyCard } from "@/lib/study/types";

type Props = {
  card: StudyCard;
  /** Normalised tag IDs already in use by the current study session. */
  tagIds: string[];
  /** Whether the session is running in "due cards only" mode. */
  dueOnly: boolean;
};

export default function StudySession({ card, tagIds, dueOnly }: Props) {
  const router = useRouter();
  // Array of card IDs the user has navigated *away from*, oldest first.
  // useRef so mutations never trigger unnecessary re-renders.
  const historyRef = useRef<string[]>([]);

  function handleNext() {
    historyRef.current.push(card.id);
    // router.refresh() re-fetches the Server Component at the same URL,
    // updating the card prop without adding a browser history entry.
    router.refresh();
  }

  function handlePrev() {
    const prevId = historyRef.current.pop();
    if (!prevId) return;
    const params = new URLSearchParams();
    if (tagIds.length > 0) params.set("tagIds", tagIds.join(","));
    if (dueOnly) params.set("dueOnly", "1");
    params.set("card", prevId);
    // router.push() is a soft navigation — StudySession is NOT remounted, so
    // historyRef survives and the updated (shorter) stack is reflected on the
    // next render.
    router.push("/study?" + params.toString());
  }

  const hasPrev = historyRef.current.length > 0;

  return (
    <StudyShell
      key={card.id}
      card={card}
      onNext={handleNext}
      onPrev={hasPrev ? handlePrev : undefined}
    />
  );
}
