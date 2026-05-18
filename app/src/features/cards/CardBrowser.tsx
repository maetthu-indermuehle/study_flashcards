"use client";

/**
 * CardBrowser handles the filter/search bar and card list for /cards.
 *
 * Filter state lives in the URL (search params). Changing a filter calls
 * router.push() which triggers the Server Component page to re-fetch with
 * the new params, passing fresh data back as props. useTransition() provides
 * the pending state used to dim the list during navigation.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  CardFilters,
  CardListItem,
  CardType,
  CardDifficulty,
  CardStatus,
  TagOption,
} from "@/lib/cards/types";
import { PAGE_SIZE } from "@/lib/cards/types";

type Props = {
  cards: CardListItem[];
  total: number;
  filters: CardFilters;
  tags: TagOption[];
};

export default function CardBrowser({ cards, total, filters, tags }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local search state if filters change from outside (e.g. browser back).
  useEffect(() => {
    setSearch(filters.search);
  }, [filters.search]);

  // Debounce search input — push new URL 400ms after the user stops typing.
  useEffect(() => {
    if (search === filters.search) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushFilters({ search, page: 1 });
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function pushFilters(overrides: Partial<CardFilters>) {
    const next = { ...filters, ...overrides };
    const params = new URLSearchParams();
    if (next.search) params.set("search", next.search);
    if (next.type !== "ALL") params.set("type", next.type);
    if (next.difficulty !== "ALL") params.set("difficulty", next.difficulty);
    if (next.status !== "ALL") params.set("status", next.status);
    if (next.flaggedOnly) params.set("flaggedOnly", "1");
    next.tagIds.forEach((id) => params.append("tagId", id));
    if (next.sort !== "createdAt") params.set("sort", next.sort);
    if (next.sortDir !== "asc") params.set("sortDir", next.sortDir);
    if (next.page > 1) params.set("page", String(next.page));
    startTransition(() => {
      router.push("/cards?" + params.toString());
    });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {/* Search */}
        <div className="flex-1 min-w-48">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search question or answer…"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none"
          />
        </div>

        {/* Type */}
        <select
          value={filters.type}
          onChange={(e) =>
            pushFilters({ type: e.target.value as CardType | "ALL", page: 1 })
          }
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
        >
          <option value="ALL">All types</option>
          <option value="MULTIPLE_CHOICE">Multiple choice</option>
          <option value="OPEN_ANSWER">Open answer</option>
        </select>

        {/* Difficulty */}
        <select
          value={filters.difficulty}
          onChange={(e) =>
            pushFilters({
              difficulty: e.target.value as CardDifficulty | "ALL",
              page: 1,
            })
          }
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
        >
          <option value="ALL">All difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) =>
            pushFilters({
              status: e.target.value as CardStatus | "ALL",
              page: 1,
            })
          }
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
        >
          <option value="ALL">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        {/* Sort */}
        <select
          value={`${filters.sort}-${filters.sortDir}`}
          onChange={(e) => {
            const [sort, sortDir] = e.target.value.split("-") as [
              CardFilters["sort"],
              CardFilters["sortDir"],
            ];
            pushFilters({ sort, sortDir, page: 1 });
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
        >
          <option value="createdAt-asc">Oldest first</option>
          <option value="createdAt-desc">Newest first</option>
          <option value="question-asc">A → Z</option>
          <option value="question-desc">Z → A</option>
        </select>

        {/* Flagged only */}
        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.flaggedOnly}
            onChange={(e) =>
              pushFilters({ flaggedOnly: e.target.checked, page: 1 })
            }
            className="accent-amber-500"
          />
          Flagged only
        </label>
      </div>

      {/* Result count */}
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>
          {total === 0
            ? "No cards"
            : `${total.toLocaleString()} card${total === 1 ? "" : "s"}`}
          {filters.search && ` matching "${filters.search}"`}
        </span>
        {isPending && (
          <span className="text-sky-600">Loading…</span>
        )}
      </div>

      {/* Card list */}
      <div className={`divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white ${isPending ? "opacity-60" : ""}`}>
        {cards.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No cards match your filters.
          </p>
        ) : (
          cards.map((card) => <CardRow key={card.id} card={card} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            disabled={filters.page <= 1 || isPending}
            onClick={() => pushFilters({ page: filters.page - 1 })}
            className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-slate-500">
            Page {filters.page} of {totalPages}
          </span>
          <button
            disabled={filters.page >= totalPages || isPending}
            onClick={() => pushFilters({ page: filters.page + 1 })}
            className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card row
// ---------------------------------------------------------------------------

function CardRow({ card }: { card: CardListItem }) {
  const excerpt =
    card.question.length > 100
      ? card.question.slice(0, 100) + "…"
      : card.question;

  return (
    <Link
      href={`/cards/${card.id}`}
      className="block px-4 py-3 hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Row 1: ID + badges */}
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {card.originalId && (
              <span className="font-mono text-xs text-slate-400">
                {card.originalId}
              </span>
            )}
            <TypeBadge type={card.type} />
            <DifficultyBadge difficulty={card.difficulty} />
            {card.status !== "PUBLISHED" && (
              <StatusBadge status={card.status} />
            )}
            {card.flagged && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                flagged
              </span>
            )}
          </div>
          {/* Row 2: Question */}
          <p className="text-sm text-slate-800">{excerpt}</p>
          {/* Row 3: Tags */}
          {card.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {card.tags.slice(0, 4).map((t) => (
                <span
                  key={t.id}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                >
                  {t.name}
                </span>
              ))}
              {card.tags.length > 4 && (
                <span className="text-xs text-slate-400">
                  +{card.tags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
        {/* Due date */}
        <div className="shrink-0 text-right">
          {card.reviewCount > 0 ? (
            <span className="text-xs text-slate-400">
              {card.dueAt ? formatDue(card.dueAt) : "—"}
            </span>
          ) : (
            <span className="text-xs text-slate-400">new</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Small badge helpers
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: CardListItem["type"] }) {
  return (
    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
      {type === "MULTIPLE_CHOICE" ? "MC" : "OA"}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: CardListItem["difficulty"] }) {
  const colours: Record<string, string> = {
    EASY: "bg-emerald-100 text-emerald-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HARD: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colours[difficulty] ?? ""}`}
    >
      {difficulty.toLowerCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: CardListItem["status"] }) {
  const colours: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-600",
    ARCHIVED: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colours[status] ?? ""}`}
    >
      {status.toLowerCase()}
    </span>
  );
}

function formatDue(date: Date): string {
  const now = Date.now();
  const diff = date.getTime() - now;
  const days = Math.round(diff / 86_400_000);
  if (days <= 0) return "due";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}
