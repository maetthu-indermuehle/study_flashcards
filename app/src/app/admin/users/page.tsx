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
  USER: "bg-slate-100 text-slate-700",
  EDITOR: "bg-sky-100 text-sky-700",
  ADMIN: "bg-violet-100 text-violet-700",
};

export default async function UsersPage() {
  const users = await listUsers();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-950">Users</h1>
        <Link
          href="/admin/users/new"
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + New user
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        {users.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            No users found.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.displayName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLOURS[u.role] ?? ""}`}
                    >
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {u.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-sky-600 hover:underline"
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
