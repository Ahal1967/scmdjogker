"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/* Wrapper generik buat kartu ringkasan (.dash-kpi-card dkk) di semua
   modul KECUALI Dashboard & Alur -- dua halaman itu memang halaman
   analisis/visualisasi utama (isi utamanya, bukan cuma pelengkap
   tabel), jadi kartunya sengaja TIDAK disembunyikan.

   Kartu disembunyikan default (biar modul terasa lebih ringkas/simple
   sesuai permintaan user), baru muncul kalau tombol ini diklik, dan
   SELALU reset ke kondisi tersembunyi tiap halaman dibuka ulang --
   sengaja TIDAK diingat lewat localStorage (dibahas & dipilih user).

   Dipakai dengan cara membungkus grid kartu yang SUDAH ADA di tiap
   modul sebagai children -- markup, warna, & isi kartu itu sendiri
   sama sekali tidak diubah di sini, cuma ditambah show/hide. */
export default function CollapsibleKpiCards({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors"
      >
        {open ? "Sembunyikan Ringkasan" : "Lihat Ringkasan"}
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
