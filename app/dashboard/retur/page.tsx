import { createClient } from "@/lib/supabase/server";
import { Undo2, Clock, RefreshCw, ListChecks } from "lucide-react";
import ReturTable from "./ReturTable";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";

export default async function ReturPage() {
  const supabase = createClient();

  // 2 query independen ditembak bareng (pola sama seperti GudangTable yang
  // butuh daftar suppliers buat referensi) -- returnsRaw buat isi tabel,
  // ordersRaw buat daftar referensi di sheet "Pilih Pesanan" pas nambah
  // retur baru (butuh no_pesanan + nama pelanggan buat dicari, dan daftar
  // order_items-nya buat opsi "item yang diretur").
  const [
    { data: returnsRaw, error: returnsError },
    { data: ordersRaw, error: ordersError },
  ] = await Promise.all([
    supabase
      .from("returns")
      .select("*, orders(no_pesanan, customers(nama)), order_items(nama_produk, ukuran)")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, no_pesanan, customers(nama), order_items(id, nama_produk, ukuran, jumlah)")
      .order("created_at", { ascending: false }),
  ]);

  if (returnsError) console.error("Retur fetch error:", returnsError.message);
  if (ordersError) console.error("Retur orders-ref fetch error:", ordersError.message);
  const fetchErrorMsg = [returnsError?.message, ordersError?.message].filter(Boolean).join("; ") || null;

  // Supabase kadang balikin relasi many-to-one sebagai array 1-elemen,
  // kadang sebagai object langsung, tergantung cara FK-nya kedetect --
  // dinormalisasi di sini (pola sama seperti GudangTable.tsx buat relasi
  // suppliers) supaya ReturTable.tsx di sisi klien bisa asumsikan bentuknya
  // selalu object/null, tidak perlu jaga-jaga dobel di banyak tempat.
  function one<T>(v: T | T[] | null | undefined): T | null {
    if (Array.isArray(v)) return v[0] ?? null;
    return v ?? null;
  }

  const returns = (returnsRaw ?? []).map((r: any) => {
    const ord = one<any>(r.orders);
    return {
      ...r,
      orders: ord ? { ...ord, customers: one(ord.customers) } : null,
      order_items: one(r.order_items),
    };
  });

  const orders = (ordersRaw ?? []).map((o: any) => ({
    ...o,
    customers: one(o.customers),
    order_items: o.order_items ?? [],
  }));

  const totalRetur = returns.length;
  const totalDiajukan = returns.filter((r) => r.status === "Diajukan").length;
  const totalDiproses = returns.filter((r) => r.status === "Diproses").length;
  const totalSelesai = returns.filter((r) => r.status === "Selesai" || r.status === "Ditolak").length;

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="Pengembalian Produk"
        icon={Undo2}
        title="Retur"
        subtitle="Catat dan pantau pengajuan retur produk dari pelanggan."
      />

      <FetchErrorBanner message={fetchErrorMsg} />

      {/* Kartu statistik dipindah ke pola .dash-kpi-card (icon chip
          bergradasi) -- dipakai ulang apa adanya dari Dashboard, lihat
          komentar sejenis di app/dashboard/gudang/page.tsx. Kartu terakhir
          ("Selesai/Ditolak") sengaja dikasih warna netral (slate), bukan
          hijau -- karena angkanya menggabungkan 2 hasil akhir yang
          berlawanan (selesai = baik, ditolak = tidak), jadi hijau akan
          menyesatkan seolah semuanya hasil positif. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="dash-kpi-card">
          <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}>
            <Undo2 size={14} />
          </span>
          <p className="dash-kpi-label">TOTAL RETUR</p>
          <p className="dash-kpi-value font-display">{totalRetur}</p>
        </div>
        <div className="dash-kpi-card">
          <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#fbbf24,#d97706)" }}>
            <Clock size={14} />
          </span>
          <p className="dash-kpi-label">DIAJUKAN</p>
          <p className="dash-kpi-value font-display">{totalDiajukan}</p>
        </div>
        <div className="dash-kpi-card">
          <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#fb923c,#ea580c)" }}>
            <RefreshCw size={14} />
          </span>
          <p className="dash-kpi-label">DIPROSES</p>
          <p className="dash-kpi-value font-display">{totalDiproses}</p>
        </div>
        <div className="dash-kpi-card">
          <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#94a3b8,#64748b)" }}>
            <ListChecks size={14} />
          </span>
          <p className="dash-kpi-label">SELESAI/DITOLAK</p>
          <p className="dash-kpi-value font-display">{totalSelesai}</p>
        </div>
      </div>

      <ReturTable initialReturns={returns} orders={orders} />
    </div>
  );
}
