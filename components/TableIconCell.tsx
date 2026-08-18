import type { LucideIcon } from "lucide-react";

/* Kolom paling kiri tiap tabel (spacer buat ikon baris di bawahnya) --
   ikonnya di header SENGAJA dihapus (atas permintaan user, biar tampilan
   lebih simple/premium/elegan): ikon di header ini cuma dekorasi, tidak
   menambah informasi apa pun (kolomnya sendiri tidak berlabel), dan
   dobel sama ikon yang sudah ada di setiap baris di bawahnya. Prop
   "icon" tetap dipertahankan di signature (bukan dihapus) supaya 10
   file pemanggil (<TableIconCell icon={...} />) tidak perlu ikut
   diubah satu-satu -- cukup 1 tempat ini yang berubah. */
export default function TableIconCell({}: { icon: LucideIcon }) {
  return <th className="w-10" />;
}
