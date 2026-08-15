"use client";

import { ChevronsUpDown, ChevronUp, ChevronDown, type LucideIcon } from "lucide-react";

/* Header sel tabel yang bisa diklik buat sort, dipakai di semua tabel
   supaya markup + perilakunya konsisten (icon bulat + label + panah)
   dan tidak perlu ditulis ulang manual di tiap file. <th> di sini
   TETAP <th> tabel biasa -- lebar kolom masih ditentukan sepenuhnya
   oleh browser lewat table layout, jadi alignment ke <td> di bawahnya
   tidak berubah/tidak berisiko dobel-source lagi seperti kasus pill
   dulu. Yang berubah cuma ISI di dalam <th>-nya. */
export default function SortableTh({
  label,
  icon: Icon,
  sortable = true,
  active = false,
  direction = "asc",
  onClick,
  center = false,
}: {
  label: string;
  icon?: LucideIcon;
  sortable?: boolean;
  active?: boolean;
  direction?: "asc" | "desc";
  onClick?: () => void;
  center?: boolean;
}) {
  return (
    <th
      className={[sortable ? "th-sortable" : "", center ? "th-center" : ""].filter(Boolean).join(" ")}
      onClick={sortable ? onClick : undefined}
      title={sortable ? `Urutkan berdasarkan ${label}` : undefined}
    >
      <span className="th-flex">
        {Icon && (
          <span className="icon-chip">
            <Icon size={13} />
          </span>
        )}
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
      </span>
    </th>
  );
}
