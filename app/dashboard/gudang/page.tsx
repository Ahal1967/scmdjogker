import { createClient } from "@/lib/supabase/server";
import { Boxes, Layers, Package, AlertTriangle } from "lucide-react";
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

      {/* Kartu statistik dipindah ke pola .dash-kpi-card (icon chip
          bergradasi) yang sebelumnya cuma dipakai di Dashboard -- dipakai
          ulang apa adanya di sini (bukan class baru "gudang-kpi-card")
          karena ini murni pola visual tanpa logika khusus halaman, jadi
          tidak melanggar prinsip "class per halaman" yang dipakai buat
          class BER-LOGIKA (lihat komentar di app/globals.css). */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="dash-kpi-card">
          <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}>
            <Layers size={14} />
          </span>
          <p className="dash-kpi-label">TOTAL JENIS BAHAN</p>
          <p className="dash-kpi-value font-display">{totalJenisBahan}</p>
        </div>
        <div className="dash-kpi-card">
          <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#22d3ee,#0891b2)" }}>
            <Package size={14} />
          </span>
          <p className="dash-kpi-label">TOTAL STOK</p>
          <p className="dash-kpi-value font-display">{totalStok}</p>
        </div>
        <div className="dash-kpi-card">
          <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#f87171,#dc2626)" }}>
            <AlertTriangle size={14} />
          </span>
          <p className="dash-kpi-label">STOK TERENDAH</p>
          <p className="dash-kpi-value font-display">{stokTerendah}</p>
        </div>
      </div>

      <GudangTable initialMaterials={bahan ?? []} suppliers={suppliers ?? []} />
    </div>
  );
}
