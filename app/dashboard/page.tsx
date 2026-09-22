"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart,
  Truck,
  CalendarDays,
  AlertTriangle,
  AlertCircle,
  Wallet,
  XCircle,
  ClipboardList,
  Package,
  Plus,
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  TrendingUp,
  ListChecks,
  LayoutDashboard,
} from "lucide-react";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ============================================================
   Dashboard "Hari Ini + Analisis" -- versi ke-3.

   Riwayat perubahan role Dashboard vs Laporan di sesi ini:
   1) Awalnya Dashboard punya grafik & KPI periode sendiri --
      dobel dengan Laporan yang juga py grafik+KPI serupa.
   2) Sempat di-strip total jadi snapshot-only + panel "Perlu
      Tindakan", SEMUA analisis periode (grafik, KPI finansial,
      breakdown status) dipindah ke Laporan supaya tidak dobel.
   3) User membalikkan keputusan #2: grafik & fitur analisis itu
      diminta pindah BALIK ke sini -- TAPI eksklusif, bukan
      ditambah di dua tempat. Laporan sudah dilucuti balik jadi
      cuma toolbar filter periode (instance sendiri, buat tabel)
      + tabel pesanan + export (lihat komentar di
      app/dashboard/laporan/page.tsx).

   Jadi sekarang Dashboard py 2 bagian:
   - HARI INI: snapshot 4 KPI (Supplier/Order Aktif/Menunggu
     Diproses/Stok Kritis, tanpa periode) + panel "Perlu Tindakan".
   - ANALISIS PERIODE: toggle periode sendiri (Bulan Ini/3 Bulan/
     Tahun Ini/Semua) + 4 KPI finansial + grafik Tren Pendapatan +
     breakdown Status Pesanan -- logika & definisi angkanya
     dipindah apa adanya dari Laporan versi sebelumnya (termasuk
     definisi "Pendapatan Dibuat" vs "Pendapatan Diterima" yang
     sudah dikonfirmasi lewat schema `payments`).

   Catatan jujur: "Total Pesanan" (KPI periode) dan "Order Aktif"/
   "Menunggu Diproses" (KPI snapshot) sama-sama angka jumlah
   pesanan tapi definisinya BEDA (satu dibatasi periode+status apa
   pun, satunya snapshot status tertentu saat ini) -- bukan
   duplikat literal, tapi kelihatannya mirip di mata pengguna.
   Efek sampingnya halaman ini jadi cukup panjang/padat karena
   sekarang menanggung 2 peran sekaligus.
   ============================================================ */

const WIP_STAGES = ["Produksi", "QC", "Packing", "Dikirim"];
const STAGE_HREF: Record<string, string> = {
  Produksi: "/dashboard/produksi",
  QC: "/dashboard/qc",
  Packing: "/dashboard/packing",
  Dikirim: "/dashboard/pengiriman",
};

type PeriodOrder = {
  id: string;
  no_pesanan: string | null;
  tanggal: string | null;
  total: number | null;
  dp: number | null;
  sisa_pembayaran: number | null;
  status: string | null;
  created_at: string | null;
};

const PERIODS = ["Bulan Ini", "3 Bulan", "Tahun Ini", "Semua"] as const;
type PeriodLabel = (typeof PERIODS)[number];

const STATUS_META: { key: string; color: string }[] = [
  { key: "Pesanan", color: "#3b82f6" },
  { key: "Produksi", color: "#eab308" },
  { key: "QC", color: "#a855f7" },
  { key: "Packing", color: "#f97316" },
  { key: "Dikirim", color: "#06b6d4" },
  { key: "Selesai", color: "#22c55e" },
];

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function periodStart(period: PeriodLabel): string | null {
  const now = new Date();
  if (period === "Bulan Ini") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  if (period === "3 Bulan") return new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
  if (period === "Tahun Ini") return new Date(now.getFullYear(), 0, 1).toISOString();
  return null; // "Semua" -- tidak ada batas bawah
}

export default function DashboardPage() {
  const supabase = createClient();
  const [adminName, setAdminName] = useState("Administrator");

  // --- state snapshot (fetch sekali saat mount) ---
  const [stats, setStats] = useState({ totalSupplier: 0 });
  const [statusOrders, setStatusOrders] = useState<{ status: string; count: number }[]>([
    { status: "Pesanan", count: 0 },
    { status: "Produksi", count: 0 },
    { status: "QC", count: 0 },
    { status: "Packing", count: 0 },
    { status: "Dikirim", count: 0 },
    { status: "Selesai", count: 0 },
  ]);
  const [criticalMaterials, setCriticalMaterials] = useState<
    { id: string; nama_bahan: string; stok: number; stok_minimum: number; satuan: string | null }[]
  >([]);
  const [belumLunas, setBelumLunas] = useState<{ id: string; sisa_pembayaran: number }[]>([]);
  const [qcBermasalah, setQcBermasalah] = useState<{ id: string; hasil: string }[]>([]);
  const [totalSisaSemua, setTotalSisaSemua] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // --- state analisis periode (fetch ulang tiap period berubah) ---
  const [period, setPeriod] = useState<PeriodLabel>("Bulan Ini");
  const [periodLoading, setPeriodLoading] = useState(true);
  const [periodOrders, setPeriodOrders] = useState<PeriodOrder[]>([]);
  const [pendapatanDiterima, setPendapatanDiterima] = useState(0);
  // Permintaan user: panel "Analisis Periode" (toggle periode + 4 KPI
  // finansial + grafik + breakdown status) defaultnya DITUTUP, tinggal 1
  // kartu ringkasan yang bisa diklik -- supaya tampilan awal Dashboard
  // tidak langsung penuh 8 kartu + 2 panel sekaligus. Fetch datanya (di
  // fetchPeriodAnalysis) TIDAK berubah -- tetap jalan di background
  // walau panelnya sedang tertutup, biar ringkasan di kartu selalu akurat
  // begitu dibuka.
  const [showAnalysis, setShowAnalysis] = useState(false);
  // Permintaan user: snapshot 4 KPI "Hari Ini" (Supplier/Order Aktif/
  // Menunggu Diproses/Stok Kritis) juga bisa disembunyikan, pola SAMA
  // PERSIS seperti kartu ringkasan Analisis Periode di atas (pakai class
  // CSS dash-collapse-* yang sama, tidak ada CSS baru). Datanya (stats,
  // orderAktif, dst) tidak berubah -- tetap fetch seperti biasa terlepas
  // dari showSnapshot, cuma cara TAMPILnya yang di-collapse.
  const [showSnapshot, setShowSnapshot] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchPeriodAnalysis(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function fetchStats() {
    const [
      {
        data: { user },
      },
      { count: suppliersCount, error: suppliersCountError },
      { data: allOrders, error: allOrdersError },
      { data: criticalMaterialsData, error: criticalMaterialsError },
      { data: belumLunasData, error: belumLunasError },
      { data: qcBermasalahData, error: qcBermasalahError },
      { data: sisaAll, error: sisaError },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("suppliers").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("status"),
      supabase
        .from("raw_materials")
        .select("id, nama_bahan, stok, stok_minimum, satuan")
        .eq("status", "Kritis")
        .order("stok", { ascending: true }),
      supabase.from("orders").select("id, sisa_pembayaran").in("status", ["Dikirim", "Selesai"]).gt("sisa_pembayaran", 0),
      supabase.from("quality_control").select("id, hasil").in("hasil", ["Perbaikan", "Gagal"]),
      // Saldo piutang SELALU dihitung dari SEMUA pesanan (tidak ikut
      // filter periode) -- query ringan, cuma 1 kolom, tanpa batas
      // tanggal, dipakai buat KPI "Sisa Belum Dibayar" di panel analisis.
      supabase.from("orders").select("sisa_pembayaran"),
    ]);

    const queryErrors = [
      suppliersCountError,
      allOrdersError,
      criticalMaterialsError,
      belumLunasError,
      qcBermasalahError,
      sisaError,
    ].filter(Boolean);
    if (queryErrors.length > 0) {
      queryErrors.forEach((e) => console.error("Dashboard fetch error:", e?.message));
      setFetchError(
        "sebagian statistik mungkin tidak akurat (" + queryErrors.length + " query gagal dimuat)"
      );
    } else {
      setFetchError(null);
    }

    setCriticalMaterials(criticalMaterialsData ?? []);
    setBelumLunas(belumLunasData ?? []);
    setQcBermasalah(qcBermasalahData ?? []);
    setTotalSisaSemua(
      (sisaAll || []).reduce((sum: number, o: any) => sum + (Number(o.sisa_pembayaran) || 0), 0)
    );

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) setAdminName(profile.full_name);
    }

    const statusCount = [
      { status: "Pesanan", count: 0 },
      { status: "Produksi", count: 0 },
      { status: "QC", count: 0 },
      { status: "Packing", count: 0 },
      { status: "Dikirim", count: 0 },
      { status: "Selesai", count: 0 },
    ];
    allOrders?.forEach((o: any) => {
      const idx = statusCount.findIndex((s) => s.status === o.status);
      if (idx >= 0) statusCount[idx].count++;
    });
    setStatusOrders(statusCount);

    setStats({ totalSupplier: suppliersCount || 0 });
    setLoading(false);
  }

  async function fetchPeriodAnalysis(currentPeriod: PeriodLabel) {
    setPeriodLoading(true);
    const start = periodStart(currentPeriod);

    let ordersQuery = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (start) ordersQuery = ordersQuery.gte("created_at", start);

    let paymentsQuery = supabase.from("payments").select("jumlah, created_at");
    if (start) paymentsQuery = paymentsQuery.gte("created_at", start);

    // Dibungkus try/catch sendiri -- tabel "payments" opsional (baru ada
    // setelah migrasi tertentu dijalankan), jadi kalau query-nya gagal
    // total, tidak boleh ikut menjatuhkan Promise.all di bawah.
    async function safePaymentsQuery(): Promise<{ data: { jumlah: number }[] | null; error: any }> {
      try {
        const r = await paymentsQuery;
        return { data: r.data, error: r.error };
      } catch (e) {
        return { data: null, error: e };
      }
    }

    const [{ data: orders, error: ordersError }, { data: paymentsRows, error: paymentsError }] =
      await Promise.all([ordersQuery, safePaymentsQuery()]);

    if (ordersError) {
      console.error("Dashboard periode fetch error:", ordersError.message);
    }
    // payments.error sengaja tidak memicu FetchErrorBanner -- tabel ini
    // opsional, jadi diam-diam dianggap 0 kalau gagal/belum ada.
    if (paymentsError) {
      console.error("Dashboard payments fetch error (diabaikan, tabel opsional):", paymentsError.message);
    }

    const rows = (orders || []) as PeriodOrder[];
    setPeriodOrders(rows);

    // DP diasumsikan dibayar saat pesanan dibuat -- diatribusikan ke
    // tanggal pesanan, jadi cukup dijumlah dari `rows` (sudah dibatasi
    // periode lewat query orders di atas).
    const totalDpPeriod = rows.reduce((sum, o) => sum + (Number(o.dp) || 0), 0);
    const totalPelunasanPeriod = (paymentsRows || []).reduce((sum, p) => sum + (Number(p.jumlah) || 0), 0);
    setPendapatanDiterima(totalDpPeriod + totalPelunasanPeriod);

    setPeriodLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 animate-pulse">
        <div>
          <div className="h-6 w-40 rounded-full bg-gray-200 dark:bg-[#21262d] mb-3" />
          <div className="h-8 w-56 rounded-lg bg-gray-200 dark:bg-[#21262d]" />
        </div>
        <div className="h-16 rounded-2xl bg-gray-100 dark:bg-[#161b22]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-24" style={{ border: "none" }} />
          ))}
        </div>
        <div className="card h-40" style={{ border: "none" }} />
      </div>
    );
  }

  const totalOrders = statusOrders.reduce((sum, s) => sum + s.count, 0);
  const selesaiCount = statusOrders.find((s) => s.status === "Selesai")?.count ?? 0;
  const orderAktif = totalOrders - selesaiCount;
  const pesananBaruCount = statusOrders.find((s) => s.status === "Pesanan")?.count ?? 0;

  const wipStatuses = statusOrders.filter((s) => WIP_STAGES.includes(s.status));
  const wipTotal = wipStatuses.reduce((sum, s) => sum + s.count, 0);
  const bottleneck = wipStatuses.length > 0 ? wipStatuses.reduce((a, b) => (b.count > a.count ? b : a)) : null;

  const actionItems: {
    key: string;
    icon: typeof AlertTriangle;
    color: string;
    bg: string;
    label: string;
    sub: string;
    href: string;
  }[] = [];

  if (criticalMaterials.length > 0) {
    actionItems.push({
      key: "materials",
      icon: AlertTriangle,
      color: "#dc2626",
      bg: "#fee2e2",
      label: `${criticalMaterials.length} bahan baku stok kritis`,
      sub: criticalMaterials
        .slice(0, 3)
        .map((m) => `${m.nama_bahan} (${m.stok}${m.satuan ? " " + m.satuan : ""})`)
        .join(", ") + (criticalMaterials.length > 3 ? `, +${criticalMaterials.length - 3} lagi` : ""),
      href: "/dashboard/gudang",
    });
  }
  if (belumLunas.length > 0) {
    const totalSisaAktif = belumLunas.reduce((sum, o) => sum + (o.sisa_pembayaran || 0), 0);
    actionItems.push({
      key: "belum-lunas",
      icon: Wallet,
      color: "#b45309",
      bg: "#ffedd5",
      label: `${belumLunas.length} pesanan terkirim, belum lunas`,
      sub: `Total sisa tagihan Rp ${totalSisaAktif.toLocaleString("id-ID")}`,
      href: "/dashboard/laporan",
    });
  }
  if (qcBermasalah.length > 0) {
    actionItems.push({
      key: "qc",
      icon: XCircle,
      color: "#7e22ce",
      bg: "#f3e8ff",
      label: `${qcBermasalah.length} hasil QC butuh tindak lanjut`,
      sub: "Perlu perbaikan atau gagal QC",
      href: "/dashboard/qc",
    });
  }
  // Sinyal "tahap mana yang menumpuk" -- cuma dimunculkan kalau SATU
  // tahap sendirian menampung lebih banyak pesanan daripada gabungan
  // semua tahap WIP lainnya (bottleneck beneran, bukan sekadar tahap
  // yang kebetulan terbanyak hari itu).
  if (bottleneck && wipTotal > 0 && bottleneck.count > wipTotal - bottleneck.count) {
    actionItems.push({
      key: "bottleneck",
      icon: Package,
      color: "#1d4ed8",
      bg: "#dbeafe",
      label: `${bottleneck.count} pesanan menumpuk di tahap ${bottleneck.status}`,
      sub: "Lebih banyak dari gabungan tahap lain yang sedang berjalan",
      href: STAGE_HREF[bottleneck.status] || "/dashboard/produksi",
    });
  }
  if (pesananBaruCount > 0) {
    actionItems.push({
      key: "pesanan-baru",
      icon: ClipboardList,
      color: "#1d4ed8",
      bg: "#dbeafe",
      label: `${pesananBaruCount} pesanan baru menunggu diproses`,
      sub: "Status masih “Pesanan”",
      href: "/dashboard/pesanan",
    });
  }

  // --- turunan buat panel Analisis Periode ---
  const totalPesananPeriode = periodOrders.length;
  const totalDibuatPeriode = periodOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const statusCountPeriode = STATUS_META.map((s) => ({ ...s, count: 0 }));
  periodOrders.forEach((o) => {
    const idx = statusCountPeriode.findIndex((s) => s.key === o.status);
    if (idx >= 0) statusCountPeriode[idx].count++;
  });
  const maxStatusPeriode = Math.max(...statusCountPeriode.map((s) => s.count), 1);

  // Grafik: "Bulan Ini" di-bucket per minggu (kalau per bulan cuma jadi
  // 1 titik, tidak informatif) -- periode lain di-bucket per bulan.
  const chartData: { label: string; total: number }[] = [];
  if (period === "Bulan Ini") {
    const buckets = [
      { label: "Mgg 1", from: 1, to: 7, total: 0 },
      { label: "Mgg 2", from: 8, to: 14, total: 0 },
      { label: "Mgg 3", from: 15, to: 21, total: 0 },
      { label: "Mgg 4", from: 22, to: 31, total: 0 },
    ];
    periodOrders.forEach((o) => {
      const d = new Date(o.tanggal || o.created_at || "");
      if (Number.isNaN(d.getTime())) return;
      const day = d.getDate();
      const bucket = buckets.find((b) => day >= b.from && day <= b.to);
      if (bucket) bucket.total += Number(o.total) || 0;
    });
    chartData.push(...buckets.map((b) => ({ label: b.label, total: b.total })));
  } else {
    const monthMap = new Map<string, { label: string; total: number }>();
    periodOrders.forEach((o) => {
      const d = new Date(o.tanggal || o.created_at || "");
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
      if (!monthMap.has(key)) monthMap.set(key, { label, total: 0 });
      monthMap.get(key)!.total += Number(o.total) || 0;
    });
    chartData.push(
      ...Array.from(monthMap.entries())
        .sort((a, b) => (a[0] > b[0] ? 1 : -1))
        .map(([, v]) => v)
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="Ringkasan & Analisis"
        icon={CalendarDays}
        title="Dashboard"
        subtitle="Ringkasan aktivitas dan tren pesanan SCM Djogker."
      />

      <FetchErrorBanner message={fetchError} />

      <div className="dash-slim-bar">
        <div className="dash-slim-greet">
          <span className="dash-slim-avatar">{adminName.charAt(0).toUpperCase()}</span>
          <div className="dash-slim-greet-text">
            <h2 className="font-display">Selamat Datang, {adminName}</h2>
            <p>
              {orderAktif} order aktif &middot; {actionItems.length} perlu tindakan
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/pesanan"
            className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", fontSize: 11, borderRadius: 8, textDecoration: "none" }}
          >
            <Plus size={12} /> Pesanan Baru
          </Link>
          <Link
            href="/dashboard/gudang"
            className="btn-outline"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", fontSize: 11, borderRadius: 8, textDecoration: "none" }}
          >
            <Plus size={12} /> Bahan Baku
          </Link>
        </div>
      </div>

      {/* Kartu ringkasan "Snapshot Hari Ini" -- diklik buat buka/tutup 4
          kartu KPI di bawahnya (showSnapshot), pola sama persis seperti
          kartu Analisis Periode di bawah. */}
      <div
        className={"dash-collapse-card" + (showSnapshot ? " is-open" : "")}
        onClick={() => setShowSnapshot((v) => !v)}
      >
        <div className="dash-collapse-left">
          <span className="dash-collapse-icon">
            <LayoutDashboard size={15} />
          </span>
          <div>
            <p className="dash-collapse-title">Snapshot Hari Ini</p>
            <p className="dash-collapse-sub">
              {stats.totalSupplier} supplier · {orderAktif} order aktif · {pesananBaruCount} menunggu diproses ·{" "}
              {criticalMaterials.length} stok kritis
            </p>
          </div>
        </div>
        <ChevronDown size={16} className="dash-collapse-chev" />
      </div>

      {/* Dulu blok ini conditional-render (showSnapshot && <div>...) yang
          bikin 4 kartu KPI muncul/hilang instan tanpa transisi. Sekarang
          selalu di-mount, tinggi 0<->1fr yang dianimasikan lewat CSS
          grid-template-rows (.dash-collapse-body-wrap), jadi buka/tutupnya
          nge-slide halus senada sama chevron-nya. */}
      <div className={"dash-collapse-body-wrap" + (showSnapshot ? " is-open" : "")}>
        <div className="dash-collapse-body-inner">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link href="/dashboard/supplier" className="dash-kpi-card is-link">
              <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}>
                <Truck size={14} />
              </span>
              <p className="dash-kpi-label">SUPPLIER</p>
              <p className="dash-kpi-value font-display">{stats.totalSupplier}</p>
              <p className="dash-kpi-hint">Supplier aktif</p>
            </Link>

            <div className="dash-kpi-card">
              <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#fb923c,#ea580c)" }}>
                <ShoppingCart size={14} />
              </span>
              <p className="dash-kpi-label">ORDER AKTIF</p>
              <p className="dash-kpi-value font-display">{orderAktif}</p>
              <p className="dash-kpi-hint">Belum sampai status Selesai</p>
            </div>

            <Link href="/dashboard/pesanan" className="dash-kpi-card is-link">
              <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#22d3ee,#0891b2)" }}>
                <ClipboardList size={14} />
              </span>
              <p className="dash-kpi-label">MENUNGGU DIPROSES</p>
              <p className="dash-kpi-value font-display">{pesananBaruCount}</p>
              <p className="dash-kpi-hint">Status masih “Pesanan”</p>
            </Link>

            <Link href="/dashboard/gudang" className="dash-kpi-card is-link">
              <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#f87171,#dc2626)" }}>
                <AlertTriangle size={14} />
              </span>
              <p className="dash-kpi-label">STOK KRITIS</p>
              <p className="dash-kpi-value font-display">{criticalMaterials.length}</p>
              <p className="dash-kpi-hint">Bahan baku perlu diisi ulang</p>
            </Link>
          </div>
        </div>
      </div>

      <div className="dash-action-card">
        <div className="dash-action-head">
          <span className="dash-action-head-title">Perlu Tindakan</span>
          {actionItems.length > 0 && <span className="dash-action-count">{actionItems.length} item</span>}
        </div>
        {actionItems.length === 0 ? (
          <p className="dash-action-empty">Tidak ada yang butuh tindakan saat ini.</p>
        ) : (
          actionItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.key} href={item.href} className="dash-action-row">
                <span className="dash-action-icon" style={{ background: item.bg }}>
                  <Icon size={15} style={{ color: item.color }} />
                </span>
                <div className="dash-action-body">
                  <p className="dash-action-label">{item.label}</p>
                  <p className="dash-action-sub">{item.sub}</p>
                </div>
                <ChevronRight size={14} className="dash-action-chev" />
              </Link>
            );
          })
        )}
      </div>

      {/* Kartu ringkasan "Analisis Periode" -- diklik buat buka/tutup
          panel di bawahnya (showAnalysis). Ringkasan angkanya (jumlah
          pesanan, pendapatan dibuat/diterima) tetap update walau panel
          sedang tertutup, karena fetchPeriodAnalysis tetap jalan seperti
          biasa terlepas dari showAnalysis. */}
      <div
        className={"dash-collapse-card" + (showAnalysis ? " is-open" : "")}
        onClick={() => setShowAnalysis((v) => !v)}
      >
        <div className="dash-collapse-left">
          <span className="dash-collapse-icon">
            <TrendingUp size={15} />
          </span>
          <div>
            <p className="dash-collapse-title">Analisis Periode -- {period}</p>
            <p className="dash-collapse-sub">
              {periodLoading
                ? "Memuat..."
                : `${totalPesananPeriode} pesanan · ${formatRupiah(totalDibuatPeriode)} dibuat · ${formatRupiah(pendapatanDiterima)} diterima`}
            </p>
          </div>
        </div>
        <ChevronDown size={16} className="dash-collapse-chev" />
      </div>

      {/* Sama seperti Snapshot Hari Ini di atas -- dulu conditional-render,
          sekarang selalu di-mount, buka/tutupnya dianimasikan CSS lewat
          .dash-collapse-body-wrap supaya tidak "patah" lagi. */}
      <div className={"dash-collapse-body-wrap" + (showAnalysis ? " is-open" : "")}>
        <div className="dash-collapse-body-inner">
        <div className="dash-collapse-body">
          <div className="dash-analysis-toolbar" style={{ justifyContent: "flex-end" }}>
            <div className="dash-period-toggle">
              {PERIODS.map((p) => (
                <button key={p} className={period === p ? "is-active" : ""} onClick={() => setPeriod(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {periodLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card h-24" style={{ border: "none" }} />
                ))}
              </div>
              <div className="card h-40" style={{ border: "none" }} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="dash-kpi-card">
                  <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}>
                    <ShoppingBag size={14} />
                  </span>
                  {/* Label diubah dari "TOTAL PESANAN" -- kata "Total" bikin
                      kartu ini kelihatan seperti angka global yang sama
                      dengan "Order Aktif"/"Menunggu Diproses" di panel Hari
                      Ini, padahal definisinya beda (dibatasi periode yang
                      dipilih, bukan snapshot status saat ini). Label baru
                      menegaskan cakupan periode-nya langsung di judul, tidak
                      cuma di hint kecil di bawahnya. */}
                  <p className="dash-kpi-label">PESANAN PERIODE INI</p>
                  <p className="dash-kpi-value font-display">{totalPesananPeriode}</p>
                  <p className="dash-kpi-hint">Periode {period.toLowerCase()}</p>
                </div>
                <div className="dash-kpi-card">
                  <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#34d399,#059669)" }}>
                    <TrendingUp size={14} />
                  </span>
                  <p className="dash-kpi-label">PENDAPATAN DIBUAT</p>
                  <p className="dash-kpi-value font-display">{formatRupiah(totalDibuatPeriode)}</p>
                  <p className="dash-kpi-hint">Nilai pesanan dibuat periode ini</p>
                </div>
                <div className="dash-kpi-card">
                  <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#22d3ee,#0891b2)" }}>
                    <Wallet size={14} />
                  </span>
                  <p className="dash-kpi-label">PENDAPATAN DITERIMA</p>
                  <p className="dash-kpi-value font-display">{formatRupiah(pendapatanDiterima)}</p>
                  <p className="dash-kpi-hint">DP + pelunasan masuk periode ini</p>
                </div>
                <div className="dash-kpi-card">
                  <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#fb923c,#ea580c)" }}>
                    <AlertCircle size={14} />
                  </span>
                  <p className="dash-kpi-label">SISA BELUM DIBAYAR</p>
                  <p className="dash-kpi-value font-display">{formatRupiah(totalSisaSemua)}</p>
                  <p className="dash-kpi-hint is-warn">Akumulasi semua pesanan, bukan per periode</p>
                </div>
              </div>

              <div className="dash-analysis-grid">
            <div className="dash-panel-card">
              <div className="dash-panel-head">
                <TrendingUp size={13} />
                Tren Pendapatan Dibuat
              </div>
              {chartData.every((c) => c.total === 0) ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data pendapatan di periode ini.</p>
              ) : (
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorDash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--djoker-border)" vertical={false} />
                    <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, "Pendapatan"]}
                      contentStyle={{ background: "var(--djoker-surface)", border: "none", borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: "var(--djoker-text)" }}
                      labelStyle={{ color: "var(--djoker-text)" }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#059669" strokeWidth={2} fill="url(#colorDash)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="dash-panel-card">
              <div className="dash-panel-head">
                <ListChecks size={13} />
                Status Pesanan (periode ini)
              </div>
              {statusCountPeriode.map((s) => (
                <div key={s.key} className="dash-bar-row">
                  <span className="dash-bar-label">{s.key}</span>
                  <span className="dash-bar-track">
                    <span
                      className="dash-bar-fill"
                      style={{ width: `${Math.max((s.count / maxStatusPeriode) * 100, s.count > 0 ? 4 : 0)}%`, background: s.color }}
                    />
                  </span>
                  <span className="dash-bar-num">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
