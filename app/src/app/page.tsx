import { redirect } from "next/navigation";
import { readSessionCookie } from "@/lib/session/cookies";
import LogoutButton from "./LogoutButton";

export default async function Home() {
  const session = await readSessionCookie();
  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-dvh bg-stone-50 text-slate-950">
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-6 sm:px-8 lg:px-10">
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
            <LogoutButton />
            <span className="rounded-md bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
              Phase 3
            </span>
          </div>
        </header>

        <div className="grid flex-1 place-items-center py-12">
          <div className="w-full max-w-2xl">
            <p className="mb-3 text-sm font-medium text-sky-700">
              Authentication
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              926 cards imported and ready.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-700">
              You&apos;re logged in. The next phase will add the mobile flashcard
              study flow.
            </p>

            <dl className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <dt className="text-sm font-medium text-slate-500">Stack</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  Next.js + TypeScript
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <dt className="text-sm font-medium text-slate-500">Database</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  PostgreSQL + Prisma
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <dt className="text-sm font-medium text-slate-500">
                  Deployment
                </dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  Docker/OpenShift ready
                </dd>
              </div>
            </dl>

            <a
              className="mt-8 inline-flex h-11 items-center rounded-md bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
              href="/api/health"
            >
              Check health endpoint
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
