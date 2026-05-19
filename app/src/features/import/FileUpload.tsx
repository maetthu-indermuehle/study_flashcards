"use client";

/**
 * FileUpload — step 1 of the import wizard.
 *
 * Accepts a .json file via the file picker OR raw JSON pasted into the
 * textarea. Reads the file on the client before submitting so the user gets
 * instant feedback on file size and can see the raw text if they want.
 *
 * Calls `onSubmit(jsonString)` when the user clicks "Preview import".
 */

import { useState, useRef } from "react";

type Props = {
  onSubmit: (json: string) => void;
  loading: boolean;
};

export default function FileUpload({ onSubmit, loading }: Props) {
  const [json, setJson] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setFileError("Only .json files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError("File is too large (max 5 MB).");
      return;
    }

    setFileError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setJson((ev.target?.result as string) ?? "");
    };
    reader.readAsText(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (json.trim()) onSubmit(json.trim());
  }

  const cardCount = (() => {
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed.length : null;
    } catch {
      return null;
    }
  })();

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* File picker */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Upload a JSON file
        </label>
        <div
          className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-5 hover:bg-slate-100 dark:hover:bg-slate-700"
          onClick={() => fileRef.current?.click()}
        >
          <span className="text-2xl">📂</span>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {fileName ?? "Click to choose a .json file"}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Max 5 MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFile}
            className="hidden"
          />
        </div>
        {fileError && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fileError}</p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
        <span className="text-xs text-slate-400 dark:text-slate-500">or paste JSON</span>
        <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
      </div>

      {/* Textarea */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Paste JSON directly
        </label>
        <textarea
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setFileName(null);
          }}
          rows={8}
          placeholder={'[\n  {\n    "id": "Q001",\n    "type": "multiple_choice",\n    ...\n  }\n]'}
          className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs text-slate-800 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none"
        />
      </div>

      {/* Card count preview */}
      {json.trim() && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {cardCount !== null
            ? `${cardCount} card${cardCount === 1 ? "" : "s"} detected`
            : "Not a valid JSON array"}
        </p>
      )}

      <button
        type="submit"
        disabled={!json.trim() || loading}
        className="rounded-md bg-slate-950 dark:bg-slate-100 px-5 py-2.5 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-40"
      >
        {loading ? "Validating…" : "Preview import →"}
      </button>
    </form>
  );
}
