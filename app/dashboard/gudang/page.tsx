import { createClient } from "@/lib/supabase/server";
import { Boxes, Layers, Package, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import GudangTable from "./GudangTable";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";
import CollapsibleKpiCards from "@/components/CollapsibleKpiCards";

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
  // Digabung ke sini dari baris kartu yang tadinya ada TERPISAH di bawah
  // tabel (GudangTable.tsx) -- sebelumnya bikin 2 baris kartu beda tempat
  // di 1 halaman, dan "Total Jenis Bahan" dobel persis di keduanya. Kolom
  // `status` ("Aman"/"Kritis") sudah ada di tiap baris raw_materials,
  // tinggal dihitung di sini juga.
  const stokAman = bahan?.filter((b) => b.status === "Aman").length ?? 0;
  const stokKritis = bahan?.filter((b) => b.status === "Kritis").length ?? 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="Penyimpanan"
        icon={Boxes}
        title="Gudang"
        subtitle="Kelola stok bahan baku produksi."
      />

      <FetchErrorBanner message={fetchErrorMsg} />

      {/* Kartu statistik pakai pola .dash-kpi-card (badge ikon warna muda +
          label sebaris) yang dipakai ulang apa adanya dari Dashboard --
          diselaraskan atas permintaan user supaya semua halaman senada,
          bukan class baru "gudang-kpi-card" karena ini murni pola visual
          tanpa logika khusus halaman (lihat komentar di app/globals.css).
          5 kartu sekarang (tadinya 3) -- Stok Aman & Stok Kritis
          digabung ke sini dari baris kartu terpisah yang dulu ada di
          bawah tabel (GudangTable.tsx), lihat komentar di sana. lg:grid-
          cols-5 supaya di layar lebar tetap 1 baris rapi, bukan wrap.
          Dibungkus CollapsibleKpiCards (default tersembunyi, klik buat
          buka) atas permintaan user supaya modul terasa lebih ringkas --
          lihat komentar di komponennya kenapa Dashboard & Alur TIDAK
          ikut dibungkus begini. */}
      <CollapsibleKpiCards>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="dash-kpi-card">
            <div className="dash-kpi-top">
              <span className="dash-kpi-top-left">
                <span className="dash-kpi-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
                  <Layers size={13} />
                </span>
                <span className="dash-kpi-label">Total Jenis Bahan</span>
              </span>
            </div>
            <p className="dash-kpi-value font-display">{totalJenisBahan}</p>
          </div>
          <div className="dash-kpi-card">
            <div className="dash-kpi-top">
              <span className="dash-kpi-top-left">
                <span className="dash-kpi-icon" style={{ background: "#cffafe", color: "#0891b2" }}>
                  <Package size={13} />
                </span>
                <span className="dash-kpi-label">Total Stok</span>
              </span>
            </div>
            <p className="dash-kpi-value font-display">{totalStok}</p>
          </div>
          <div className="dash-kpi-card">
            <div className="dash-kpi-top">
              <span className="dash-kpi-top-left">
                <span className="dash-kpi-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
                  <AlertTriangle size={13} />
                </span>
                <span className="dash-kpi-label">Stok Terendah</span>
              </span>
            </div>
            <p className="dash-kpi-value font-display">{stokTerendah}</p>
          </div>
          <div className="dash-kpi-card">
            <div className="dash-kpi-top">
              <span className="dash-kpi-top-left">
                <span className="dash-kpi-icon" style={{ background: "#d1fae5", color: "#059669" }}>
                  <CheckCircle2 size={13} />
                </span>
                <span className="dash-kpi-label">Stok Aman</span>
              </span>
            </div>
            <p className="dash-kpi-value font-display">{stokAman}</p>
          </div>
          <div className="dash-kpi-card">
            <div className="dash-kpi-top">
              <span className="dash-kpi-top-left">
                <span className="dash-kpi-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
                  <XCircle size={13} />
                </span>
                <span className="dash-kpi-label">Stok Kritis</span>
              </span>
            </div>
            <p className="dash-kpi-value font-display">{stokKritis}</p>
          </div>
        </div>
      </CollapsibleKpiCards>

      <GudangTable initialMaterials={bahan ?? []} suppliers={suppliers ?? []} />
    </div>
  );
}
