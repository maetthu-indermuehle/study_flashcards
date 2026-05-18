"use client";

import { useState } from "react";
import { changeOwnPassword } from "@/lib/users/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const result = await changeOwnPassword(current, next);
      if (!result.success) {
        setError(result.error);
      } else {
        setSaved(true);
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Current password</span>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">
          New password{" "}
          <span className="font-normal text-slate-400">
            (min {MIN_PASSWORD_LENGTH} chars)
          </span>
        </span>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700">Confirm new password</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
        />
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {saved && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Password changed. All other sessions have been signed out.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
