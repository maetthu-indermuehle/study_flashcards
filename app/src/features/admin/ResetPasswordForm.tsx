"use client";

import { useState } from "react";
import { resetPassword } from "@/lib/users/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

type Props = { userId: string };

export default function ResetPasswordForm({ userId }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const result = await resetPassword(userId, newPassword);
      if (!result.success) {
        setError(result.error);
      } else {
        setSaved(true);
        setNewPassword("");
        setConfirm("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          New password{" "}
          <span className="font-normal text-slate-400 dark:text-slate-500">
            (min {MIN_PASSWORD_LENGTH} chars)
          </span>
        </span>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
          className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm password</span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={MIN_PASSWORD_LENGTH}
          className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none"
        />
      </label>

      {error && (
        <p className="rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
      {saved && (
        <p className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Password reset. The user will need to log in again.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/35 disabled:opacity-50"
      >
        {saving ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
