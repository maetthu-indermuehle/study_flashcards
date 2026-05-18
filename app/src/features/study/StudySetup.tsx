"use client";

/**
 * StudySetup — two-level topic picker for the /study/setup page.
 *
 * Groups show as collapsible rows. Clicking a group header selects/deselects
 * all tags in that group. Expanding a group lets you pick individual
 * sub-topics instead.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPreset, deletePreset, setPresetShared } from "@/lib/study/preset-actions";
import type { TopicGroup, PresetItem } from "@/lib/study/preset-queries";

type Props = {
  groups: TopicGroup[];
  presets: PresetItem[];
  canShare: boolean;
};

export default function StudySetup({ groups, presets: initialPresets, canShare }: Props) {
  const router = useRouter();

  // Set of selected Tag IDs.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Set of expanded group names.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [presets, setPresets] = useState<PresetItem[]>(initialPresets);
  const [saveName, setSaveName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------

  function isGroupFullySelected(group: TopicGroup) {
    return group.allTagIds.every((id) => selected.has(id));
  }

  function isGroupPartiallySelected(group: TopicGroup) {
    return !isGroupFullySelected(group) && group.allTagIds.some((id) => selected.has(id));
  }

  function toggleGroup(group: TopicGroup) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isGroupFullySelected(group)) {
        group.allTagIds.forEach((id) => next.delete(id));
      } else {
        group.allTagIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleSubTopic(tagId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(tagId) ? next.delete(tagId) : next.add(tagId);
      return next;
    });
  }

  function toggleExpanded(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function loadPreset(preset: PresetItem) {
    setSelected(new Set(preset.tagIds));
    setError(null);
  }

  function startSession() {
    const ids = [...selected];
    router.push(ids.length > 0 ? `/study?tagIds=${ids.join(",")}` : "/study");
  }

  // ---------------------------------------------------------------------------
  // Summary label for the start button
  // ---------------------------------------------------------------------------

  const selectedGroupCount = groups.filter((g) =>
    g.allTagIds.some((id) => selected.has(id)),
  ).length;

  const startLabel =
    selected.size === 0
      ? "Study all cards →"
      : `Study ${selectedGroupCount} topic${selectedGroupCount === 1 ? "" : "s"} →`;

  // ---------------------------------------------------------------------------
  // Server action wrappers
  // ---------------------------------------------------------------------------

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await createPreset(saveName, [...selected]);
      if (!res.ok) { setError(res.error); return; }
      setPresets((prev) => [
        ...prev,
        { id: res.id, name: saveName.trim(), tagIds: [...selected], isShared: false, isOwn: true },
      ]);
      setSaveName("");
      setShowSaveForm(false);
    });
  }

  function handleDelete(presetId: string) {
    startTransition(async () => {
      const res = await deletePreset(presetId);
      if (!res.ok) { setError(res.error); return; }
      setPresets((prev) => prev.filter((p) => p.id !== presetId));
    });
  }

  function handleToggleShared(presetId: string, current: boolean) {
    startTransition(async () => {
      const res = await setPresetShared(presetId, !current);
      if (!res.ok) { setError(res.error); return; }
      setPresets((prev) =>
        prev.map((p) => (p.id === presetId ? { ...p, isShared: !current } : p)),
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const ownPresets = presets.filter((p) => p.isOwn);
  const sharedPresets = presets.filter((p) => !p.isOwn);

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Saved presets */}
      {presets.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Saved presets
          </h2>
          <div className="flex flex-col gap-1.5">
            {ownPresets.map((p) => (
              <PresetRow
                key={p.id}
                preset={p}
                canShare={canShare}
                isPending={isPending}
                onLoad={loadPreset}
                onDelete={handleDelete}
                onToggleShared={handleToggleShared}
              />
            ))}
            {sharedPresets.length > 0 && (
              <>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Shared by others
                </p>
                {sharedPresets.map((p) => (
                  <PresetRow
                    key={p.id}
                    preset={p}
                    canShare={false}
                    isPending={isPending}
                    onLoad={loadPreset}
                    onDelete={handleDelete}
                    onToggleShared={handleToggleShared}
                  />
                ))}
              </>
            )}
          </div>
        </section>
      )}

      {/* Topic groups */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Choose topics
        </h2>

        {groups.length === 0 ? (
          <p className="text-sm text-slate-400">No topics found in your deck.</p>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {groups.map((group) => {
              const fullyChecked = isGroupFullySelected(group);
              const partial = isGroupPartiallySelected(group);
              const isOpen = expanded.has(group.name);

              return (
                <div key={group.name}>
                  {/* Group header row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Checkbox — select all in group */}
                    <input
                      type="checkbox"
                      checked={fullyChecked}
                      ref={(el) => { if (el) el.indeterminate = partial; }}
                      onChange={() => toggleGroup(group)}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded accent-slate-950"
                    />

                    {/* Group name + card count */}
                    <button
                      onClick={() => toggleGroup(group)}
                      className="min-w-0 flex-1 text-left text-sm font-medium text-slate-800"
                    >
                      {group.name}
                    </button>

                    <span className="shrink-0 text-xs text-slate-400">
                      ~{group.totalCards} cards
                    </span>

                    {/* Expand toggle — only show if there are sub-topics */}
                    {group.subTopics.length > 0 && (
                      <button
                        onClick={() => toggleExpanded(group.name)}
                        className="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label={isOpen ? "Collapse" : "Expand sub-topics"}
                      >
                        {isOpen ? "▲" : "▼"}
                      </button>
                    )}
                  </div>

                  {/* Sub-topics */}
                  {isOpen && group.subTopics.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50 px-4 pb-2 pt-1">
                      <div className="grid gap-1 sm:grid-cols-2">
                        {group.subTopics.map((sub) => (
                          <label
                            key={sub.id}
                            className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-slate-100"
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(sub.id)}
                              onChange={() => toggleSubTopic(sub.id)}
                              className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded accent-slate-950"
                            />
                            <span className="min-w-0 flex-1 text-xs text-slate-700">
                              {sub.label}
                            </span>
                            <span className="shrink-0 text-xs text-slate-400">
                              {sub.cardCount}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-3 text-sm text-slate-500">
          {selected.size === 0
            ? "Nothing selected — all cards will be used."
            : `${selected.size} topic/tag filter${selected.size === 1 ? "" : "s"} active.`}
        </p>
      </section>

      {/* Save as preset */}
      {showSaveForm ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Preset name…"
            maxLength={80}
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim() || isPending}
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            Save
          </button>
          <button
            onClick={() => { setShowSaveForm(false); setSaveName(""); }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSaveForm(true)}
          className="self-start text-sm font-medium text-sky-600 hover:text-sky-800"
        >
          + Save as preset
        </button>
      )}

      {/* Start button */}
      <div className="flex gap-3">
        <button
          onClick={startSession}
          className="rounded-md bg-slate-950 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          {startLabel}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PresetRow
// ---------------------------------------------------------------------------

type PresetRowProps = {
  preset: PresetItem;
  canShare: boolean;
  isPending: boolean;
  onLoad: (p: PresetItem) => void;
  onDelete: (id: string) => void;
  onToggleShared: (id: string, current: boolean) => void;
};

function PresetRow({ preset, canShare, isPending, onLoad, onDelete, onToggleShared }: PresetRowProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <button
        onClick={() => onLoad(preset)}
        className="min-w-0 flex-1 text-left text-sm font-medium text-slate-700 hover:text-slate-950"
      >
        {preset.name}
        {preset.isShared && (
          <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
            shared
          </span>
        )}
      </button>
      <span className="shrink-0 text-xs text-slate-400">
        {preset.tagIds.length === 0 ? "all cards" : `${preset.tagIds.length} filter${preset.tagIds.length === 1 ? "" : "s"}`}
      </span>
      {canShare && preset.isOwn && (
        <button
          onClick={() => onToggleShared(preset.id, preset.isShared)}
          disabled={isPending}
          title={preset.isShared ? "Stop sharing" : "Share with all users"}
          className="shrink-0 rounded px-2 py-1 text-xs text-slate-400 hover:text-violet-600 disabled:opacity-40"
        >
          {preset.isShared ? "unshare" : "share"}
        </button>
      )}
      {preset.isOwn && (
        <button
          onClick={() => onDelete(preset.id)}
          disabled={isPending}
          title="Delete preset"
          className="shrink-0 rounded px-2 py-1 text-xs text-slate-400 hover:text-red-600 disabled:opacity-40"
        >
          ✕
        </button>
      )}
    </div>
  );
}
