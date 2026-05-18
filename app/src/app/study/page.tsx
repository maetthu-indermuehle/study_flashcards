import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { getNextCard } from "@/lib/study/get-next-card";
import StudyShell from "@/features/study/StudyShell";

export const metadata: Metadata = {
  title: "Study — PPL Flashcards",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StudyPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await readSessionCookie();
  if (!session) redirect("/login");

  const params = await searchParams;
  const tagIds = Array.isArray(params.tagIds)
    ? params.tagIds
    : params.tagIds
      ? params.tagIds.split(",").filter(Boolean)
      : [];

  const card = await getNextCard(session.userId, tagIds.length > 0 ? tagIds : undefined);

  return (
    <main className="min-h-dvh bg-stone-50">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-6 pb-6 safe-bottom">
        <header className="mb-6 flex items-center justify-between">
          <Link
            href={tagIds.length > 0 ? "/study/setup" : "/"}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← {tagIds.length > 0 ? "Setup" : "Home"}
          </Link>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
            Canadian PPL
          </p>
        </header>

        {card ? (
          // key={card.id} ensures StudyShell resets its state on each new card.
          <StudyShell key={card.id} card={card} />
        ) : (
          <div className="grid flex-1 place-items-center">
            <p className="text-slate-500">No cards available yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}
