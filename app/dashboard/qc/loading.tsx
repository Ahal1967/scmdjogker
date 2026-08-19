/* Skeleton loading khusus halaman QC -- QcTable.tsx merender DUA tabel
   terpisah (Antrian QC + Riwayat Pemeriksaan), jadi skeleton nya meniru
   dua blok tabel yang ditumpuk, bukan satu tabel saja. */
export default function QcLoading() {
  return (
    <div className="space-y-4 md:space-y-6 animate-pulse" aria-hidden="true">
      <div className="card w-full max-w-[420px] rounded-[20px] px-5 py-4 md:px-7 md:py-5">
        <div className="h-4 w-24 rounded-full bg-gray-200 dark:bg-[#171717]" />
        <div className="mt-3 h-5 w-40 rounded bg-gray-200 dark:bg-[#171717]" />
        <div className="mt-2 h-3 w-56 rounded bg-gray-200 dark:bg-[#171717]" />
      </div>

      {/* Antrian QC */}
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-[#171717]" />
        <div className="card p-0 overflow-hidden">
          <div className="h-10 border-b border-gray-100 dark:border-[#262626]" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 border-b border-gray-100 dark:border-[#1a1a1a] last:border-0" />
          ))}
        </div>
      </div>

      {/* Riwayat Pemeriksaan */}
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-gray-200 dark:bg-[#171717]" />
        <div className="card p-0 overflow-hidden">
          <div className="h-10 border-b border-gray-100 dark:border-[#262626]" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 border-b border-gray-100 dark:border-[#1a1a1a] last:border-0" />
          ))}
        </div>
      </div>
    </div>
  );
}
