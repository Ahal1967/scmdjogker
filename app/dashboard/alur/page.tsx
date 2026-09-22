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
  Undo2,
  Route,
} from "lucide-react";
import PageHeaderCard from "@/components/PageHeaderCard";

// Halaman ini narik angka live dari 10 tabel berbeda (supplier, bahan baku x2,
// pesanan x2, produksi, QC, packing, pengiriman, retur). Kalau Next.js nge-cache
// hasil query-nya, admin bisa lihat angka tahapan yang sudah basi padahal data
// asli di database sudah berubah. force-dynamic matiin caching itu, sama
// seperti yang dipakai di halaman Gudang.
export const dynamic = "force-dynamic";

// Gradient tiap kartu sengaja dibuat dari 2 shade warna yang sama dengan
// "accent" (400 -> 600 di keluarga warna Tailwind yang sama) -- pola yang
// sama persis dengan .dash-kpi-icon di semua modul lain (Dashboard, Gudang,
// Produksi, dst), supaya chip ikon di sini tidak lagi terasa beda sendiri.
const STAGES = [
  { key: "supplier", label: "Supplier", desc: "Pemasok bahan baku", icon: Truck, accent: "#2563eb", gradient: ["#3b82f6", "#2563eb"], href: "/dashboard/supplier" },
  { key: "bahan", label: "Bahan Masuk", desc: "Bahan baku diterima", icon: PackagePlus, accent: "#0891b2", gradient: ["#22d3ee", "#0891b2"], href: "/dashboard/gudang" },
  { key: "gudang", label: "Gudang", desc: "Penyimpanan bahan baku", icon: Warehouse, accent: "#16a34a", gradient: ["#4ade80", "#16a34a"], href: "/dashboard/gudang" },
  { key: "pesanan", label: "Pesanan", desc: "Pelanggan membuat pesanan", icon: ShoppingCart, accent: "#9333ea", gradient: ["#c084fc", "#9333ea"], href: "/dashboard/pesanan" },
  { key: "produksi", label: "Produksi", desc: "Proses produksi sablon", icon: Factory, accent: "#ea580c", gradient: ["#fb923c", "#ea580c"], href: "/dashboard/produksi" },
  { key: "qc", label: "QC (Quality Control)", desc: "Pemeriksaan kualitas produk", icon: CheckCircle2, accent: "#7c3aed", gradient: ["#a78bfa", "#7c3aed"], href: "/dashboard/qc" },
  { key: "packing", label: "Packing", desc: "Pengemasan produk", icon: Package, accent: "#d97706", gradient: ["#fbbf24", "#d97706"], href: "/dashboard/packing" },
  { key: "pengiriman", label: "Pengiriman", desc: "Produk dikirim ke konsumen", icon: Send, accent: "#0d9488", gradient: ["#2dd4bf", "#0d9488"], href: "/dashboard/pengiriman" },
  { key: "konsumen", label: "Konsumen", desc: "Produk diterima pelanggan", icon: UserCheck, accent: "#059669", gradient: ["#34d399", "#059669"], href: "/dashboard/laporan" },
  // Tahap ke-10 -- warna merah sengaja dibedakan dari 9 tahap lain (yang
  // semuanya nuansa biru/hijau/oranye netral), karena retur secara makna
  // beda dari tahap lain: bukan langkah maju dalam alur, tapi jalur
  // pengecualian yang muncul setelah produk sudah di tangan pelanggan --
  // sama seperti warna badge-danger/tombol btn-danger di tempat lain.
  { key: "retur", label: "Retur", desc: "Pengembalian produk dari pelanggan", icon: Undo2, accent: "#dc2626", gradient: ["#f87171", "#dc2626"], href: "/dashboard/retur" },
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
    { count: returCount },
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
    supabase.from("returns").select("*", { count: "exact", head: true }),
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
    retur: { value: returCount ?? 0, hint: "total retur" },
  };

  // Kartu satu tahap -- dipakai ulang baik di layout "berkelok" (desktop,
  // lg ke atas) maupun layout tumpuk vertikal (mobile/tablet, di bawah lg).
  // Index yang ditampilkan (01-10) selalu urutan global, bukan urutan
  // posisi baris, supaya penomoran tetap konsisten di kedua layout.
  function renderStageCard(stage: (typeof STAGES)[number], globalIdx: number) {
    const Icon = stage.icon;
    return (
      <Link
        href={stage.href}
        className="alur-stage-card relative block min-w-0 flex-1 cursor-pointer"
      >
        <span className="absolute top-2 right-2 text-[9px] font-display font-bold text-gray-300 dark:text-gray-600">
          {String(globalIdx + 1).padStart(2, "0")}
        </span>

        <div
          className="dash-kpi-icon"
          style={{ background: `linear-gradient(135deg, ${stage.gradient[0]}, ${stage.gradient[1]})` }}
        >
          <Icon size={14} />
        </div>

        <p className="text-xs font-semibold text-black dark:text-white">{stage.label}</p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">{stage.desc}</p>

        <div className="pt-1.5 border-t border-gray-100 dark:border-[#30363d] flex items-end justify-between">
          <p className="font-display text-base font-bold" style={{ color: stage.accent }}>
            {VALUES[stage.key].value}
          </p>
          <p className="text-[9px] text-gray-500 dark:text-gray-400 text-right">
            {VALUES[stage.key].hint}
          </p>
        </div>
      </Link>
    );
  }

  // Sebelumnya 3 baris x 3 kartu (pas buat 9 tahap). Sekarang 10 tahap --
  // kalau tetap dipaksa 3 kolom, baris terakhir cuma kebagian 1 kartu yang
  // melebar sendirian, jadi janggal. Disusun ulang jadi 2 baris x 5 kartu,
  // pola berkelok yang sama cuma sekali belokan alih-alih dua.
  const rows = [STAGES.slice(0, 5), STAGES.slice(5, 10)];

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="Rantai Pasok"
        icon={Route}
        title="Alur Supply Chain"
        subtitle="Ringkasan tiap tahap dari bahan baku sampai produk diterima pelanggan, termasuk retur."
      />

      {/* Desktop (lg ke atas): grid 5 kolom berkelok (snake) dengan panah
          antar kartu, 2 baris (10 tahap). Baris kedua dibalik arahnya
          (flex-row-reverse) supaya panah antar-baris bisa lurus ke bawah,
          tanpa perlu garis diagonal. */}
      <div className="hidden lg:flex lg:flex-col">
        {rows.map((row, rIdx) => {
          const reversed = rIdx === 1;
          return (
            <div key={rIdx}>
              <div className={`flex items-center gap-3 ${reversed ? "flex-row-reverse" : ""}`}>
                {row.map((stage, i) => {
                  const globalIdx = rIdx * 5 + i;
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
