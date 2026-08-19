import type { LucideIcon } from "lucide-react";

/* Kolom paling kiri tiap tabel. Dulu header-nya sengaja dikosongkan
   (ikon dihapus atas permintaan user, biar tampilan lebih
   simple/premium/elegan) sementara tiap baris di <tbody> masih pakai
   badge ikon bulat -- belakangan user bilang pojok kiri atas kelihatan
   "kosong"/aneh dibanding kolom lain yang semua berlabel. Sekarang diisi
   label "No", dan badge ikon di tiap baris (lihat masing-masing
   *Table.tsx) sudah diganti jadi nomor urut biar konsisten sama
   header-nya -- daripada header bilang "No" tapi isinya ikon. Prop
   "icon" tetap dipertahankan di signature (bukan dihapus) supaya 11
   file pemanggil (<TableIconCell icon={...} />) tidak perlu ikut
   diubah satu-satu -- cukup 1 tempat ini yang berubah. */
export default function TableIconCell({}: { icon: LucideIcon }) {
  return <th className="w-10">No</th>;
}
