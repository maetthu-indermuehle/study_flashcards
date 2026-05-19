"use client";

/**
 * UserForm handles both creating a new user and editing an existing one.
 *
 * When `user` prop is absent, the form is in "create" mode and shows a
 * password field. When `user` is provided, the form is in "edit" mode and
 * the password is managed separately via ResetPasswordForm.
 *
 * `isSelf` disables the role selector to prevent an admin from demoting
 * themselves via the UI (the server action also enforces this).
 */

import { useState } from "react";
import { createUser, updateUser } from "@/lib/users/actions";
import type { UserDetail } from "@/lib/users/types";
import type { UserRole } from "@/lib/session/types";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

type Props = {
  user?: UserDetail;
  isSelf?: boolean;
};

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "USER", label: "User", description: "Study and flag cards" },
  { value: "EDITOR", label: "Editor", description: "User + create and edit cards" },
  { value: "ADMIN", label: "Admin", description: "Editor + manage users" },
];

export default function UserForm({ user, isSelf = false }: Props) {
  const isEdit = !!user;

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "USER");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      let result;
      if (isEdit) {
        result = await updateUser(user.id, { displayName, role });
      } else {
        result = await createUser({ email, displayName, password, role });
      }

      if (!result.success) {
        setError(result.error);
      } else if (isEdit) {
        setSaved(true);
      }
      // On create success, the server action redirects — no client handling needed.
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Display name */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Display name</span>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none"
        />
      </label>

      {/* Email (create only) */}
      {!isEdit && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none"
          />
        </label>
      )}

      {/* Password (create only) */}
      {!isEdit && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Password{" "}
            <span className="font-normal text-slate-400 dark:text-slate-500">
              (min {MIN_PASSWORD_LENGTH} chars)
            </span>
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-2 text-sm focus:border-sky-400 dark:focus:border-sky-500 focus:outline-none"
          />
        </label>
      )}

      {/* Role */}
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
          Role
          {isSelf && (
            <span className="ml-2 font-normal text-slate-400 dark:text-slate-500">
              (cannot change own role)
            </span>
          )}
        </legend>
        {ROLES.map((r) => (
          <label
            key={r.value}
            className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
              role === r.value
                ? "border-sky-400 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/20"
                : "border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
            } ${isSelf ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="role"
              value={r.value}
              checked={role === r.value}
              onChange={() => !isSelf && setRole(r.value)}
              disabled={isSelf}
              className="accent-sky-600"
            />
            <span>
              <strong className="text-slate-800 dark:text-slate-200">{r.label}</strong>
              <span className="ml-2 text-slate-500 dark:text-slate-400">{r.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {error && (
        <p className="rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      {saved && (
        <p className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Saved successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-slate-950 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50"
      >
        {saving ? "Saving…" : isEdit ? "Save changes" : "Create user"}
      </button>
    </form>
  );
}
