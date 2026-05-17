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
    <main className="min-h-dvh bg-stone-50">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-4 py-6 text-center">
        <p className="mb-2 text-lg font-semibold text-slate-950">
          Something went wrong
        </p>
        <p className="mb-6 text-sm text-slate-500">
          {error.message ?? "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
