import { createClient } from "@/lib/supabase/server";
import { Factory, ClipboardList, Loader2, CheckCircle2 } from "lucide-react";
import ProduksiTable, { type ProductionRow } from "./ProduksiTable";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";

export default async function ProduksiPage() {
  const supabase = createClient();

  const { data: produksiRaw, error: produksiError } = await supabase
    .from("production")
    .select("*, orders(no_pesanan, customers(nama))")
    .order("created_at", { ascending: false });

  if (produksiError) console.error("Produksi fetch error:", produksiError.message);

  // Flatten relasi nested (Supabase mengetik-kan foreign join sebagai array
  // walau sebenarnya cuma 1 row per foreign key).
  const dataProduksi: ProductionRow[] = (produksiRaw ?? []).map((p: any) => {
    const orderRaw = Array.isArray(p.orders) ? p.orders[0] ?? null : p.orders;
    return {
      ...p,
      orders: orderRaw
        ? {
            no_pesanan: orderRaw.no_pesanan,
            customers: Array.isArray(orderRaw.customers)
              ? orderRaw.customers[0] ?? null
              : orderRaw.customers,
          }
        : null,
    };
  });

  const totalProduksi = dataProduksi.length;
  const sedangDiproses = dataProduksi.filter(
    (p) => p.status === "Produksi" || p.status === "Sablon"
  ).length;
  const selesai = dataProduksi.filter((p) => p.status === "Selesai").length;

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="Proses Produksi"
        icon={Factory}
        title="Produksi"
        subtitle="Kelola dan pantau proses produksi pesanan."
      />

      <FetchErrorBanner message={produksiError?.message} />

      {/* Kartu statistik dipindah ke pola .dash-kpi-card (icon chip
          bergradasi) -- dipakai ulang apa adanya dari Dashboard, lihat
          komentar sejenis di app/dashboard/gudang/page.tsx. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-top-left">
              <span className="dash-kpi-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
                <ClipboardList size={13} />
              </span>
              <span className="dash-kpi-label">Total Produksi</span>
            </span>
          </div>
          <p className="dash-kpi-value font-display">{totalProduksi}</p>
        </div>
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-top-left">
              <span className="dash-kpi-icon" style={{ background: "#ffedd5", color: "#ea580c" }}>
                <Loader2 size={13} />
              </span>
              <span className="dash-kpi-label">Sedang Diproses</span>
            </span>
          </div>
          <p className="dash-kpi-value font-display">{sedangDiproses}</p>
        </div>
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-top-left">
              <span className="dash-kpi-icon" style={{ background: "#d1fae5", color: "#059669" }}>
                <CheckCircle2 size={13} />
              </span>
              <span className="dash-kpi-label">Selesai</span>
            </span>
          </div>
          <p className="dash-kpi-value font-display">{selesai}</p>
        </div>
      </div>

      <ProduksiTable initialProductions={dataProduksi} />
    </div>
  );
}
