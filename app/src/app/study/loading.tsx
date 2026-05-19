/** Skeleton shown while the RSC payload for the next card is loading. */
export default function StudyLoading() {
  return (
    <main className="min-h-dvh bg-stone-50 dark:bg-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-4">
        <header className="mb-4 flex items-center justify-between">
          <div className="h-4 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </header>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <div className="mb-4 h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-2">
            <div className="h-5 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-3/5 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    </main>
  );
}
