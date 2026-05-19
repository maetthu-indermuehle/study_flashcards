import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { listCards, listTags, getCard } from "@/lib/cards/queries";
import FlaggedQueue from "@/features/cards/FlaggedQueue";
import HamburgerMenu from "@/features/nav/HamburgerMenu";
import type { CardDetail } from "@/lib/cards/types";

export const metadata: Metadata = {
  title: "Flagged Cards — PPL Flashcards",
};

export default async function FlaggedPage() {
  const session = await readSessionCookie();
  if (!session) redirect("/login");

  // Fetch all flagged cards (no pagination — typically a small set).
  const [{ cards: flaggedList }, tags] = await Promise.all([
    listCards(session.userId, { flaggedOnly: true, status: "ALL", page: 1 }, 200),
    listTags(),
  ]);

  // Fetch full detail for each flagged card (needed for the edit form).
  const details = await Promise.all(
    flaggedList.map((c) => getCard(c.id, session.userId)),
  );
  const cards: CardDetail[] = details.filter((c): c is CardDetail => c !== null);

  return (
    <main className="min-h-dvh bg-stone-50 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8">
        <header className="mb-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-4">
            <Link
              href="/cards"
              className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              ← Cards
            </Link>
            <h1 className="text-lg font-semibold text-slate-950 dark:text-slate-100">
              Flagged cards
            </h1>
            {cards.length > 0 && (
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-400">
                {cards.length} flagged
              </span>
            )}
          </div>
          <HamburgerMenu role={session.role} email={session.email} />
        </header>

        {cards.length === 0 ? (
          <div className="grid place-items-center py-20">
            <div className="text-center">
              <p className="mb-2 text-3xl">✓</p>
              <h2 className="mb-1 text-xl font-semibold text-slate-950 dark:text-slate-100">
                No flagged cards
              </h2>
              <p className="mb-6 text-slate-500 dark:text-slate-400">
                Flag a card during study to review it here.
              </p>
              <Link
                href="/study"
                className="rounded-md bg-slate-950 dark:bg-slate-100 px-5 py-2 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
              >
                Start studying
              </Link>
            </div>
          </div>
        ) : (
          <FlaggedQueue cards={cards} tags={tags} />
        )}
      </div>
    </main>
  );
}
