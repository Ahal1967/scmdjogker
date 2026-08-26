import { createClient } from "@/lib/supabase/server";
import { Boxes } from "lucide-react";
import GudangTable from "./GudangTable";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";

// Stok di halaman ini harus selalu angka terbaru dari database -- kalau
// Next.js sempat nge-cache hasil query Supabase di sini, admin bisa lihat
// angka stok yang sudah basi padahal di database sudah kepotong (misalnya
// abis pemotongan stok otomatis dari pesanan baru). force-dynamic matiin
// caching itu, sama seperti yang dipakai di halaman tracking/upload publik.
export const dynamic = "force-dynamic";

export default async function GudangPage() {
  const supabase = createClient();

  const [
    { data: bahanRaw, error: bahanError },
    { data: suppliers, error: suppliersError },
  ] = await Promise.all([
    supabase.from("raw_materials").select("*, suppliers(nama_supplier)").order("nama_bahan", { ascending: true }),
    supabase.from("suppliers").select("id, nama_supplier").order("nama_supplier"),
  ]);

  if (bahanError) console.error("Gudang bahan fetch error:", bahanError.message);
  if (suppliersError) console.error("Gudang suppliers fetch error:", suppliersError.message);
  const fetchErrorMsg = [bahanError?.message, suppliersError?.message].filter(Boolean).join("; ") || null;

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
        badge="Penyimpanan"
        icon={Boxes}
        title="Gudang"
        subtitle="Kelola stok bahan baku produksi."
      />

      <FetchErrorBanner message={fetchErrorMsg} />

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
