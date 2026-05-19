import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { listCards, listTags } from "@/lib/cards/queries";
import CardBrowser from "@/features/cards/CardBrowser";
import HamburgerMenu from "@/features/nav/HamburgerMenu";
import type { CardFilters, CardType, CardDifficulty, CardStatus } from "@/lib/cards/types";
import { DEFAULT_FILTERS } from "@/lib/cards/types";

export const metadata: Metadata = {
  title: "Cards — PPL Flashcards",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseFilters(params: Record<string, string | string[] | undefined>): CardFilters {
  const str = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";

  const tagIds = Array.isArray(params.tagId)
    ? params.tagId
    : params.tagId
      ? [params.tagId]
      : [];

  return {
    search: str("search"),
    type: (str("type") as CardType | "ALL") || "ALL",
    difficulty: (str("difficulty") as CardDifficulty | "ALL") || "ALL",
    status:
      (str("status") as CardStatus | "ALL") ||
      DEFAULT_FILTERS.status,
    tagIds,
    flaggedOnly: params.flaggedOnly === "1",
    sort: (str("sort") as CardFilters["sort"]) || "createdAt",
    sortDir: (str("sortDir") as CardFilters["sortDir"]) || "asc",
    page: parseInt(str("page") || "1", 10) || 1,
  };
}

export default async function CardsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await readSessionCookie();
  if (!session) redirect("/login");

  const params = await searchParams;
  const filters = parseFilters(params);

  const [{ cards, total }, tags] = await Promise.all([
    listCards(session.userId, filters),
    listTags(),
  ]);

  return (
    <main className="min-h-dvh bg-stone-50 dark:bg-slate-900 text-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <h1 className="text-xl font-semibold text-slate-950 dark:text-slate-100">Cards</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/cards/flagged"
              className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/35"
            >
              Review flagged
            </Link>
            <Link
              href="/cards/new"
              className="rounded-md bg-slate-950 dark:bg-slate-100 px-3 py-1.5 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
            >
              + New card
            </Link>
            <HamburgerMenu role={session.role} email={session.email} />
          </div>
        </header>

        <CardBrowser
          cards={cards}
          total={total}
          filters={filters}
          tags={tags}
        />
      </div>
    </main>
  );
}
