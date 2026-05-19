"use client";

/**
 * ImportWizard — manages the three-step import flow.
 *
 *   upload → preview → done
 *
 * The raw JSON string is held in state between steps so the same text is
 * used for both the dry run and the actual import (no re-upload needed).
 */

import { useState } from "react";
import Link from "next/link";
import FileUpload from "./FileUpload";
import ImportPreview from "./ImportPreview";
import { dryRunImport, runImport } from "@/lib/import/actions";
import type { DryRunResult, RunResult } from "@/lib/import/actions";

type Step = "upload" | "preview" | "done";

export default function ImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [json, setJson] = useState("");
  const [preview, setPreview] = useState<Extract<DryRunResult, { ok: true }> | null>(null);
  const [result, setResult] = useState<Extract<RunResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload(rawJson: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await dryRunImport(rawJson);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setJson(rawJson);
      setPreview(res);
      setStep("preview");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      const res = await runImport(json);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res);
      setStep("done");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setError(null);
    setPreview(null);
    setStep("upload");
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2 text-sm">
        {(["upload", "preview", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 bg-slate-200 dark:bg-slate-700" />}
            <span
              className={`rounded-full px-3 py-1 font-medium ${
                step === s
                  ? "bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-900"
                  : i < ["upload", "preview", "done"].indexOf(step)
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
              }`}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Step content */}
      {step === "upload" && (
        <FileUpload onSubmit={handleUpload} loading={loading} />
      )}

      {step === "preview" && preview && (
        <ImportPreview
          result={preview}
          onConfirm={handleConfirm}
          onBack={handleBack}
          loading={loading}
        />
      )}

      {step === "done" && result && (
        <div className="flex flex-col items-center gap-6 py-8 text-center">
          <div className="text-5xl">✓</div>
          <div>
            <h2 className="mb-1 text-2xl font-semibold text-slate-950 dark:text-slate-100">
              Import complete
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              {result.created} created, {result.updated} updated
              {" "}in <span className="font-medium text-slate-700 dark:text-slate-300">{result.deckName}</span>
            </p>
          </div>
          {result.warnings.length > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {result.warnings.length} warning{result.warnings.length > 1 ? "s" : ""} —
              some cards are missing source references.
            </p>
          )}
          <div className="flex gap-3">
            <Link
              href="/cards"
              className="rounded-md bg-slate-950 dark:bg-slate-100 px-5 py-2 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
            >
              Browse cards
            </Link>
            <button
              onClick={() => {
                setStep("upload");
                setJson("");
                setPreview(null);
                setResult(null);
                setError(null);
              }}
              className="rounded-md border border-slate-300 dark:border-slate-600 px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
