"use client";

import { ChevronsUpDown, ChevronUp, ChevronDown, type LucideIcon } from "lucide-react";

/* Header sel tabel yang bisa diklik buat sort, dipakai di semua tabel
   supaya markup + perilakunya konsisten (label + panah) dan tidak perlu
   ditulis ulang manual di tiap file. <th> di sini TETAP <th> tabel biasa
   -- lebar kolom masih ditentukan sepenuhnya oleh browser lewat table
   layout, jadi alignment ke <td> di bawahnya tidak berubah/tidak
   berisiko dobel-source lagi seperti kasus pill dulu. Yang berubah cuma
   ISI di dalam <th>-nya.

   "Opsi 1: Minimal" (dipilih user dari mockup) -- lingkaran ikon biru
   per kolom SUDAH DIHAPUS (dulu selalu tampil di tiap header, di tabel
   7-9 kolom jadi berjejer/ramai tanpa nambah informasi, karena label
   teksnya sendiri sudah jelas). Prop `icon` DIPERTAHANKAN di signature
   biar semua pemanggil di tabel (yang masih kirim icon={...}) tidak
   perlu diubah satu-satu, tapi nilainya sekarang tidak dirender lagi.
   Panah sortir juga tidak lagi selalu solid tampil -- default-nya nyaris
   tak kelihatan (opacity turun lewat CSS .sort-chevron), baru muncul
   jelas saat kolom itu di-hover atau memang sedang jadi urutan aktif
   (lihat .th-sortable:hover .sort-chevron / .sort-chevron.active di
   globals.css).

   Fix presisi (dilaporkan user: header tidak sejajar persis sama tulisan
   di <td> di bawahnya): chevron yang opacity:0 itu TETAP makan lebar di
   layout (beda sama display:none), jadi tanpa penyeimbang, seluruh grup
   "label + chevron" ke-center sebagai satu kotak lebih lebar ke kanan --
   label-nya sendiri jadi kegeser dikit ke kiri dari titik tengah kolom.
   <span className="chevron-spacer"> di bawah ini lebar-nya SENGAJA
   dibikin sama persis kayak chevron (lihat .chevron-spacer di
   globals.css) supaya label selalu tepat di tengah, simetris kiri-kanan,
   match sama <td> di bawahnya.

   Bug lanjutan yang baru ketahuan setelah 12 tabel di app ini dipindah
   dari "semua rata tengah" ke campuran kiri/kanan/tengah per kolom:
   trik chevron-spacer di atas cuma benar buat kasus CENTER. Begitu
   dipakai di kolom rata KIRI, spacer 12px+gap yang nempel SEBELUM label
   itu ikut kebawa, jadi teks label kegeser ~19px ke kanan dari tepi kiri
   <th> -- sementara <td> di bawahnya (teks polos, tanpa spacer apa pun)
   nempel pas di tepi kiri. Hasilnya header dan isi kolom jadi TIDAK
   sejajar (persis kebalikan dari bug yang tadinya mau diperbaiki lewat
   spacer ini), kelihatan "berantakan" di seluruh tabel karena hampir
   semua kolom sekarang rata kiri. Kolom rata KANAN kena masalah serupa
   dari sisi lain: chevron yang nempel SETELAH label bikin tepi kanan
   label kegeser ~19px ke KIRI dari tepi kanan <th>, tidak sejajar sama
   angka di <td> yang rata kanan polos.

   Fix: spacer di depan HANYA dipasang buat kolom center (satu-satunya
   kasus yang butuh penyeimbang simetris kiri-kanan). Kolom kiri/default
   TIDAK pakai spacer sama sekali -- label jadi elemen PERTAMA di
   th-flex, jadi tepi kirinya otomatis nempel tepi kiri <th>, sejajar
   sama <td>. Kolom kanan urutannya DIBALIK (chevron duluan, baru label)
   -- dengan justify-content:flex-end dari .th-right, label jadi elemen
   TERAKHIR, jadi tepi kanannya otomatis nempel tepi kanan <th>, sejajar
   sama angka di <td>. */
export default function SortableTh({
  label,
  icon: _icon,
  sortable = true,
  active = false,
  direction = "asc",
  onClick,
  center = false,
  right = false,
  left = false,
}: {
  label: string;
  icon?: LucideIcon;
  sortable?: boolean;
  active?: boolean;
  direction?: "asc" | "desc";
  onClick?: () => void;
  center?: boolean;
  // Rata kanan -- dipakai buat kolom angka/uang yang BUKAN kolom
  // terakhir (Total, Harga, dst). Kolom terakhir/Aksi sudah otomatis
  // rata kanan lewat CSS, tidak perlu prop ini.
  right?: boolean;
  // Rata kiri -- CUMA perlu dipakai kalau kolom ini kebetulan jadi
  // kolom TERAKHIR tabel tapi isinya teks bebas (misal "Catatan"),
  // karena kolom terakhir defaultnya dipaksa rata kanan lewat CSS.
  // Kolom biasa (bukan terakhir) sudah rata kiri secara default, tidak
  // perlu prop ini.
  left?: boolean;
}) {
  return (
    <th
      className={[
        sortable ? "th-sortable" : "",
        center ? "th-center" : "",
        right ? "th-right" : "",
        left ? "th-left" : "",
        active ? "th-active" : "",
      ].filter(Boolean).join(" ")}
      onClick={sortable ? onClick : undefined}
      title={sortable ? `Urutkan berdasarkan ${label}` : undefined}
    >
      <span className="th-flex">
        {right ? (
          <>
            {sortable && (
              <span className={`sort-chevron${active ? " active" : ""}`}>
                {active ? (
                  direction === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                ) : (
                  <ChevronsUpDown size={12} />
                )}
              </span>
            )}
            <span className="col-label">{label}</span>
          </>
        ) : (
          <>
            {center && sortable && <span className="chevron-spacer" aria-hidden="true" />}
            <span className="col-label">{label}</span>
            {sortable && (
              <span className={`sort-chevron${active ? " active" : ""}`}>
                {active ? (
                  direction === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                ) : (
                  <ChevronsUpDown size={12} />
                )}
              </span>
            )}
          </>
        )}
      </span>
    </th>
  );
}
