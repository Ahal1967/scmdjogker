"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

// Error boundary ROOT -- menangkap error tak tertangani di mana pun yang
// TIDAK punya error.tsx lebih spesifik di bawahnya (halaman publik: login,
// tracking, upload). Segmen /dashboard/** sudah punya boundary sendiri
// (lihat app/dashboard/error.tsx) yang lebih pas karena sidebar-nya tetap
// tampil -- file ini cuma jadi jaring pengaman terakhir buat sisanya.
// Sebelumnya tidak ada sama sekali, jadi error di halaman publik (yang
// dilihat PELANGGAN, bukan cuma staf toko) bisa muncul sebagai layar putih
// polos tanpa penjelasan atau jalan keluar.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 py-12 text-center">
      <div className="w-full max-w-md rounded-3xl border border-red-100 dark:border-red-900/40 bg-white dark:bg-[#161b22] p-8 shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
          <AlertTriangle size={30} className="text-red-600 dark:text-red-400" strokeWidth={1.8} />
        </div>
        <p className="font-display text-lg font-bold text-black dark:text-white">
          Terjadi kesalahan
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Halaman ini tidak bisa ditampilkan. Coba muat ulang -- kalau masih
          gagal, tunggu beberapa saat lalu coba lagi.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <RotateCcw size={15} />
            Coba lagi
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 dark:border-[#30363d] px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-[#21262d]"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
