/* Skeleton loading khusus halaman Laporan Pesanan (header + toolbar +
   tabel) -- lihat komentar di gudang/loading.tsx untuk alasan kenapa
   tiap halaman dashboard punya skeleton sendiri, bukan cuma pakai yang
   generik di app/dashboard/loading.tsx.
   Sempat ada blok skeleton 4 kartu ringkasan finansial di sini, tapi
   analisis KPI itu sudah dipindah SELURUHNYA ke Dashboard (lihat
   komentar di laporan/page.tsx) -- halaman ini sekarang murni tabel +
   export, jadi blok kartu itu sudah tidak match apa pun dan dihapus. */
export default function LaporanLoading() {
  return (
    <div className="space-y-4 md:space-y-6 animate-pulse" aria-hidden="true">
      <div className="card w-full max-w-[420px] rounded-[20px] px-5 py-4 md:px-7 md:py-5">
        <div className="h-4 w-24 rounded-full bg-gray-200 dark:bg-[#21262d]" />
        <div className="mt-3 h-5 w-40 rounded bg-gray-200 dark:bg-[#21262d]" />
        <div className="mt-2 h-3 w-56 rounded bg-gray-200 dark:bg-[#21262d]" />
      </div>

      {/* Tombol Export skeleton dipindah ke sini, sejajar kolom cari --
          mengikuti posisi barunya di LaporanTable.tsx (dulu sejajar
          header). */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="h-11 w-full max-w-md rounded-full bg-gray-200 dark:bg-[#21262d]" />
        <div className="h-9 w-28 rounded-full bg-gray-200 dark:bg-[#21262d]" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="h-10 border-b border-gray-100 dark:border-[#30363d]" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-gray-100 dark:border-[#21262d] last:border-0" />
        ))}
      </div>
    </div>
  );
}
