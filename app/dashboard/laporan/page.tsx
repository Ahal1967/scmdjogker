"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText } from "lucide-react";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";
import ExportButtons from "./ExportButtons";
import LaporanTable from "./LaporanTable";

/* ============================================================
   Laporan Pesanan -- SEKARANG cuma tabel + export per periode.

   Analisis (grafik Tren Pendapatan, 4 KPI finansial, breakdown
   Status Pesanan) yang sebelumnya ada di halaman ini sudah
   dipindah SELURUHNYA ke Dashboard atas permintaan user --
   BUKAN ditambah di dua tempat, tapi dipindah eksklusif (lihat
   komentar besar di app/dashboard/page.tsx). Laporan sekarang
   murni "cari, filter periode, & export data pesanan mentah",
   Dashboard yang jadi halaman analisis.

   Toggle periode di sini TETAP ADA, instance-nya sendiri
   (`.laporan-period-toggle`, terpisah dari `.dash-period-toggle`
   milik Dashboard) -- masih perlu buat membatasi query tabel &
   penamaan file export, bukan lagi buat KPI/grafik apa pun.
   ============================================================ */

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

const PERIODS = ["Bulan Ini", "3 Bulan", "Tahun Ini", "Semua"] as const;
type PeriodLabel = (typeof PERIODS)[number];

function periodStart(period: PeriodLabel): string | null {
  const now = new Date();
  if (period === "Bulan Ini") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  if (period === "3 Bulan") return new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
  if (period === "Tahun Ini") return new Date(now.getFullYear(), 0, 1).toISOString();
  return null; // "Semua" -- tidak ada batas bawah
}

export default function LaporanPage() {
  const supabase = createClient();
  const [period, setPeriod] = useState<PeriodLabel>("Bulan Ini");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dataOrders, setDataOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchLaporan(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function fetchLaporan(currentPeriod: PeriodLabel) {
    setLoading(true);
    const start = periodStart(currentPeriod);

    let ordersQuery = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (start) ordersQuery = ordersQuery.gte("created_at", start);

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error("Laporan orders fetch error:", ordersError.message);
      setFetchError("sebagian data mungkin tidak akurat (data pesanan gagal dimuat)");
    } else {
      setFetchError(null);
    }

    setDataOrders((orders || []) as Order[]);
    setLoading(false);
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageHeaderCard
          badge="Data Pesanan"
          icon={FileText}
          title="Laporan Pesanan"
          subtitle="Cari, filter periode, dan export daftar pesanan."
        />
        <ExportButtons orders={dataOrders} periodLabel={period} />
      </div>

      <FetchErrorBanner message={fetchError} />

      <div className="laporan-toolbar">
        <div className="laporan-period-toggle">
          {PERIODS.map((p) => (
            <button key={p} className={period === p ? "is-active" : ""} onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card h-40" style={{ border: "none" }} />
      ) : (
        <LaporanTable dataOrders={dataOrders} />
      )}
    </div>
  );
}
