export default function Loading() {
  return (
    <div className="space-y-4 md:space-y-6 animate-pulse">
      <div>
        <div className="h-6 w-40 rounded-full bg-gray-200 dark:bg-gray-700 mb-3" />
        <div className="h-8 w-56 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="rounded-2xl border border-blue-100 dark:border-blue-900 p-6 md:p-8">
        <div className="h-4 w-24 rounded-full bg-gray-200 dark:bg-gray-700 mb-3" />
        <div className="h-6 w-64 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
        <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-28" style={{ border: "1px solid var(--djoker-border)" }} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card h-64" style={{ border: "1px solid var(--djoker-border)" }} />
        <div className="card h-64" style={{ border: "1px solid var(--djoker-border)" }} />
      </div>
    </div>
  );
}
