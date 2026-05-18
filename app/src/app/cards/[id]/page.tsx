import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { getCard, listTags } from "@/lib/cards/queries";
import CardForm from "@/features/cards/CardForm";

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
            <h1 className="text-lg font-semibold text-slate-950">Edit card</h1>
          </div>
          {card.originalId && (
            <span className="font-mono text-xs text-slate-400">
              {card.originalId}
            </span>
          )}
        </header>

        {/* Flag note banner */}
        {card.flagged && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
              Flagged for review
            </p>
            {card.flagNote && (
              <p className="text-sm text-amber-900">{card.flagNote}</p>
            )}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <CardForm card={card} tags={tags} />
        </div>

        {/* Metadata footer */}
        <p className="mt-4 text-xs text-slate-400">
          Created {card.createdAt.toLocaleDateString()} · Last updated{" "}
          {card.updatedAt.toLocaleDateString()}
        </p>
      </div>
    </main>
  );
}
