import Link from "next/link";
import { SearchX } from "lucide-react";

// Ditampilkan Next.js otomatis buat rute mana pun yang tidak cocok sama
// satu pun halaman (mis. salah ketik URL, link lama yang sudah dipindah).
// Sebelumnya tidak ada file ini sama sekali, jadi yang muncul cuma halaman
// 404 bawaan Next.js: putih polos, tulisan "404 | This page could not be
// found" dalam bahasa Inggris, sama sekali tidak senada sama tampilan
// DJOGKER. Server Component biasa (bukan client) karena tidak butuh
// interaktivitas apa pun selain link biasa.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 py-12 text-center">
      <div className="w-full max-w-md rounded-3xl border border-blue-100 dark:border-[#30363d] bg-white dark:bg-[#161b22] p-8 shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
          <SearchX size={30} className="text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
        </div>
        <p className="font-display text-lg font-bold text-black dark:text-white">
          Halaman tidak ditemukan
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Alamat yang kamu tuju tidak ada, atau mungkin sudah dipindahkan.
        </p>
        <div className="mt-5">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
