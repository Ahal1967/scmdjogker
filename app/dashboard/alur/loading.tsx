export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-56 rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-80 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="card space-y-3" style={{ border: "1px solid #e5e7eb" }}>
            <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-6 w-12 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
