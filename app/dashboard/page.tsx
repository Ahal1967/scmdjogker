"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart,
  Users,
  Truck,
  TrendingUp,
  CalendarDays,
  BadgeCheck,
  ListChecks,
  Gauge,
  AlertTriangle,
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

const STATUS_COLORS: Record<string, string> = {
  Pesanan: "#3b82f6",
  Produksi: "#eab308",
  QC: "#a855f7",
  Packing: "#f97316",
  Dikirim: "#06b6d4",
  Selesai: "#22c55e",
};

export default function DashboardPage() {
  const supabase = createClient();
  const [adminName, setAdminName] = useState("Administrator");
  const [stats, setStats] = useState({
    totalPesanan: 0,
    totalProduksi: 0,
    totalPelanggan: 0,
    totalSupplier: 0,
    totalPendapatan: 0,
    pesananBulanIni: 0,
    produksiSelesai: 0,
  });
  const [statusOrders, setStatusOrders] = useState([
    { status: "Pesanan", count: 0 },
    { status: "Produksi", count: 0 },
    { status: "QC", count: 0 },
    { status: "Packing", count: 0 },
    { status: "Dikirim", count: 0 },
    { status: "Selesai", count: 0 },
  ]);
  // Sebelumnya admin cuma tahu ada bahan baku yang stoknya kritis kalau
  // kebetulan buka halaman Gudang dan lihat sendiri badge "Kritis"-nya --
  // ditampilkan aktif di sini (halaman pertama setelah login) supaya
  // ketahuan dari awal, bukan pas produksi sudah kepentok kehabisan bahan.
  const [criticalMaterials, setCriticalMaterials] = useState<
    { id: string; nama_bahan: string; stok: number; stok_minimum: number; satuan: string | null }[]
  >([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ bulan: string; pendapatan: number }[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<{ total: number; changePct: number | null }>({
    total: 0,
    changePct: null,
  });
  const [loading, setLoading] = useState(true);
  // Sebelumnya tidak ada satu pun dari 12 query paralel di bawah yang dicek
  // errornya -- kalau salah satu gagal, dashboard cuma nampilin 0/kosong
  // tanpa indikasi bahwa itu KEGAGALAN, bukan memang datanya kosong.
  const [fetchError, setFetchError] = useState<string | null>(null);

  /* Cuma 2 angka yang tidak ditampilkan di tempat lain manapun di Dashboard
     (Total Pesanan/Produksi/Pelanggan/Pendapatan semuanya sudah kelihatan di
     welcome-hero & panel Progress Produksi) -- makanya cuma dua ini yang
     dipertahankan sebagai card sendiri, sisanya sengaja dihapus atas
     permintaan user biar tidak dobel & lebih ringkas. */
  const premiumStats = [
    { key: "supplier", title: "Supplier", value: stats.totalSupplier, hint: "supplier aktif", icon: Truck, accent: "blue", href: "/dashboard/supplier" },
    { key: "pesananBulanIni", title: "Pesanan Bulan Ini", value: stats.pesananBulanIni, hint: "pesanan masuk bulan ini", icon: CalendarDays, accent: "cyan", href: "/dashboard/laporan" },
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
    // Jendela 6 bulan SEBELUM sixMonthsAgo -- dipakai buat hitung persentase
    // tren "naik/turun vs periode lalu" di card Tren Pendapatan (bukan cuma
    // bulan-ke-bulan, tapi bener-bener bandingin 2 periode 6 bulanan).
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

    /* Semua query di bawah ini independen satu sama lain (tidak ada yang
       butuh hasil query lain), jadi ditembak bareng lewat Promise.all --
       sebelumnya 10 query jalan berurutan (nunggu satu-satu) yang bikin
       Dashboard (halaman pertama setelah login) kerasa lama banget pas
       dibuka. Cuma query profile yang butuh user.id, jadi itu tetap
       nunggu giliran belakangan. */
    const [
      {
        data: { user },
      },
      { count: ordersCount, error: ordersCountError },
      { count: productionCount, error: productionCountError },
      { count: customersCount, error: customersCountError },
      { count: suppliersCount, error: suppliersCountError },
      { data: ordersData, error: ordersDataError },
      { count: pesananBulanIni, error: pesananBulanIniError },
      { count: produksiSelesai, error: produksiSelesaiError },
      { data: allOrders, error: allOrdersError },
      { data: recentOrders, error: recentOrdersError },
      { data: prevPeriodOrders, error: prevPeriodOrdersError },
      { data: criticalMaterialsData, error: criticalMaterialsError },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("production").select("*", { count: "exact", head: true }),
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("suppliers").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("total, sisa_pembayaran"),
      supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
      supabase.from("production").select("*", { count: "exact", head: true }).eq("status", "Selesai"),
      supabase.from("orders").select("status"),
      supabase.from("orders").select("total, tanggal, created_at").gte("created_at", sixMonthsAgo),
      supabase.from("orders").select("total").gte("created_at", twelveMonthsAgo).lt("created_at", sixMonthsAgo),
      supabase
        .from("raw_materials")
        .select("id, nama_bahan, stok, stok_minimum, satuan")
        .eq("status", "Kritis")
        .order("stok", { ascending: true }),
    ]);

    const queryErrors = [
      ordersCountError,
      productionCountError,
      customersCountError,
      suppliersCountError,
      ordersDataError,
      pesananBulanIniError,
      produksiSelesaiError,
      allOrdersError,
      recentOrdersError,
      prevPeriodOrdersError,
      criticalMaterialsError,
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

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) setAdminName(profile.full_name);
    }

    const totalPendapatan =
      ordersData?.reduce((sum, o) => sum + ((o.total || 0) - (o.sisa_pembayaran || 0)), 0) || 0;

    const statusCount = [
      { status: "Pesanan", count: 0 },
      { status: "Produksi", count: 0 },
      { status: "QC", count: 0 },
      { status: "Packing", count: 0 },
      { status: "Dikirim", count: 0 },
      { status: "Selesai", count: 0 },
    ];

    allOrders?.forEach((o: any) => {
      const idx = statusCount.findIndex(s => s.status === o.status);
      if (idx >= 0) statusCount[idx].count++;
    });

    setStatusOrders(statusCount);

    const monthLabels: { key: string; label: string; pendapatan: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
        pendapatan: 0,
      });
    }

    recentOrders?.forEach((o: any) => {
      const d = new Date(o.tanggal || o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = monthLabels.find((m) => m.key === key);
      if (bucket) bucket.pendapatan += Number(o.total) || 0;
    });

    setMonthlyRevenue(monthLabels.map((m) => ({ bulan: m.label, pendapatan: m.pendapatan })));

    const currentPeriodTotal = monthLabels.reduce((sum, m) => sum + m.pendapatan, 0);
    const prevPeriodTotal =
      prevPeriodOrders?.reduce((sum, o: any) => sum + (Number(o.total) || 0), 0) || 0;
    setRevenueTrend({
      total: currentPeriodTotal,
      // null kalau periode sebelumnya belum ada data sama sekali (misal
      // bisnisnya baru jalan < 6 bulan) -- daripada nampilin "naik tak
      // terhingga" yang menyesatkan, badge tren-nya cukup disembunyikan.
      changePct:
        prevPeriodTotal > 0 ? ((currentPeriodTotal - prevPeriodTotal) / prevPeriodTotal) * 100 : null,
    });

    setStats({
      totalPesanan: ordersCount || 0,
      totalProduksi: productionCount || 0,
      totalPelanggan: customersCount || 0,
      totalSupplier: suppliersCount || 0,
      totalPendapatan,
      pesananBulanIni: pesananBulanIni || 0,
      produksiSelesai: produksiSelesai || 0,
    });

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 animate-pulse">
        <div>
          <div className="h-6 w-40 rounded-full bg-gray-200 dark:bg-[#21262d] mb-3" />
          <div className="h-8 w-56 rounded-lg bg-gray-200 dark:bg-[#21262d]" />
        </div>

        <div className="rounded-2xl p-6 md:p-8 backdrop-blur-xl bg-white/55 dark:bg-[#161b22]/55">
          <div className="h-4 w-24 rounded-full bg-gray-200 dark:bg-[#21262d] mb-3" />
          <div className="h-6 w-64 rounded bg-gray-200 dark:bg-[#21262d] mb-2" />
          <div className="h-4 w-48 rounded bg-gray-200 dark:bg-[#21262d] mb-4" />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-[#161b22]" />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card h-28" style={{ border: "none" }} />
          ))}
        </div>

        <div className="card h-64" style={{ border: "none" }} />
        <div className="card h-64" style={{ border: "none" }} />
      </div>
    );
  }


  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="Ringkasan Hari Ini"
        icon={CalendarDays}
        title="Dashboard"
        subtitle="Ringkasan aktivitas SCM Djogker."
      />

      <FetchErrorBanner message={fetchError} />

      {criticalMaterials.length > 0 && (
        <Link
          href="/dashboard/gudang"
          className="flex items-start gap-3 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {criticalMaterials.length} bahan baku stoknya kritis
            </p>
            <p className="mt-0.5 truncate text-xs text-red-600/90 dark:text-red-400/90">
              {criticalMaterials
                .slice(0, 4)
                .map((m) => `${m.nama_bahan} (${m.stok}${m.satuan ? " " + m.satuan : ""})`)
                .join(", ")}
              {criticalMaterials.length > 4 ? `, +${criticalMaterials.length - 4} lagi` : ""} -- klik buat cek Gudang.
            </p>
          </div>
        </Link>
      )}

      <div className="welcome-hero">
        <div className="welcome-hero-content">
          <span className="welcome-hero-badge">
            <BadgeCheck size={11} />
            SCM DJOGKER
          </span>
          <p className="welcome-hero-eyebrow">Dashboard Supply Chain</p>
          <h2 className="welcome-hero-title font-display">Selamat Datang, {adminName}</h2>
          <p className="welcome-hero-desc">
            Pantau seluruh alur supply chain DJOGKER dari satu tempat — mulai dari pesanan masuk
            sampai produk diterima pelanggan.
          </p>

          <div className="welcome-hero-stats">
            <div className="welcome-hero-stat">
              <div className="welcome-hero-stat-icon green">
                <TrendingUp size={12} />
              </div>
              <p className="welcome-hero-stat-num">{`Rp ${stats.totalPendapatan.toLocaleString("id-ID")}`}</p>
              <p className="welcome-hero-stat-label">Pendapatan Diterima</p>
            </div>
            <div className="welcome-hero-stat">
              <div className="welcome-hero-stat-icon blue">
                <Users size={12} />
              </div>
              <p className="welcome-hero-stat-num">{stats.totalPelanggan}</p>
              <p className="welcome-hero-stat-label">Pelanggan Aktif</p>
            </div>
            <div className="welcome-hero-stat">
              <div className="welcome-hero-stat-icon orange">
                <ShoppingCart size={12} />
              </div>
              <p className="welcome-hero-stat-num">{stats.totalPesanan - stats.produksiSelesai}</p>
              <p className="welcome-hero-stat-label">Pesanan Berjalan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {premiumStats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.key} href={s.href} className={`premium-stat-card ${s.accent} block cursor-pointer`}>
              <div className="premium-stat-content">
                <div className="premium-stat-icon">
                  <Icon size={14} />
                </div>
                <p className="premium-stat-label">{s.title}</p>
                <p className="premium-stat-value font-display">{s.value}</p>
                <p className="premium-stat-hint">{s.hint}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="status-progress-tile blue">
          <h2 className="status-progress-head">
            <ListChecks size={12} />
            Status Pesanan
          </h2>
          <div className="status-progress-bars">
            {statusOrders.map((s) => {
              const max = Math.max(...statusOrders.map((x) => x.count), 1);
              const heightPct = Math.max((s.count / max) * 100, 6);
              return (
                <div
                  key={s.status}
                  className="status-progress-bar"
                  style={{ height: `${heightPct}%`, backgroundColor: STATUS_COLORS[s.status] ?? "#94a3b8" }}
                  title={`${s.status}: ${s.count}`}
                />
              );
            })}
          </div>
          <div className="status-progress-legend">
            {statusOrders.map((s) => (
              <span key={s.status} className="status-progress-legend-item">
                <span className="status-progress-dot" style={{ backgroundColor: STATUS_COLORS[s.status] ?? "#94a3b8" }} />
                {s.status} {s.count}
              </span>
            ))}
          </div>
        </div>

        <div className="status-progress-tile green">
          <h2 className="status-progress-head">
            <Gauge size={12} />
            Progress Produksi
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative h-[52px] w-[52px] shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(5, 150, 105, 0.18)" strokeWidth="12" />
                <circle
                  cx="50" cy="50" r="42" fill="none" stroke="#059669" strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - (stats.totalProduksi > 0 ? stats.produksiSelesai / stats.totalProduksi : 0))}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-300">
                {stats.totalProduksi > 0 ? Math.round((stats.produksiSelesai / stats.totalProduksi) * 100) : 0}%
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-black dark:text-white">
                {stats.produksiSelesai}/{stats.totalProduksi}
              </p>
              <p className="text-[11px] font-medium text-green-700 dark:text-green-300">Produksi Selesai</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-chart-card">
        <div className="dash-chart-top">
          <h2 className="dash-chart-head">
            <TrendingUp size={12} />
            Tren Pendapatan (6 Bulan)
          </h2>
          <div className="dash-chart-summary">
            <p className="dash-chart-summary-value font-display">
              Rp {revenueTrend.total.toLocaleString("id-ID")}
            </p>
            {revenueTrend.changePct !== null && (
              <p className={`dash-chart-trend ${revenueTrend.changePct >= 0 ? "up" : "down"}`}>
                {revenueTrend.changePct >= 0 ? "↑" : "↓"} {Math.abs(revenueTrend.changePct).toFixed(0)}% vs periode lalu
              </p>
            )}
          </div>
        </div>
        {monthlyRevenue.every((m) => m.pendapatan === 0) ? (
          <p className="relative z-[2] text-sm text-gray-500 dark:text-gray-400">Belum ada data pendapatan 6 bulan terakhir.</p>
        ) : (
          <div className="relative z-[2]">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="colorPendapatan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--djoker-border)" vertical={false} />
                <XAxis dataKey="bulan" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [`Rp ${value.toLocaleString("id-ID")}`, "Pendapatan"]}
                  contentStyle={{
                    background: "var(--djoker-surface)",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  itemStyle={{ color: "var(--djoker-text)" }}
                  labelStyle={{ color: "var(--djoker-text)" }}
                />
                <Area
                  type="monotone"
                  dataKey="pendapatan"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#colorPendapatan)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
