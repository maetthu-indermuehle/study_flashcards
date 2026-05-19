import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { getCard, listTags } from "@/lib/cards/queries";
import CardForm from "@/features/cards/CardForm";
import HamburgerMenu from "@/features/nav/HamburgerMenu";

export const metadata: Metadata = {
  title: "Edit Card — PPL Flashcards",
};

type Params = Promise<{ id: string }>;

export default async function CardDetailPage({ params }: { params: Params }) {
  const session = await readSessionCookie();
  if (!session) redirect("/login");

  const { id } = await params;
  const [card, tags] = await Promise.all([
    getCard(id, session.userId),
    listTags(),
  ]);

  if (!card) notFound();

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
            <h1 className="text-lg font-semibold text-slate-950 dark:text-slate-100">Edit card</h1>
          </div>
          <HamburgerMenu role={session.role} email={session.email} />
        </header>

        {/* Flag note banner */}
        {card.flagged && (
          <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Flagged for review
            </p>
            {card.flagNote && (
              <p className="text-sm text-amber-900 dark:text-amber-300">{card.flagNote}</p>
            )}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <CardForm card={card} tags={tags} />
        </div>

        {/* Metadata footer */}
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          {card.originalId && <span className="mr-3 font-mono">{card.originalId}</span>}
          Created {card.createdAt.toLocaleDateString()} · Last updated{" "}
          {card.updatedAt.toLocaleDateString()}
        </p>
      </div>
    </main>
  );
}
