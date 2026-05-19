import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { readSessionCookie } from "@/lib/session/cookies";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Log in — PPL Flashcards",
};

export default async function LoginPage() {
  // The proxy already redirects authenticated users away from /login, but the
  // server component check is the authoritative line of defence.
  const session = await readSessionCookie();
  if (session) {
    redirect("/");
  }

  return (
    <main className="min-h-dvh bg-stone-50 dark:bg-slate-900 text-slate-950 dark:text-slate-100">
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center px-5 py-6 sm:px-8 lg:px-10">
        <div className="w-full max-w-sm">
          <p className="mb-1 text-sm font-medium uppercase tracking-wide text-sky-700 dark:text-sky-400">
            Canadian PPL
          </p>
          <h1 className="mb-8 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
            PPL Flashcards
          </h1>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
