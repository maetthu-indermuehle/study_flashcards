import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { listTags } from "@/lib/cards/queries";
import CardForm from "@/features/cards/CardForm";

export const metadata: Metadata = {
  title: "New Card — PPL Flashcards",
};

export default async function NewCardPage() {
  const session = await readSessionCookie();
  if (!session) redirect("/login");

  const tags = await listTags();

  return (
    <main className="min-h-dvh bg-stone-50">
      <div className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8">
        <header className="mb-6 flex items-center gap-4 border-b border-slate-200 pb-4">
          <Link
            href="/cards"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Cards
          </Link>
          <h1 className="text-lg font-semibold text-slate-950">New card</h1>
        </header>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <CardForm tags={tags} />
        </div>
      </div>
    </main>
  );
}
