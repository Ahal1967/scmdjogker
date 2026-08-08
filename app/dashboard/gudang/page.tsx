import { createClient } from "@/lib/supabase/server";
import GudangTable from "./GudangTable";

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
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Gudang</h1>
        <p className="mt-1 text-sm text-gray-600">Kelola stok bahan baku produksi.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Jenis Bahan</p>
          <p className="mt-1 font-display text-3xl font-bold text-black">{totalJenisBahan}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Stok</p>
          <p className="mt-1 font-display text-3xl font-bold text-black">{totalStok}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Stok Terendah</p>
          <p className="mt-1 font-display text-3xl font-bold text-black">{stokTerendah}</p>
        </div>
      </div>

      <GudangTable initialMaterials={bahan ?? []} suppliers={suppliers ?? []} />
    </div>
  );
}
