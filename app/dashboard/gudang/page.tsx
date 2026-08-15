import { createClient } from "@/lib/supabase/server";
import { Boxes } from "lucide-react";
import GudangTable from "./GudangTable";
import PageHeaderCard from "@/components/PageHeaderCard";

export default async function GudangPage() {
  const supabase = createClient();

  const [{ data: bahanRaw }, { data: suppliers }] = await Promise.all([
    supabase.from("raw_materials").select("*, suppliers(nama_supplier)").order("nama_bahan", { ascending: true }),
    supabase.from("suppliers").select("id, nama_supplier").order("nama_supplier"),
  ]);

  const bahan = (bahanRaw ?? []).map((b: any) => ({
    ...b,
    suppliers: Array.isArray(b.suppliers) ? b.suppliers[0] ?? null : b.suppliers,
  }));

  const totalJenisBahan = bahan?.length ?? 0;
  const totalStok = bahan?.reduce((sum, b) => sum + (Number(b.stok) || 0), 0) ?? 0;
  const stokTerendah =
    bahan && bahan.length > 0 ? Math.min(...bahan.map((b) => Number(b.stok) || 0)) : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="INVENTORI"
        icon={Boxes}
        title="Gudang"
        subtitle="Kelola stok bahan baku produksi."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="card p-3">
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">Total Jenis Bahan</p>
          <p className="mt-1 font-display text-lg font-bold text-black dark:text-white">{totalJenisBahan}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">Total Stok</p>
          <p className="mt-1 font-display text-lg font-bold text-black dark:text-white">{totalStok}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">Stok Terendah</p>
          <p className="mt-1 font-display text-lg font-bold text-black dark:text-white">{stokTerendah}</p>
        </div>
      </div>

      <GudangTable initialMaterials={bahan ?? []} suppliers={suppliers ?? []} />
    </div>
  );
}
