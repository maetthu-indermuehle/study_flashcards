"use client";

/**
 * StudySetup — topic picker for the /study/setup page.
 *
 * Hierarchy:
 *   Subject (deck)  ← only shown when the user has > 1 deck
 *     Topic group   ← collapsible; header selects/deselects all tags in group
 *       Sub-topic   ← individual tag checkbox
 *
 * When only one subject exists the subject row is hidden and the topic groups
 * are shown directly, preserving the existing single-subject UX.
 */

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPreset, deletePreset, setPresetShared, getDueCountForSelection } from "@/lib/study/preset-actions";
import type { SubjectGroup, TopicGroup, PresetItem } from "@/lib/study/preset-queries";

type Props = {
  subjectGroups: SubjectGroup[];
  presets: PresetItem[];
  canShare: boolean;
};

export default function StudySetup({ subjectGroups, presets: initialPresets, canShare }: Props) {
  const router = useRouter();

  /** Set of selected Tag IDs. */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /**
   * Set of expanded subject names.
   * When there is only one subject it starts expanded so topic groups are
   * immediately visible without an extra click.
   */
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    () => new Set(subjectGroups.length === 1 ? [subjectGroups[0].name] : []),
  );
  /** Set of expanded group names (within any subject). */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [presets, setPresets] = useState<PresetItem[]>(initialPresets);
  const [saveName, setSaveName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dueCount, setDueCount] = useState<number | null>(null);

  // Always show the subject level so the deck name is visible in the UI.
  const showSubjectLevel = subjectGroups.length >= 1;

  // Refresh due count whenever the selection changes.
  useEffect(() => {
    let cancelled = false;
    getDueCountForSelection([...selected]).then((n) => {
      if (!cancelled) setDueCount(n);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // ---------------------------------------------------------------------------
  // Selection helpers — subjects
  // ---------------------------------------------------------------------------

  function isSubjectFullySelected(subject: SubjectGroup) {
    return subject.allTagIds.length > 0 &&
      subject.allTagIds.every((id) => selected.has(id));
  }

  function isSubjectPartiallySelected(subject: SubjectGroup) {
    return !isSubjectFullySelected(subject) &&
      subject.allTagIds.some((id) => selected.has(id));
  }

  function toggleSubject(subject: SubjectGroup) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isSubjectFullySelected(subject)) {
        subject.allTagIds.forEach((id) => next.delete(id));
      } else {
        subject.allTagIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleExpandedSubject(name: string) {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Selection helpers — topic groups
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

  // ---------------------------------------------------------------------------
  // Preset helpers
  // ---------------------------------------------------------------------------

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

  const selectedGroupCount = subjectGroups
    .flatMap((s) => s.topicGroups)
    .filter((g) => g.allTagIds.some((id) => selected.has(id))).length;

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

      {/* Topic / subject chooser */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Choose topics
        </h2>

        {subjectGroups.length === 0 ? (
          <p className="text-sm text-slate-400">No topics found in your deck.</p>
        ) : (
          /* ----------------------------------------------------------------
           * Subject accordion: Subject → Topic group → Sub-topic
           * Subject starts expanded when only one deck exists.
           * -------------------------------------------------------------- */
          <div className="flex flex-col gap-3">
            {subjectGroups.map((subject) => {
              const subjectOpen = expandedSubjects.has(subject.name);
              const subjectFull = isSubjectFullySelected(subject);
              const subjectPartial = isSubjectPartiallySelected(subject);

              return (
                <div key={subject.deckId} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  {/* Subject header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
                    <input
                      type="checkbox"
                      checked={subjectFull}
                      ref={(el) => { if (el) el.indeterminate = subjectPartial; }}
                      onChange={() => toggleSubject(subject)}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded accent-slate-950"
                    />
                    <button
                      onClick={() => toggleSubject(subject)}
                      className="min-w-0 flex-1 text-left text-sm font-semibold text-slate-900"
                    >
                      {subject.name}
                    </button>
                    <span className="shrink-0 text-xs text-slate-400">
                      ~{subject.totalCards} cards
                    </span>
                    <button
                      onClick={() => toggleExpandedSubject(subject.name)}
                      className="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                      aria-label={subjectOpen ? "Collapse subject" : "Expand subject"}
                    >
                      {subjectOpen ? "▲" : "▼"}
                    </button>
                  </div>

                  {/* Topic groups within this subject */}
                  {subjectOpen && (
                    <div className="divide-y divide-slate-100">
                      <TopicGroupList
                        groups={subject.topicGroups}
                        selected={selected}
                        expanded={expanded}
                        isGroupFullySelected={isGroupFullySelected}
                        isGroupPartiallySelected={isGroupPartiallySelected}
                        toggleGroup={toggleGroup}
                        toggleSubTopic={toggleSubTopic}
                        toggleExpanded={toggleExpanded}
                        indent
                      />
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

      {/* Start buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={startSession}
          className="rounded-md bg-slate-950 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          {startLabel}
        </button>
        {dueCount !== null && dueCount > 0 && (
          <button
            onClick={() => {
              const ids = [...selected];
              const base = ids.length > 0 ? `tagIds=${ids.join(",")}&` : "";
              router.push(`/study?${base}dueOnly=1`);
            }}
            className="rounded-md border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Review due ({dueCount}) →
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TopicGroupList — renders the topic group rows (shared by both layouts)
// ---------------------------------------------------------------------------

type TopicGroupListProps = {
  groups: TopicGroup[];
  selected: Set<string>;
  expanded: Set<string>;
  isGroupFullySelected: (g: TopicGroup) => boolean;
  isGroupPartiallySelected: (g: TopicGroup) => boolean;
  toggleGroup: (g: TopicGroup) => void;
  toggleSubTopic: (id: string) => void;
  toggleExpanded: (name: string) => void;
  /** When true, indent the group rows slightly (used inside a subject accordion). */
  indent?: boolean;
};

function TopicGroupList({
  groups,
  selected,
  expanded,
  isGroupFullySelected,
  isGroupPartiallySelected,
  toggleGroup,
  toggleSubTopic,
  toggleExpanded,
  indent = false,
}: TopicGroupListProps) {
  return (
    <>
      {groups.map((group) => {
        const fullyChecked = isGroupFullySelected(group);
        const partial = isGroupPartiallySelected(group);
        const isOpen = expanded.has(group.name);

        return (
          <div key={group.name}>
            {/* Group header row */}
            <div className={`flex items-center gap-3 py-3 ${indent ? "pl-8 pr-4" : "px-4"}`}>
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
              <div className={`border-t border-slate-100 bg-slate-50 pb-2 pt-1 ${indent ? "pl-8 pr-4" : "px-4"}`}>
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
    </>
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
