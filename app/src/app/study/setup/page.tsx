import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import { listSubjectGroups, listPresets } from "@/lib/study/preset-queries";
import StudySetup from "@/features/study/StudySetup";
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
    <main className="min-h-dvh bg-stone-50 text-slate-950">
      <div className="mx-auto w-full max-w-2xl px-5 py-6 sm:px-8">
        <header className="mb-8 flex items-center gap-4 border-b border-slate-200 pb-4">
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Home
          </Link>
          <h1 className="text-xl font-semibold text-slate-950">Study setup</h1>
        </header>

        <StudySetup subjectGroups={subjectGroups} presets={presets} canShare={canShare} />
      </div>
    </main>
  );
}
