import { createClient } from "@/lib/supabase/server";
import PelangganTable from "./PelangganTable";
import ExportButtonsPelanggan from "./ExportButtonsPelanggan";
import { Users2, ShoppingBag, Wallet } from "lucide-react";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeaderCard
          badge="PELANGGAN"
          icon={Users2}
          title="Pelanggan"
          subtitle="Daftar pelanggan dan riwayat belanja mereka."
        />
        <ExportButtonsPelanggan dataPelanggan={dataPelanggan} />
      </div>

      <FetchErrorBanner message={fetchErrorMsg} />

      <div className="card p-0 overflow-hidden" style={{ border: "none" }}>
        <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-700 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          <div className="flex items-center gap-2.5 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100/60 dark:bg-blue-900/30">
              <Users2 size={15} className="text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="font-display text-base font-bold text-black dark:text-white">{totalPelanggan}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Total Pelanggan</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100/60 dark:bg-green-900/30">
              <ShoppingBag size={15} className="text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="font-display text-base font-bold text-black dark:text-white">{pelangganAktif}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Pernah Belanja</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100/60 dark:bg-orange-900/30">
              <Wallet size={15} className="text-orange-600 dark:text-orange-400" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-black dark:text-white">
                Rp {totalBelanjaSemua.toLocaleString("id-ID")}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Total Belanja Diterima</p>
            </div>
          </div>
        </div>
      </div>

      <PelangganTable dataPelanggan={dataPelanggan} />
    </div>
  );
}
