"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical, type LucideIcon } from "lucide-react";
import type { ProductionRow } from "@/app/dashboard/produksi/ProduksiTable";

/* Papan drag-and-drop untuk halaman Produksi -- Halaman 07 dari daftar
   fitur yang belum dibuat (README lama), sekarang dikerjakan sebagai
   TAMPILAN TAMBAHAN (toggle Tabel/Papan) di ProduksiTable.tsx, BUKAN
   pengganti tabel yang sudah ada -- supaya fitur cari/urutkan/pagination
   di tabel tidak hilang, sesuai keputusan user.

   Fungsi drag DISAMBUNGKAN ke updateStatus() yang SAMA PERSIS dipakai
   tabel (dikirim lewat prop onStatusChange) -- geser kartu ke kolom lain
   memicu efek yang SAMA seperti pilih status lewat StatusDropdown:
   progress ikut ter-update sesuai mapping, status pesanan induk ikut
   disinkronkan, entri order_tracking dicatat, dan kalau digeser ke
   kolom "QC" tetap otomatis redirect ke halaman QC. Komponen ini TIDAK
   punya logika bisnis sendiri -- murni interaksi drag, logika tetap
   satu sumber di ProduksiTable.tsx. */

type ColumnDef = {
  key: string;
  label: string;
  icon: LucideIcon;
};

function ProductionCard({ p, colorClass }: { p: ProductionRow; colorClass: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: p.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`card cursor-grab active:cursor-grabbing select-none space-y-2 p-3 touch-none ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-bold text-black dark:text-white">{p.no_produksi || "-"}</p>
        <GripVertical size={14} className="mt-0.5 shrink-0 text-gray-300 dark:text-gray-600" />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {p.orders?.no_pesanan ?? "-"} &middot; {p.orders?.customers?.nama ?? "-"}
      </p>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-[#171717]">
          <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${Number(p.progress || 0)}%` }} />
        </div>
        <span className="text-[10.5px] text-gray-400 dark:text-gray-500">{Number(p.progress || 0)}%</span>
      </div>
    </div>
  );
}

function Column({
  col,
  items,
  colorClasses,
  barClasses,
}: {
  col: ColumnDef;
  items: ProductionRow[];
  colorClasses: Record<string, string>;
  barClasses: Record<string, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  const Icon = col.icon;

  return (
    <div className="flex min-w-[260px] flex-1 flex-col gap-3">
      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${colorClasses[col.key] ?? ""}`}>
        <Icon size={15} />
        <span className="text-[13px] font-bold">{col.label}</span>
        <span className="ml-auto rounded-full bg-white/60 dark:bg-black/25 px-2 py-0.5 text-[11px] font-bold">
          {items.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[140px] flex-1 flex-col gap-2 rounded-xl border-2 border-dashed p-2 transition-colors ${
          isOver
            ? "border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-900/15"
            : "border-transparent"
        }`}
      >
        {items.length === 0 && (
          <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-600">Tidak ada</p>
        )}
        {items.map((p) => (
          <ProductionCard key={p.id} p={p} colorClass={barClasses[col.key] ?? "bg-blue-600"} />
        ))}
      </div>
    </div>
  );
}

export default function ProduksiKanban({
  productions,
  columns,
  colorClasses,
  barClasses,
  onStatusChange,
}: {
  productions: ProductionRow[];
  columns: ColumnDef[];
  // Warna latar header kolom -- disamakan dengan STATUS_COLORS yang
  // sudah dipakai StatusDropdown di tabel, supaya bahasa warna per
  // status konsisten antara tampilan Tabel dan Papan.
  colorClasses: Record<string, string>;
  // Warna bar progress per status (solid, bukan pastel) -- terpisah dari
  // colorClasses karena bar progress butuh warna solid supaya kebaca di
  // atas background abu-abu, sementara badge/header butuh versi pastel.
  barClasses: Record<string, string>;
  onStatusChange: (p: ProductionRow, status: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Jarak minimum sebelum drag dianggap mulai -- tanpa ini, klik
      // biasa di kartu (misal buat baca detail) selalu ke-trigger jadi
      // drag walau cuma gerak 1px karena tremor mouse/trackpad.
      activationConstraint: { distance: 8 },
    })
  );

  const byColumn = new Map<string, ProductionRow[]>(columns.map((c) => [c.key, []]));
  for (const p of productions) {
    const key = p.status && byColumn.has(p.status) ? p.status : columns[0].key;
    byColumn.get(key)!.push(p);
  }

  const activeProduction = activeId ? productions.find((p) => p.id === activeId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const newStatus = String(over.id);
    const production = productions.find((p) => p.id === active.id);
    if (!production) return;
    if ((production.status || columns[0].key) === newStatus) return;

    onStatusChange(production, newStatus);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => (
          <Column
            key={col.key}
            col={col}
            items={byColumn.get(col.key) ?? []}
            colorClasses={colorClasses}
            barClasses={barClasses}
          />
        ))}
      </div>
      <DragOverlay>
        {activeProduction ? (
          <div className="card w-[240px] space-y-2 rotate-2 p-3 shadow-xl">
            <p className="text-[13px] font-bold text-black dark:text-white">{activeProduction.no_produksi || "-"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {activeProduction.orders?.no_pesanan ?? "-"} &middot; {activeProduction.orders?.customers?.nama ?? "-"}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
