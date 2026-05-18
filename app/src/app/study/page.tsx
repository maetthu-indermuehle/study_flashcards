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
  const dueOnly = params.dueOnly === "1";

  const card = await getNextCard(
    session.userId,
    tagIds.length > 0 ? tagIds : undefined,
    dueOnly,
  );

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
        ) : dueOnly ? (
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <p className="text-2xl font-semibold text-slate-950">All caught up!</p>
              <p className="mt-2 text-sm text-slate-500">
                No due cards remaining in this selection.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/study/setup"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  ← Back to setup
                </Link>
                {tagIds.length > 0 && (
                  <Link
                    href={`/study?tagIds=${tagIds.join(",")}`}
                    className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Study new cards →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 place-items-center">
            <p className="text-slate-500">No cards available yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}
