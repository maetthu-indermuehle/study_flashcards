import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { getNextCard } from "@/lib/study/get-next-card";
import StudySession from "@/features/study/StudySession";
import HamburgerMenu from "@/features/nav/HamburgerMenu";

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
  // ?card=<uuid> forces a specific card — used by the "← Prev" history button.
  const forceId = typeof params.card === "string" ? params.card : undefined;

  const card = await getNextCard(
    session.userId,
    tagIds.length > 0 ? tagIds : undefined,
    dueOnly,
    forceId,
  );

  return (
    <main className="min-h-dvh bg-stone-50 dark:bg-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-4 pb-6 safe-bottom landscape:pt-2 landscape:pb-4">
        <header className="mb-4 flex items-center justify-between landscape:mb-2">
          <Link
            href="/study/setup"
            className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ← Setup
          </Link>
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700 dark:text-sky-400">
            Flashcards
          </p>
          <HamburgerMenu role={session.role} email={session.email} />
        </header>

        {card ? (
          <StudySession card={card} tagIds={tagIds} dueOnly={dueOnly} />
        ) : dueOnly ? (
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <p className="text-2xl font-semibold text-slate-950 dark:text-slate-100">All caught up!</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                No due cards remaining in this selection.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/study/setup"
                  className="rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  ← Back to setup
                </Link>
                {tagIds.length > 0 && (
                  <Link
                    href={`/study?tagIds=${tagIds.join(",")}`}
                    className="rounded-md bg-slate-950 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
                  >
                    Study new cards →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 place-items-center">
            <p className="text-slate-500 dark:text-slate-400">No cards available yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}
