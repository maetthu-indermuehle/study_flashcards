"use client";

/**
 * ExportDeckCard — per-deck accordion topic picker + export buttons.
 *
 * Shows the same three-level hierarchy as StudySetup (subject → topic group →
 * sub-topic) but instead of navigating to /study it builds download URLs with
 * the selected tagIds. When nothing is selected, all cards in the deck are exported.
 */

import { useState } from "react";
import type { SubjectGroup, TopicGroup } from "@/lib/study/preset-queries";

type Props = {
  subject: SubjectGroup;
};

export default function ExportDeckCard({ subject }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { deckId, name, topicGroups, allTagIds } = subject;

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  function isGroupFull(group: TopicGroup) {
    return group.allTagIds.length > 0 && group.allTagIds.every((id) => selected.has(id));
  }
  function isGroupPartial(group: TopicGroup) {
    return !isGroupFull(group) && group.allTagIds.some((id) => selected.has(id));
  }

  function toggleGroup(group: TopicGroup) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isGroupFull(group)) {
        group.allTagIds.forEach((id) => next.delete(id));
      } else {
        group.allTagIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleTag(tagId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(tagId) ? next.delete(tagId) : next.add(tagId);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allTagIds));
  }
  function clearAll() {
    setSelected(new Set());
  }

  // ---------------------------------------------------------------------------
  // URL helpers
  // ---------------------------------------------------------------------------

  function exportUrl(format: "json" | "csv" | "diff") {
    const base = `/api/export/deck/${deckId}/${format}`;
    if (selected.size === 0) return base;
    return `${base}?tagIds=${[...selected].join(",")}`;
  }

  const selectionLabel =
    selected.size === 0
      ? `All ${subject.totalCards} cards`
      : `${selected.size} topic${selected.size !== 1 ? "s" : ""} selected`;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      {/* Deck header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-slate-800 dark:text-slate-100">{name}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {subject.totalCards} card{subject.totalCards !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            onClick={selectAll}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
          >
            all
          </button>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <button
            onClick={clearAll}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
          >
            none
          </button>
        </div>
      </div>

      {/* Topic accordion */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {topicGroups.map((group) => {
          const isOpen = expanded.has(group.name);
          const full = isGroupFull(group);
          const partial = isGroupPartial(group);

          return (
            <div key={group.name}>
              {/* Group header row */}
              <div className="flex items-center gap-3 px-4 py-2.5">
                {/* Select-all checkbox for the group */}
                <input
                  type="checkbox"
                  checked={full}
                  ref={(el) => { if (el) el.indeterminate = partial; }}
                  onChange={() => toggleGroup(group)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 accent-indigo-600 dark:accent-indigo-400"
                />
                {/* Group name — clicking expands/collapses sub-topics */}
                <button
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      next.has(group.name) ? next.delete(group.name) : next.add(group.name);
                      return next;
                    })
                  }
                  className="flex flex-1 items-center justify-between text-left text-sm font-medium text-slate-700 dark:text-slate-200"
                >
                  <span>{group.name}</span>
                  <span className="ml-2 flex items-center gap-2">
                    <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                      {group.totalCards}
                    </span>
                    <ChevronIcon open={isOpen} />
                  </span>
                </button>
              </div>

              {/* Sub-topics */}
              {isOpen && group.subTopics.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 pb-1">
                  {group.subTopics.map((sub) => (
                    <label
                      key={sub.id}
                      className="flex cursor-pointer items-center gap-3 px-6 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/30"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(sub.id)}
                        onChange={() => toggleTag(sub.id)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-500 accent-indigo-600 dark:accent-indigo-400"
                      />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{sub.label}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{sub.cardCount}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Export buttons */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 dark:border-slate-700 px-4 py-3">
        <span className="mr-auto text-xs text-slate-400 dark:text-slate-500">{selectionLabel}</span>
        <a
          href={exportUrl("json")}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          JSON
        </a>
        <a
          href={exportUrl("csv")}
          className="rounded bg-slate-600 dark:bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-500"
        >
          CSV
        </a>
        <a
          href={exportUrl("diff")}
          className="rounded border border-amber-500 dark:border-amber-600 px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
        >
          Diff
        </a>
      </div>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-slate-400 dark:text-slate-500 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="2,4 7,10 12,4" />
    </svg>
  );
}
