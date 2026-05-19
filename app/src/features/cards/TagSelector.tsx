"use client";

/**
 * TagSelector lets the user add/remove tags from a card.
 * Shows existing tags as removable chips. Below them: a dropdown to pick
 * from existing tags, and an inline form to create a new tag.
 */

import { useState } from "react";
import type { CardDetailTag, TagOption, TagType } from "@/lib/cards/types";

type Props = {
  /** Currently selected tags. */
  selected: CardDetailTag[];
  /** All available tags to pick from. */
  available: TagOption[];
  /** New (unsaved) tags the user has created this session. */
  newTags: { name: string; type: TagType }[];
  onAddExisting: (tag: TagOption) => void;
  onRemove: (tagId: string) => void;
  onAddNew: (tag: { name: string; type: TagType }) => void;
  onRemoveNew: (index: number) => void;
};

const TAG_TYPES: { value: TagType; label: string }[] = [
  { value: "TOPIC", label: "Topic" },
  { value: "SOURCE", label: "Source" },
  { value: "SKILL", label: "Skill" },
  { value: "EXAM_AREA", label: "Exam area" },
  { value: "CUSTOM", label: "Custom" },
];

export default function TagSelector({
  selected,
  available,
  newTags,
  onAddExisting,
  onRemove,
  onAddNew,
  onRemoveNew,
}: Props) {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<TagType>("TOPIC");

  const selectedIds = new Set(selected.map((t) => t.id));
  const unselected = available.filter((t) => !selectedIds.has(t.id));

  function submitNew() {
    const name = newName.trim();
    if (!name) return;
    onAddNew({ name, type: newType });
    setNewName("");
    setShowNew(false);
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Tags
      </label>

      {/* Selected tags */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {selected.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/30 px-2.5 py-1 text-xs font-medium text-sky-800 dark:text-sky-300"
          >
            <span className="text-sky-500 dark:text-sky-400">{tag.type.toLowerCase()}</span>
            <span>{tag.name}</span>
            <button
              type="button"
              onClick={() => onRemove(tag.id)}
              className="ml-0.5 text-sky-500 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-200"
            >
              ×
            </button>
          </span>
        ))}
        {newTags.map((tag, i) => (
          <span
            key={`new-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/30 px-2.5 py-1 text-xs font-medium text-violet-800 dark:text-violet-300"
          >
            <span className="text-violet-500 dark:text-violet-400">{tag.type.toLowerCase()}</span>
            <span>{tag.name}</span>
            <span className="text-violet-400 dark:text-violet-500">new</span>
            <button
              type="button"
              onClick={() => onRemoveNew(i)}
              className="ml-0.5 text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-200"
            >
              ×
            </button>
          </span>
        ))}
        {selected.length === 0 && newTags.length === 0 && (
          <span className="text-sm text-slate-400 dark:text-slate-500">No tags</span>
        )}
      </div>

      {/* Add existing */}
      {unselected.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            const tag = available.find((t) => t.id === e.target.value);
            if (tag) onAddExisting(tag);
          }}
          className="mb-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none"
        >
          <option value="">Add tag…</option>
          {groupByType(unselected).map(([type, tags]) => (
            <optgroup key={type} label={type.toLowerCase()}>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}

      {/* Create new tag */}
      {!showNew ? (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
        >
          + Create new tag
        </button>
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submitNew())}
            placeholder="Tag name"
            className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 text-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as TagType)}
            className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-1.5 text-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none"
          >
            {TAG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={submitNew}
            className="rounded-md bg-sky-600 dark:bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 dark:hover:bg-sky-600"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setShowNew(false); setNewName(""); }}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: group tags by type
// ---------------------------------------------------------------------------

function groupByType(tags: TagOption[]): [string, TagOption[]][] {
  const map = new Map<string, TagOption[]>();
  for (const tag of tags) {
    const list = map.get(tag.type) ?? [];
    list.push(tag);
    map.set(tag.type, list);
  }
  return Array.from(map.entries());
}
