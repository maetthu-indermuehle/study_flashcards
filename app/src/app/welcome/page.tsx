import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";

export const metadata: Metadata = {
  title: "Welcome — Flashcards",
};

/**
 * Welcome — shown to users who have never started a study session.
 * Later this becomes a proper onboarding / help page.
 */
export default async function WelcomePage() {
  const session = await readSessionCookie();
  if (!session) redirect("/login");

  return (
    <main className="min-h-dvh bg-stone-50">
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 pb-12 text-center safe-bottom">
        <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">
          Flashcards
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Ready to study?
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-500">
          Pick the topics you want to focus on, save them as a preset, and the app will jump straight
          back in next time you open it.
        </p>

        <div className="mt-10">
          <Link
            href="/study/setup"
            className="inline-flex h-11 items-center rounded-md bg-slate-950 px-7 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Choose topics →
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          Logged in as {session.email}
        </p>
      </div>
    </main>
  );
}
