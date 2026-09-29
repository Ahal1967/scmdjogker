import { createClient } from "@/lib/supabase/server";
import PelangganTable from "./PelangganTable";
import { Users2, ShoppingBag, Wallet } from "lucide-react";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";
import CollapsibleKpiCards from "@/components/CollapsibleKpiCards";

export default async function PelangganPage() {
  const supabase = createClient();

  const [
    { data: customers, error: customersError },
    { data: orders, error: ordersError },
  ] = await Promise.all([
    supabase.from("customers").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("customer_id, total, sisa_pembayaran"),
  ]);

  if (customersError) console.error("Pelanggan customers fetch error:", customersError.message);
  if (ordersError) console.error("Pelanggan orders fetch error:", ordersError.message);
  const fetchErrorMsg = [customersError?.message, ordersError?.message].filter(Boolean).join("; ") || null;

  const customerList = customers || [];
  const orderList = orders || [];

  const dataPelanggan = customerList.map((c) => {
    const orderMilikDia = orderList.filter((o) => o.customer_id === c.id);
    const totalPesanan = orderMilikDia.length;
    const totalBelanja = orderMilikDia.reduce(
      (sum, o) => sum + ((Number(o.total) || 0) - (Number(o.sisa_pembayaran) || 0)),
      0
    );
    return { ...c, totalPesanan, totalBelanja };
  });

  const totalPelanggan = customerList.length;
  const pelangganAktif = dataPelanggan.filter((c) => c.totalPesanan > 0).length;
  const totalBelanjaSemua = dataPelanggan.reduce((sum, c) => sum + c.totalBelanja, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Tombol Export dipindah ke dalam PelangganTable (di samping kolom
          cari), bukan di sini lagi -- atas permintaan user supaya
          penempatannya nempel sama fitur cari, bukan sejajar judul
          halaman. PelangganTable memang sudah "use client" dari awal,
          jadi exportColumns (isinya fungsi) aman didefinisikan langsung
          di sana tanpa lewat wrapper terpisah. */}
      <PageHeaderCard
        badge="Pelanggan"
        icon={Users2}
        title="Pelanggan"
        subtitle="Daftar pelanggan dan riwayat belanja mereka."
      />

      <FetchErrorBanner message={fetchErrorMsg} />

      {/* Kartu statistik dipindah ke pola .dash-kpi-card (icon chip
          bergradasi) -- sebelumnya halaman ini sudah py kartu statistik,
          tapi masih gaya lama (1 card dibagi 3 kolom, icon chip flat tanpa
          gradasi). Sekarang disamakan dengan Gudang/Produksi/Retur, class
          dipakai ulang apa adanya (lihat komentar di
          app/dashboard/gudang/page.tsx kenapa ini bukan pelanggaran
          prinsip "class per halaman"). Dibungkus CollapsibleKpiCards
          (default tersembunyi, klik buat buka) atas permintaan user
          supaya modul terasa lebih ringkas. */}
      <CollapsibleKpiCards>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="dash-kpi-card">
            <div className="dash-kpi-top">
              <span className="dash-kpi-top-left">
                <span className="dash-kpi-icon" style={{ background: "#dbeafe", color: "#2563eb" }}>
                  <Users2 size={13} />
                </span>
                <span className="dash-kpi-label">Total Pelanggan</span>
              </span>
            </div>
            <p className="dash-kpi-value font-display">{totalPelanggan}</p>
          </div>
          <div className="dash-kpi-card">
            <div className="dash-kpi-top">
              <span className="dash-kpi-top-left">
                <span className="dash-kpi-icon" style={{ background: "#d1fae5", color: "#059669" }}>
                  <ShoppingBag size={13} />
                </span>
                <span className="dash-kpi-label">Pernah Belanja</span>
              </span>
            </div>
            <p className="dash-kpi-value font-display">{pelangganAktif}</p>
          </div>
          <div className="dash-kpi-card">
            <div className="dash-kpi-top">
              <span className="dash-kpi-top-left">
                <span className="dash-kpi-icon" style={{ background: "#ffedd5", color: "#ea580c" }}>
                  <Wallet size={13} />
                </span>
                <span className="dash-kpi-label">Total Belanja Diterima</span>
              </span>
            </div>
            <p className="dash-kpi-value font-display" style={{ fontSize: 15 }}>
              Rp {totalBelanjaSemua.toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      </CollapsibleKpiCards>

      <PelangganTable dataPelanggan={dataPelanggan} />
    </div>
  );
}
