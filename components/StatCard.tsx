export default function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card group">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p className="font-display text-3xl font-bold text-black">
            {value}
          </p>
          {hint && (
            <p className="mt-2 text-xs text-gray-500">
              {hint}
            </p>
          )}
        </div>

        {/* Ikon kecil di kanan (opsional, visual saja) */}
        <div className="rounded-lg bg-blue-50 p-2 text-blue-600 transition group-hover:scale-105 group-hover:bg-blue-100">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20v-6M12 10V4M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
          </svg>
        </div>
      </div>
    </div>
  );
}