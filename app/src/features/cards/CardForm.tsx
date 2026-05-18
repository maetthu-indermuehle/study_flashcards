"use client";

/**
 * CardForm handles both create and edit flows.
 *
 * In edit mode, pass `card` with existing data. In create mode, omit it.
 *
 * The `onSave` prop is optional. If provided, it is called instead of the
 * default Server Action redirect — useful when CardForm is embedded inside
 * the FlaggedQueue step-through.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  CardDetail,
  CardFormChoice,
  CardFormData,
  CardFormReference,
  CardType,
  CardDifficulty,
  CardStatus,
  TagOption,
  TagType,
  CardDetailTag,
} from "@/lib/cards/types";
import { createCard, updateCard } from "@/lib/cards/actions";
import ChoiceEditor from "./ChoiceEditor";
import TagSelector from "./TagSelector";

type Props = {
  /** Existing card data for edit mode. Omit for create mode. */
  card?: CardDetail;
  /** Available tags from DB (for TagSelector). */
  tags: TagOption[];
  /**
   * If provided, called with the form data instead of running the default
   * Server Action. Used by FlaggedQueue to inject custom save behaviour.
   */
  onSave?: (data: CardFormData) => Promise<{ success: boolean; error?: string }>;
};

function refFromCard(card?: CardDetail): CardFormReference | null {
  const ref = card?.references[0];
  if (!ref) return null;
  return {
    id: ref.id,
    label: ref.label,
    url: ref.url ?? "",
    documentName: ref.documentName ?? "",
    page: ref.page != null ? String(ref.page) : "",
    section: ref.section ?? "",
    notes: ref.notes ?? "",
  };
}

export default function CardForm({ card, tags, onSave }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<CardType>(card?.type ?? "MULTIPLE_CHOICE");
  const [question, setQuestion] = useState(card?.question ?? "");
  const [answer, setAnswer] = useState(card?.answer ?? "");
  const [explanation, setExplanation] = useState(card?.explanation ?? "");
  const [difficulty, setDifficulty] = useState<CardDifficulty>(
    card?.difficulty ?? "MEDIUM",
  );
  const [status, setStatus] = useState<CardStatus>(card?.status ?? "DRAFT");
  const [choices, setChoices] = useState<CardFormChoice[]>(
    card?.choices ?? [],
  );
  const [selectedTags, setSelectedTags] = useState<CardDetailTag[]>(
    card?.tags ?? [],
  );
  const [newTags, setNewTags] = useState<{ name: string; type: TagType }[]>([]);
  const [refOpen, setRefOpen] = useState(!!refFromCard(card));
  const [reference, setReference] = useState<CardFormReference | null>(
    refFromCard(card),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function buildFormData(): CardFormData {
    return {
      type,
      question,
      answer,
      explanation,
      difficulty,
      status,
      choices,
      tagIds: selectedTags.map((t) => t.id),
      newTags,
      reference: refOpen ? reference : null,
    };
  }

  function validate(): string | null {
    if (!question.trim()) return "Question is required.";
    if (!answer.trim()) return "Answer is required.";
    if (type === "MULTIPLE_CHOICE") {
      if (choices.length < 2) return "Add at least 2 choices.";
      if (!choices.some((c) => c.isCorrect)) return "Mark at least one choice as correct.";
      if (choices.some((c) => !c.text.trim())) return "All choices must have text.";
    }
    return null;
  }

  function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    const data = buildFormData();

    startTransition(async () => {
      if (onSave) {
        const result = await onSave(data);
        if (!result.success) {
          setError(result.error ?? "Save failed.");
        } else {
          setSaved(true);
        }
        return;
      }

      if (card) {
        const result = await updateCard(card.id, data);
        if (!result.success) {
          setError(result.error ?? "Save failed.");
        } else {
          setSaved(true);
          router.refresh();
        }
      } else {
        // createCard redirects on success — no return value to handle.
        await createCard(data);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Type */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Card type
        </label>
        <div className="flex gap-3">
          {(["MULTIPLE_CHOICE", "OPEN_ANSWER"] as CardType[]).map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => {
                  setType(t);
                  if (t === "OPEN_ANSWER") setChoices([]);
                }}
                className="accent-sky-600"
              />
              {t === "MULTIPLE_CHOICE" ? "Multiple choice" : "Open answer"}
            </label>
          ))}
        </div>
      </div>

      {/* Question */}
      <Field label="Question" required>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
          placeholder="Enter the question text…"
        />
        <p className="mt-1 text-xs text-slate-400">
          Images: <code>![alt](assets/FILENAME.png)</code>
        </p>
      </Field>

      {/* Choices (MC only) */}
      {type === "MULTIPLE_CHOICE" && (
        <ChoiceEditor choices={choices} onChange={setChoices} />
      )}

      {/* Answer */}
      <Field
        label={
          type === "MULTIPLE_CHOICE"
            ? "Canonical answer (shown after reveal)"
            : "Answer"
        }
        required
      >
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={type === "MULTIPLE_CHOICE" ? 2 : 4}
          className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
          placeholder="Enter the answer…"
        />
      </Field>

      {/* Explanation */}
      <Field label="Explanation (optional)">
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
          placeholder="Optional explanation shown after the answer…"
        />
      </Field>

      {/* Difficulty + Status */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Difficulty">
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as CardDifficulty)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </Field>
        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CardStatus)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </Field>
      </div>

      {/* Tags */}
      <TagSelector
        selected={selectedTags}
        available={tags}
        newTags={newTags}
        onAddExisting={(tag) => {
          if (!selectedTags.find((t) => t.id === tag.id)) {
            setSelectedTags([...selectedTags, tag]);
          }
        }}
        onRemove={(tagId) =>
          setSelectedTags(selectedTags.filter((t) => t.id !== tagId))
        }
        onAddNew={(tag) => setNewTags([...newTags, tag])}
        onRemoveNew={(i) => setNewTags(newTags.filter((_, idx) => idx !== i))}
      />

      {/* Source reference */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            Source reference
          </span>
          <button
            type="button"
            onClick={() => {
              setRefOpen((o) => !o);
              if (!refOpen && !reference) {
                setReference({
                  label: "",
                  url: "",
                  documentName: "",
                  page: "",
                  section: "",
                  notes: "",
                });
              }
            }}
            className="text-sm text-sky-600 hover:underline"
          >
            {refOpen ? "Hide" : reference ? "Edit" : "Add"}
          </button>
        </div>
        {refOpen && reference && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">
                Label *
              </label>
              <input
                type="text"
                value={reference.label}
                onChange={(e) =>
                  setReference({ ...reference, label: e.target.value })
                }
                placeholder="e.g. TC AIM — MET 3.3"
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">URL</label>
              <input
                type="url"
                value={reference.url}
                onChange={(e) =>
                  setReference({ ...reference, url: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Document name
              </label>
              <input
                type="text"
                value={reference.documentName}
                onChange={(e) =>
                  setReference({ ...reference, documentName: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Page</label>
              <input
                type="number"
                value={reference.page}
                onChange={(e) =>
                  setReference({ ...reference, page: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Section
              </label>
              <input
                type="text"
                value={reference.section}
                onChange={(e) =>
                  setReference({ ...reference, section: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Saved confirmation */}
      {saved && !error && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved.
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-md bg-slate-950 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Saving…" : card ? "Save changes" : "Create card"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
