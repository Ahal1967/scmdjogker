import { Fragment } from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Truck,
  PackagePlus,
  Warehouse,
  ShoppingCart,
  Factory,
  CheckCircle2,
  Package,
  Send,
  UserCheck,
  Route,
} from "lucide-react";
import PageHeaderCard from "@/components/PageHeaderCard";

const STAGES = [
  { key: "supplier", label: "Supplier", desc: "Pemasok bahan baku", icon: Truck, accent: "#2563eb", iconBg: "bg-blue-600", href: "/dashboard/supplier" },
  { key: "bahan", label: "Bahan Masuk", desc: "Bahan baku diterima", icon: PackagePlus, accent: "#0891b2", iconBg: "bg-cyan-600", href: "/dashboard/gudang" },
  { key: "gudang", label: "Gudang", desc: "Penyimpanan bahan baku", icon: Warehouse, accent: "#16a34a", iconBg: "bg-green-600", href: "/dashboard/gudang" },
  { key: "pesanan", label: "Pesanan", desc: "Pelanggan membuat pesanan", icon: ShoppingCart, accent: "#9333ea", iconBg: "bg-purple-600", href: "/dashboard/pesanan" },
  { key: "produksi", label: "Produksi", desc: "Proses produksi sablon", icon: Factory, accent: "#ea580c", iconBg: "bg-orange-600", href: "/dashboard/produksi" },
  { key: "qc", label: "QC (Quality Control)", desc: "Pemeriksaan kualitas produk", icon: CheckCircle2, accent: "#7c3aed", iconBg: "bg-violet-600", href: "/dashboard/qc" },
  { key: "packing", label: "Packing", desc: "Pengemasan produk", icon: Package, accent: "#d97706", iconBg: "bg-amber-600", href: "/dashboard/packing" },
  { key: "pengiriman", label: "Pengiriman", desc: "Produk dikirim ke konsumen", icon: Send, accent: "#0d9488", iconBg: "bg-teal-600", href: "/dashboard/pengiriman" },
  { key: "konsumen", label: "Konsumen", desc: "Produk diterima pelanggan", icon: UserCheck, accent: "#059669", iconBg: "bg-emerald-600", href: "/dashboard/laporan" },
] as const;

export default async function AlurPage() {
  const supabase = createClient();

  const [
    { count: supplierCount },
    { count: bahanCount },
    { data: bahanStok },
    { count: pesananCount },
    { count: produksiCount },
    { count: qcCount },
    { count: packingCount },
    { count: pengirimanCount },
    { count: konsumenCount },
  ] = await Promise.all([
    supabase.from("suppliers").select("*", { count: "exact", head: true }),
    supabase.from("raw_materials").select("*", { count: "exact", head: true }),
    supabase.from("raw_materials").select("stok"),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("production").select("*", { count: "exact", head: true }).neq("status", "Selesai"),
    supabase.from("quality_control").select("*", { count: "exact", head: true }),
    supabase.from("packing").select("*", { count: "exact", head: true }),
    supabase.from("shipments").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "Selesai"),
  ]);

  const totalStok = bahanStok?.reduce((sum, b) => sum + (Number(b.stok) || 0), 0) ?? 0;

  const VALUES: Record<string, { value: number; hint: string }> = {
    supplier: { value: supplierCount ?? 0, hint: "supplier aktif" },
    bahan: { value: bahanCount ?? 0, hint: "jenis bahan" },
    gudang: { value: totalStok, hint: "total stok tersedia" },
    pesanan: { value: pesananCount ?? 0, hint: "total pesanan" },
    produksi: { value: produksiCount ?? 0, hint: "sedang diproses" },
    qc: { value: qcCount ?? 0, hint: "sudah diperiksa" },
    packing: { value: packingCount ?? 0, hint: "entri packing" },
    pengiriman: { value: pengirimanCount ?? 0, hint: "pengiriman tercatat" },
    konsumen: { value: konsumenCount ?? 0, hint: "pesanan selesai" },
  };

  // Kartu satu tahap -- dipakai ulang baik di layout "berkelok" (desktop,
  // lg ke atas) maupun layout tumpuk vertikal (mobile/tablet, di bawah lg).
  // Index yang ditampilkan (01-09) selalu urutan global, bukan urutan
  // posisi baris, supaya penomoran tetap konsisten di kedua layout.
  function renderStageCard(stage: (typeof STAGES)[number], globalIdx: number) {
    const Icon = stage.icon;
    return (
      <Link
        href={stage.href}
        className="card alur-stage-card relative block min-w-0 flex-1 cursor-pointer bg-blue-50/60 dark:bg-blue-900/10"
        style={{ border: "none" }}
      >
        <span className="absolute top-3 right-3 text-[10px] font-display font-bold text-gray-300 dark:text-gray-600">
          {String(globalIdx + 1).padStart(2, "0")}
        </span>

        <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${stage.iconBg} shadow-sm`}>
          <Icon className="text-white" size={15} />
        </div>

        <p className="text-sm font-semibold text-black dark:text-white">{stage.label}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">{stage.desc}</p>

        <div className="pt-2 border-t border-gray-100 dark:border-[#30363d] flex items-end justify-between">
          <p className="font-display text-lg font-bold" style={{ color: stage.accent }}>
            {VALUES[stage.key].value}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 text-right">
            {VALUES[stage.key].hint}
          </p>
        </div>
      </Link>
    );
  }

  const rows = [STAGES.slice(0, 3), STAGES.slice(3, 6), STAGES.slice(6, 9)];

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="End-to-End Tracking"
        icon={Route}
        title="Alur Supply Chain"
        subtitle="Ringkasan tiap tahap dari bahan baku sampai produk diterima pelanggan."
      />

      {/* Desktop (lg ke atas): grid 3 kolom berkelok (snake) dengan panah
          antar kartu. Baris tengah dibalik arahnya (flex-row-reverse) supaya
          panah antar-baris bisa lurus ke bawah, tanpa perlu garis diagonal. */}
      <div className="hidden lg:flex lg:flex-col">
        {rows.map((row, rIdx) => {
          const reversed = rIdx === 1;
          return (
            <div key={rIdx}>
              <div className={`flex items-center gap-3 ${reversed ? "flex-row-reverse" : ""}`}>
                {row.map((stage, i) => {
                  const globalIdx = rIdx * 3 + i;
                  return (
                    <Fragment key={stage.key}>
                      {renderStageCard(stage, globalIdx)}
                      {i < row.length - 1 && (
                        <span
                          className="flex-shrink-0 text-lg font-bold text-gray-300 dark:text-gray-600"
                          aria-hidden="true"
                        >
                          {reversed ? "←" : "→"}
                        </span>
                      )}
                    </Fragment>
                  );
                })}
              </div>
              {rIdx < rows.length - 1 && (
                <div
                  className={`flex py-1 ${rIdx % 2 === 0 ? "justify-end pr-[15%]" : "justify-start pl-[15%]"}`}
                >
                  <span className="text-lg font-bold text-gray-300 dark:text-gray-600" aria-hidden="true">
                    ↓
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile/tablet (di bawah lg): tumpuk vertikal 1 kolom dengan panah
          ke bawah antar kartu. Sengaja tidak dipaksakan jadi grid 2 kolom
          berkelok -- pola kiri-kanan-kiri cuma masuk akal kalau jumlah
          kolom per baris genap/konsisten, dan 1 kolom lurus ke bawah lebih
          gampang dibaca di layar sempit daripada zigzag 2 kolom. */}
      <div className="flex flex-col lg:hidden">
        {STAGES.map((stage, idx) => (
          <div key={stage.key}>
            {renderStageCard(stage, idx)}
            {idx < STAGES.length - 1 && (
              <div className="flex justify-center py-1">
                <span className="text-lg font-bold text-gray-300 dark:text-gray-600" aria-hidden="true">
                  ↓
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
