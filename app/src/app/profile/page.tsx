import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import ChangePasswordForm from "@/features/profile/ChangePasswordForm";
import HamburgerMenu from "@/features/nav/HamburgerMenu";

export const metadata: Metadata = {
  title: "Profile — PPL Flashcards",
};

export default async function ProfilePage() {
  const session = await readSessionCookie();
  if (!session) redirect("/login");

  return (
    <main className="min-h-dvh bg-stone-50 dark:bg-slate-900 text-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <h1 className="text-xl font-semibold text-slate-950 dark:text-slate-100">Profile</h1>
          <HamburgerMenu role={session.role} email={session.email} />
        </header>

        <div className="max-w-md">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Change password
          </h2>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
