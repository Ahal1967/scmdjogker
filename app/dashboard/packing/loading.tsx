export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-72 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="card overflow-hidden p-0" style={{ border: "1px solid var(--djoker-border)" }}>
        <div className="h-12 bg-gray-100 dark:bg-gray-700" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 border-t border-gray-100 dark:border-gray-700 flex items-center px-4 gap-4">
            <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
