/* Skeleton loading khusus halaman Retur (header + 4 kartu ringkasan +
   tabel) -- lihat komentar di gudang/loading.tsx untuk alasan pola ini
   dipakai (bukan skeleton generik). Grid 4 kartu (bukan 3 seperti Gudang/
   Supplier) karena ReturPage punya 4 kartu ringkasan: Total, Diajukan,
   Diproses, Selesai/Ditolak. */
export default function ReturLoading() {
  return (
    <div className="space-y-4 md:space-y-6 animate-pulse" aria-hidden="true">
      <div className="card w-full max-w-[420px] rounded-[20px] px-5 py-4 md:px-7 md:py-5">
        <div className="h-4 w-24 rounded-full bg-gray-200 dark:bg-[#21262d]" />
        <div className="mt-3 h-5 w-40 rounded bg-gray-200 dark:bg-[#21262d]" />
        <div className="mt-2 h-3 w-56 rounded bg-gray-200 dark:bg-[#21262d]" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-16" />
        ))}
      </div>

      <div className="h-11 w-full max-w-md rounded-full bg-gray-200 dark:bg-[#21262d]" />

      <div className="card p-0 overflow-hidden">
        <div className="h-10 border-b border-gray-100 dark:border-[#30363d]" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-gray-100 dark:border-[#21262d] last:border-0" />
        ))}
      </div>
    </div>
  );
}
