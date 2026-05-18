import { redirect } from "next/navigation";
import Link from "next/link";
import { readSessionCookie } from "@/lib/session/cookies";
import { getDueCount } from "@/lib/study/get-next-card";
import LogoutButton from "./LogoutButton";

export default async function Home() {
  const session = await readSessionCookie();
  if (!session) {
    redirect("/login");
  }

  const dueCount = await getDueCount(session.userId);

  return (
    <main className="min-h-dvh bg-stone-50 text-slate-950">
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pt-6 pb-6 sm:px-8 lg:px-10 safe-bottom">
        <header className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-sky-700">
              Canadian PPL
            </p>
            <h1 className="text-xl font-semibold text-slate-950">
              PPL Flashcards
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">
              {session.email}
            </span>
            <Link
              href="/profile"
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Profile
            </Link>
            {session.role === "ADMIN" && (
              <Link
                href="/admin/users"
                className="rounded-md bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700 hover:bg-violet-200"
              >
                Admin
              </Link>
            )}
            <LogoutButton />
          </div>
        </header>

        <div className="grid flex-1 place-items-center py-12">
          <div className="w-full max-w-2xl">
            <p className="mb-3 text-sm font-medium text-sky-700">
              Study flow
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              926 cards ready to study.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">
              Multiple-choice and open-answer cards from the full Canadian PPL
              groundschool syllabus.
            </p>

            <dl className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <dt className="text-sm font-medium text-slate-500">Cards</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  926 published
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <dt className="text-sm font-medium text-slate-500">Types</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  MC + open answer
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <dt className="text-sm font-medium text-slate-500">
                  Selection
                </dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  Random
                </dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/study/setup"
                className="inline-flex h-11 items-center rounded-md bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Start studying →
              </Link>
              {dueCount > 0 && (
                <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
                  {dueCount} due
                </span>
              )}
              <Link
                href="/cards"
                className="inline-flex h-11 items-center rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Browse cards
              </Link>
              {(session.role === "EDITOR" || session.role === "ADMIN") && (
                <Link
                  href="/import"
                  className="inline-flex h-11 items-center rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Import cards
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
