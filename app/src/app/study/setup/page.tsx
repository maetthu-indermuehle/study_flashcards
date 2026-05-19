import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { listSubjectGroups, listPresets } from "@/lib/study/preset-queries";
import StudySetup from "@/features/study/StudySetup";
import HamburgerMenu from "@/features/nav/HamburgerMenu";
import { hasRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Study setup — PPL Flashcards",
};

export default async function StudySetupPage() {
  const session = await readSessionCookie();
  if (!session) redirect("/login");

  const [subjectGroups, presets] = await Promise.all([
    listSubjectGroups(session.userId),
    listPresets(session.userId),
  ]);

  const canShare = hasRole(session.role, "EDITOR");

  return (
    <main className="min-h-dvh bg-stone-50 dark:bg-slate-900 text-slate-950 dark:text-slate-100">
      <div className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8">
        <header className="mb-8 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <h1 className="text-xl font-semibold text-slate-950 dark:text-slate-100">Study setup</h1>
          <HamburgerMenu role={session.role} email={session.email} />
        </header>

        <StudySetup subjectGroups={subjectGroups} presets={presets} canShare={canShare} />
      </div>
    </main>
  );
}
