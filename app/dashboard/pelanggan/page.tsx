import { createClient } from "@/lib/supabase/server";
import PelangganTable from "./PelangganTable";
import ExportButtonsPelanggan from "./ExportButtonsPelanggan";
import { Users2, ShoppingBag, Wallet } from "lucide-react";

export default async function PelangganPage() {
  const supabase = createClient();

  const [{ data: customers }, { data: orders }] = await Promise.all([
    supabase.from("customers").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("customer_id, total, sisa_pembayaran"),
  ]);

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
        <div>
          <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">PELANGGAN</span>
          <h1 className="font-display text-2xl font-bold text-black dark:text-white">Pelanggan</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Daftar pelanggan dan riwayat belanja mereka.</p>
        </div>
        <ExportButtonsPelanggan dataPelanggan={dataPelanggan} />
      </div>

      <div className="card p-0 overflow-hidden" style={{ border: "none" }}>
        <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-700 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100/60 dark:bg-blue-900/30">
              <Users2 size={20} className="text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalPelanggan}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Pelanggan</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100/60 dark:bg-green-900/30">
              <ShoppingBag size={20} className="text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{pelangganAktif}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pernah Belanja</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100/60 dark:bg-orange-900/30">
              <Wallet size={20} className="text-orange-600 dark:text-orange-400" />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-black dark:text-white">
                Rp {totalBelanjaSemua.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Belanja Diterima</p>
            </div>
          </div>
        </div>
      </div>

      <PelangganTable dataPelanggan={dataPelanggan} />
    </div>
  );
}
