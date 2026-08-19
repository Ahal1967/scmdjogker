/* Skeleton loading khusus halaman Laporan Pesanan (header + 4 kartu
   ringkasan + tabel) -- lihat komentar di gudang/loading.tsx untuk alasan
   kenapa tiap halaman dashboard punya skeleton sendiri, bukan cuma pakai
   yang generik di app/dashboard/loading.tsx. */
export default function LaporanLoading() {
  return (
    <div className="space-y-4 md:space-y-6 animate-pulse" aria-hidden="true">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="card w-full max-w-[420px] rounded-[20px] px-5 py-4 md:px-7 md:py-5">
          <div className="h-4 w-24 rounded-full bg-gray-200 dark:bg-[#171717]" />
          <div className="mt-3 h-5 w-40 rounded bg-gray-200 dark:bg-[#171717]" />
          <div className="mt-2 h-3 w-56 rounded bg-gray-200 dark:bg-[#171717]" />
        </div>
        <div className="h-9 w-40 rounded-lg bg-gray-200 dark:bg-[#171717]" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-[#262626] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3">
              <div className="h-5 w-16 rounded bg-gray-200 dark:bg-[#171717]" />
              <div className="mt-2 h-3 w-20 rounded bg-gray-200 dark:bg-[#171717]" />
            </div>
          ))}
        </div>
      </div>

      <div className="h-11 w-full max-w-md rounded-full bg-gray-200 dark:bg-[#171717]" />

      <div className="card p-0 overflow-hidden">
        <div className="h-10 border-b border-gray-100 dark:border-[#262626]" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-gray-100 dark:border-[#1a1a1a] last:border-0" />
        ))}
      </div>
    </div>
  );
}
