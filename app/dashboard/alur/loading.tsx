/* Skeleton loading khusus halaman Alur Kerja -- halaman ini TIDAK punya
   tabel, melainkan 9 kartu tahapan (grid berkelok di desktop, tumpuk
   vertikal di mobile/tablet -- lihat page.tsx), jadi skeleton nya meniru
   bentuk kartu dalam grid 3 kolom sederhana tanpa panah, cukup untuk
   mendekati ukuran layout final tanpa perlu meniru pola zigzag-nya. */
export default function AlurLoading() {
  return (
    <div className="space-y-4 md:space-y-6 animate-pulse" aria-hidden="true">
      <div className="card w-full max-w-[420px] rounded-[20px] px-5 py-4 md:px-7 md:py-5">
        <div className="h-4 w-24 rounded-full bg-gray-200 dark:bg-[#171717]" />
        <div className="mt-3 h-5 w-40 rounded bg-gray-200 dark:bg-[#171717]" />
        <div className="mt-2 h-3 w-56 rounded bg-gray-200 dark:bg-[#171717]" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="card space-y-3 p-5">
            <div className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-[#171717]" />
            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-[#171717]" />
            <div className="h-3 w-40 rounded bg-gray-200 dark:bg-[#171717]" />
            <div className="h-6 w-16 rounded bg-gray-200 dark:bg-[#171717]" />
          </div>
        ))}
      </div>
    </div>
  );
}
