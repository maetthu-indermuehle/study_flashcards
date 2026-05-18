import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import ChangePasswordForm from "@/features/profile/ChangePasswordForm";

export const metadata: Metadata = {
  title: "Profile — PPL Flashcards",
};

export default async function ProfilePage() {
  const session = await readSessionCookie();
  if (!session) redirect("/login");

  return (
    <main className="min-h-dvh bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              ← Home
            </Link>
            <h1 className="text-xl font-semibold text-slate-950">Profile</h1>
          </div>
          <span className="text-sm text-slate-500">{session.email}</span>
        </header>

        <div className="max-w-md">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Change password
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
