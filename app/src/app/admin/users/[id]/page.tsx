import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/users/queries";
import { readSessionCookie } from "@/lib/session/cookies";
import UserForm from "@/features/admin/UserForm";
import ResetPasswordForm from "@/features/admin/ResetPasswordForm";
import DeleteUserButton from "@/features/admin/DeleteUserButton";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await getUser(id);
  return {
    title: user
      ? `${user.displayName} — Admin — PPL Flashcards`
      : "User — Admin — PPL Flashcards",
  };
}

export default async function EditUserPage({ params }: Props) {
  const { id } = await params;
  const [user, session] = await Promise.all([getUser(id), readSessionCookie()]);

  if (!user) notFound();

  const isSelf = session?.userId === user.id;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-950">
        Edit user: {user.displayName}
      </h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile & role */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Profile &amp; role
          </h2>
          <UserForm user={user} isSelf={isSelf} />
        </div>

        {/* Reset password */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Reset password
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Setting a new password will immediately sign this user out of all
            active sessions.
          </p>
          <ResetPasswordForm userId={user.id} />
        </div>
      </div>

      {/* Danger zone */}
      {!isSelf && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-600">
            Danger zone
          </h2>
          <p className="mb-4 text-sm text-slate-600">
            Permanently deletes this user account. This cannot be undone.
          </p>
          <DeleteUserButton userId={user.id} displayName={user.displayName} />
        </div>
      )}
    </div>
  );
}
