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
} from "lucide-react";

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

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          END-TO-END TRACKING
        </span>
        <h1 className="font-display text-2xl font-bold text-black dark:text-white">Alur Supply Chain</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Ringkasan tiap tahap dari bahan baku sampai produk diterima pelanggan.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <Link
              key={stage.key}
              href={stage.href}
              className="card relative block cursor-pointer"
              style={{ border: "none" }}
            >
              <span className="absolute top-4 right-4 text-xs font-display font-bold text-gray-300 dark:text-gray-600">
                {String(idx + 1).padStart(2, "0")}
              </span>

              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${stage.iconBg} shadow-sm`}>
                <Icon className="text-white" size={19} />
              </div>

              <p className="text-base font-semibold text-black dark:text-white">{stage.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{stage.desc}</p>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-end justify-between">
                <p className="font-display text-2xl font-bold" style={{ color: stage.accent }}>
                  {VALUES[stage.key].value}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 text-right">
                  {VALUES[stage.key].hint}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
