"use client";

import { useState } from "react";
import { deleteUser } from "@/lib/users/actions";

type Props = { userId: string; displayName: string };

export default function DeleteUserButton({ userId, displayName }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteUser(userId);
      if (!result.success) {
        setError(result.error);
        setConfirming(false);
      }
      // On success the server action redirects to /admin/users.
    } finally {
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Delete <strong>{displayName}</strong>? This cannot be undone.
        </p>
        {error && (
          <p className="rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-md border border-red-300 dark:border-red-700 bg-white dark:bg-transparent px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
    >
      Delete user
    </button>
  );
}
