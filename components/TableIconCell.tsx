import type { LucideIcon } from "lucide-react";

/* Kolom paling kiri tiap tabel (spacer buat ikon baris) -- diisi ikon
   kecil yang gayanya SAMA persis dengan icon-chip di header kolom lain
   (bukan logo perusahaan), dan ikonnya dipilih sama dengan ikon baris
   yang sudah dipakai di kolom itu juga (misal Package buat tabel Packing,
   Truck buat tabel Supplier/Pengiriman, dst) supaya nyambung maknanya. */
export default function TableIconCell({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <th className="w-10">
      <span className="icon-chip">
        <Icon size={13} />
      </span>
    </th>
  );
}
