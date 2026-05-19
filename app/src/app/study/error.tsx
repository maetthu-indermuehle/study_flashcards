"use client";

/** Error boundary for the study route. */
export default function StudyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-dvh bg-stone-50 dark:bg-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 py-6 text-center">
        <p className="mb-2 text-lg font-semibold text-slate-950 dark:text-slate-100">
          Something went wrong
        </p>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {error.message ?? "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-slate-950 dark:bg-slate-100 px-5 py-2.5 text-sm font-medium text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-slate-200"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
