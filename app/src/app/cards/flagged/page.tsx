import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { listCards, listTags, getCard } from "@/lib/cards/queries";
import FlaggedQueue from "@/features/cards/FlaggedQueue";
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
    <main className="min-h-dvh bg-stone-50">
      <div className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8">
        <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-4">
            <Link
              href="/cards"
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              ← Cards
            </Link>
            <h1 className="text-lg font-semibold text-slate-950">
              Flagged cards
            </h1>
          </div>
          {cards.length > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
              {cards.length} flagged
            </span>
          )}
        </header>

        {cards.length === 0 ? (
          <div className="grid place-items-center py-20">
            <div className="text-center">
              <p className="mb-2 text-3xl">✓</p>
              <h2 className="mb-1 text-xl font-semibold text-slate-950">
                No flagged cards
              </h2>
              <p className="mb-6 text-slate-500">
                Flag a card during study to review it here.
              </p>
              <Link
                href="/study"
                className="rounded-md bg-slate-950 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800"
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
