"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

// Error boundary khusus segmen /dashboard/** -- Next.js otomatis render ini
// menggantikan konten halaman (BUKAN seluruh layout; sidebar dari
// dashboard/layout.tsx tetap tampil normal di sekelilingnya) kalau ada
// error yang tidak ketangkap saat render salah satu halaman dashboard.
// Sebelumnya TIDAK ADA sama sekali -- default Next.js kalau file ini tidak
// ada adalah layar putih polos dengan stack trace teknis (di production
// malah cuma "Application error" tanpa tombol apa pun), yang buat user
// non-teknis kelihatan seperti aplikasi rusak total tanpa jalan keluar.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
        <AlertTriangle size={30} className="text-red-600 dark:text-red-400" strokeWidth={1.8} />
      </div>
      <div>
        <p className="font-display text-lg font-bold text-black dark:text-white">
          Halaman ini gagal dimuat
        </p>
        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Ada masalah saat menampilkan data. Coba muat ulang -- kalau masih
          terjadi, kemungkinan ada masalah koneksi ke server.
        </p>
      </div>
      <button
        onClick={reset}
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
      >
        <RotateCcw size={15} />
        Coba lagi
      </button>
    </div>
  );
}
