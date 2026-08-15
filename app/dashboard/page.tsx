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
} from "lucide-react";
import PageHeaderCard from "@/components/PageHeaderCard";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const STATUS_PIE_COLORS: Record<string, string> = {
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
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ bulan: string; pendapatan: number }[]>([]);
  const [loading, setLoading] = useState(true);

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
      { count: ordersCount },
      { count: productionCount },
      { count: customersCount },
      { count: suppliersCount },
      { data: ordersData },
      { count: pesananBulanIni },
      { count: produksiSelesai },
      { data: allOrders },
      { data: recentOrders },
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
    ]);

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
          <div className="h-6 w-40 rounded-full bg-gray-200 dark:bg-gray-700 mb-3" />
          <div className="h-8 w-56 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="rounded-2xl p-6 md:p-8 backdrop-blur-xl bg-white/55 dark:bg-gray-800/55">
          <div className="h-4 w-24 rounded-full bg-gray-200 dark:bg-gray-700 mb-3" />
          <div className="h-6 w-64 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
          <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800" />
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
        badge="RINGKASAN HARI INI"
        icon={CalendarDays}
        title="Dashboard"
        subtitle="Ringkasan aktivitas SCM Djogker."
      />

      <div className="welcome-hero">
        <div className="welcome-hero-deco" aria-hidden="true">
          <div className="welcome-hero-glow-1" />
          <div className="welcome-hero-glow-2" />
          <div className="welcome-hero-grid" />
          <BadgeCheck className="welcome-hero-watermark" strokeWidth={1.5} />
        </div>

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
              <Icon className="premium-stat-watermark" strokeWidth={1.5} aria-hidden="true" />
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

      <div className="card p-0 overflow-hidden" style={{ border: "none" }}>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="p-3 panel-divider">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold text-black dark:text-white">
              <span className="card-icon-chip card-icon-chip-sm bg-blue-600">
                <ListChecks size={10} />
              </span>
              Status Pesanan
            </h2>
            <div className="flex flex-col items-center gap-2">
              <div className="w-full">
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie
                      data={statusOrders}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={26}
                      outerRadius={45}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {statusOrders.map((s) => (
                        <Cell key={s.status} fill={STATUS_PIE_COLORS[s.status] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--djoker-surface)",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      itemStyle={{ color: "var(--djoker-text)" }}
                      labelStyle={{ color: "var(--djoker-text)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full space-y-1">
                {statusOrders.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: STATUS_PIE_COLORS[s.status] ?? "#94a3b8" }}
                      />
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{s.status}</span>
                    </div>
                    <span className="text-gray-900 dark:text-gray-100 font-bold">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold text-black dark:text-white">
              <span className="card-icon-chip card-icon-chip-sm bg-emerald-500">
                <Gauge size={10} />
              </span>
              Progress Produksi
            </h2>
            <div className="flex items-center justify-center mb-2">
              <div className="relative w-20 h-20 md:w-24 md:h-24">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - (stats.totalProduksi > 0 ? stats.produksiSelesai / stats.totalProduksi : 0))}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-base md:text-lg font-bold text-black dark:text-white">
                    {stats.totalProduksi > 0 ? Math.round((stats.produksiSelesai / stats.totalProduksi) * 100) : 0}%
                  </p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400">Selesai</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-600 dark:text-gray-400">Produksi Selesai</span>
              <span className="font-medium text-black dark:text-white">{stats.produksiSelesai} / {stats.totalProduksi}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card dash-chart-card bg-blue-50/60 dark:bg-blue-900/10" style={{ border: "none" }}>
        <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold text-black dark:text-white">
          <span className="card-icon-chip card-icon-chip-sm bg-emerald-700">
            <TrendingUp size={10} />
          </span>
          Tren Pendapatan (6 Bulan Terakhir)
        </h2>
        {monthlyRevenue.every((m) => m.pendapatan === 0) ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data pendapatan 6 bulan terakhir.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={monthlyRevenue}>
              <defs>
                <linearGradient id="colorPendapatan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
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
        )}
      </div>
    </div>
  );
}
