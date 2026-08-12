import { createClient } from "@/lib/supabase/server";
import ExportButtons from "./ExportButtons";
import LaporanTable from "./LaporanTable";
import { ShoppingBag, Wallet, HandCoins, AlertCircle } from "lucide-react";

type Order = {
  id: string;
  no_pesanan: string | null;
  tanggal: string | null;
  total: number | null;
  dp: number | null;
  sisa_pembayaran: number | null;
  status: string | null;
  alamat_pengiriman: string | null;
  created_at: string | null;
};

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default async function LaporanPage() {
  const supabase = createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  const dataOrders = (orders || []) as Order[];

  const totalOrders = dataOrders.length;
  const totalRevenue = dataOrders.reduce((sum, o) => sum + ((Number(o.total) || 0) - (Number(o.sisa_pembayaran) || 0)), 0);
  const totalDP = dataOrders.reduce((sum, o) => sum + (Number(o.dp) || 0), 0);
  const totalSisa = dataOrders.reduce((sum, o) => sum + (Number(o.sisa_pembayaran) || 0), 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">ANALISIS</span>
          <h1 className="font-display text-2xl font-bold text-black dark:text-white">Laporan Pesanan</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Ringkasan dan daftar semua pesanan pelanggan.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons orders={dataOrders} />
        </div>
      </div>

      <div className="card p-0 overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-700 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/40">
              <ShoppingBag size={20} className="text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalOrders}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Pesanan</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/40">
              <Wallet size={20} className="text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-black dark:text-white">{formatRupiah(totalRevenue)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pendapatan Diterima</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-900/40">
              <HandCoins size={20} className="text-cyan-600 dark:text-cyan-400" />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-black dark:text-white">{formatRupiah(totalDP)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total DP Diterima</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/40">
              <AlertCircle size={20} className="text-orange-600 dark:text-orange-400" />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-black dark:text-white">{formatRupiah(totalSisa)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sisa Belum Dibayar</p>
            </div>
          </div>
        </div>
      </div>

      <LaporanTable dataOrders={dataOrders} />
    </div>
  );
}
