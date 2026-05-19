import Link from "next/link";
import type { Metadata } from "next";
import { listUsers } from "@/lib/users/queries";

export const metadata: Metadata = {
  title: "Users — Admin — PPL Flashcards",
};

const ROLE_LABELS: Record<string, string> = {
  USER: "User",
  EDITOR: "Editor",
  ADMIN: "Admin",
};

const ROLE_COLOURS: Record<string, string> = {
  USER: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
  EDITOR: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
  ADMIN: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
};

export default async function UsersPage() {
  const users = await listUsers();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-950 dark:text-slate-100">Users</h1>
        <Link
          href="/admin/users/new"
          className="rounded-md bg-slate-950 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200"
        >
          + New user
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {users.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No users found.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {u.displayName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLOURS[u.role] ?? ""}`}
                    >
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {u.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
