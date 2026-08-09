"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart,
  Factory,
  Users,
  Truck,
  Wallet,
  CalendarDays,
} from "lucide-react";
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const statsCards = [
    { title: "Total Pesanan", value: stats.totalPesanan, color: "from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20", textColor: "text-blue-700 dark:text-blue-300", valueColor: "text-blue-900 dark:text-blue-100", accent: "#2563eb", icon: ShoppingCart, iconBg: "bg-blue-600", href: "/dashboard/pesanan" },
    { title: "Total Produksi", value: stats.totalProduksi, color: "from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/20", textColor: "text-green-700 dark:text-green-300", valueColor: "text-green-900 dark:text-green-100", accent: "#16a34a", icon: Factory, iconBg: "bg-green-600", href: "/dashboard/produksi" },
    { title: "Pelanggan", value: stats.totalPelanggan, color: "from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/20", textColor: "text-purple-700 dark:text-purple-300", valueColor: "text-purple-900 dark:text-purple-100", accent: "#9333ea", icon: Users, iconBg: "bg-purple-600", href: "/dashboard/pesanan" },
    { title: "Supplier", value: stats.totalSupplier, color: "from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/20", textColor: "text-orange-700 dark:text-orange-300", valueColor: "text-orange-900 dark:text-orange-100", accent: "#ea580c", icon: Truck, iconBg: "bg-orange-600", href: "/dashboard/supplier" },
    { title: "Total Pendapatan", value: `Rp ${stats.totalPendapatan.toLocaleString("id-ID")}`, color: "from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20", textColor: "text-emerald-700 dark:text-emerald-300", valueColor: "text-emerald-900 dark:text-emerald-100", accent: "#059669", icon: Wallet, iconBg: "bg-emerald-600", href: "/dashboard/laporan" },
    { title: "Pesanan Bulan Ini", value: stats.pesananBulanIni, color: "from-cyan-50 to-cyan-100 dark:from-cyan-950/40 dark:to-cyan-900/20", textColor: "text-cyan-700 dark:text-cyan-300", valueColor: "text-cyan-900 dark:text-cyan-100", accent: "#0891b2", icon: CalendarDays, iconBg: "bg-cyan-600", href: "/dashboard/laporan" },
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (sliderRef.current) {
      const slideWidth = sliderRef.current.clientWidth * 0.9;
      sliderRef.current.scrollLeft = currentSlide * slideWidth;
    }
  }, [currentSlide]);

  async function fetchStats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) setAdminName(profile.full_name);
    }

    const { count: ordersCount } = await supabase.from("orders").select("*", { count: "exact", head: true });
    const { count: productionCount } = await supabase.from("production").select("*", { count: "exact", head: true });
    const { count: customersCount } = await supabase.from("customers").select("*", { count: "exact", head: true });
    const { count: suppliersCount } = await supabase.from("suppliers").select("*", { count: "exact", head: true });
    const { data: ordersData } = await supabase.from("orders").select("total");
    const totalPendapatan = ordersData?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: pesananBulanIni } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth);

    const { count: produksiSelesai } = await supabase
      .from("production")
      .select("*", { count: "exact", head: true })
      .eq("status", "Selesai");

    const { data: allOrders } = await supabase.from("orders").select("status");

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

    // Tren pendapatan 6 bulan terakhir
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("total, tanggal, created_at")
      .gte("created_at", sixMonthsAgo);

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

  function nextSlide() {
    setCurrentSlide((prev) => Math.min(prev + 1, statsCards.length - 1));
  }

  function prevSlide() {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  }

  if (loading) {
    return <div className="text-center text-gray-500 dark:text-gray-400 py-8">Memuat dashboard...</div>;
  }


  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          RINGKASAN HARI INI
        </span>
        <h1 className="font-display text-2xl font-bold text-black dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Ringkasan aktivitas SCM Djogker.</p>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-blue-100 dark:border-blue-900"
        style={{
          background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
          boxShadow: "0 1px 2px rgba(37,99,235,0.06), 0 12px 32px -8px rgba(37,99,235,0.18)",
        }}
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between gap-6 p-6 md:p-8">
          <div className="max-w-xl">
            <h2 className="font-display text-xl font-bold tracking-tight text-black md:text-2xl">
              Selamat Datang, {adminName}
            </h2>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">
              Pantau seluruh alur supply chain DJOGKER dari satu tempat — mulai dari pesanan masuk
              sampai produk diterima pelanggan.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/dashboard/pesanan"
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-600/40 transition-all duration-200"
              >
                + Pesanan Baru
              </Link>
              <Link
                href="/dashboard/laporan"
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white/70 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-white hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
              >
                Lihat Laporan
              </Link>
              <Link
                href="/dashboard/alur"
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white/70 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-white hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
              >
                Alur Supply Chain
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <div className="relative">
          <button onClick={prevSlide} disabled={currentSlide === 0} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800/80 rounded-full p-2 shadow disabled:opacity-30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div ref={sliderRef} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-3 px-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {statsCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <Link
                  key={idx}
                  href={card.href}
                  className={`flex-shrink-0 w-[90%] card bg-gradient-to-br ${card.color} snap-center block cursor-pointer`}
                  style={{ borderLeft: `1px solid ${card.accent}` }}
                >
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}>
                    <Icon className="text-white" size={18} />
                  </div>
                  <p className={`text-xs font-medium uppercase tracking-wide ${card.textColor}`}>{card.title}</p>
                  <p className={`mt-1 font-display text-3xl font-bold ${card.valueColor}`}>{card.value}</p>
                </Link>
              );
            })}
          </div>

          <button onClick={nextSlide} disabled={currentSlide === statsCards.length - 1} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800/80 rounded-full p-2 shadow disabled:opacity-30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="flex justify-center gap-2 mt-3">
          {statsCards.map((_, idx) => (
            <button key={idx} onClick={() => setCurrentSlide(idx)} className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? "bg-blue-600 w-4" : "bg-gray-300"}`} />
          ))}
        </div>
      </div>

      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              href={card.href}
              className={`card bg-gradient-to-br ${card.color} block cursor-pointer`}
              style={{ borderLeft: `1px solid ${card.accent}` }}
            >
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}>
                <Icon className="text-white" size={18} />
              </div>
              <p className={`text-xs font-medium uppercase tracking-wide ${card.textColor}`}>{card.title}</p>
              <p className={`mt-1 font-display text-3xl font-bold ${card.valueColor}`}>{card.value}</p>
            </Link>
          );
        })}
      </div>

      <div className="card" style={{ borderLeft: "1px solid #2563eb" }}>
        <h2 className="text-base font-semibold text-black dark:text-white mb-4">Status Pesanan</h2>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-1/2">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={statusOrders}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={45}
                  outerRadius={75}
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
                    border: "1px solid var(--djoker-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full md:w-1/2 space-y-2.5">
            {statusOrders.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
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

      <div className="card" style={{ borderLeft: "1px solid #16a34a" }}>
        <h2 className="text-base font-semibold text-black dark:text-white mb-4">Progress Produksi</h2>
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-32 h-32 md:w-40 md:h-40">
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
              <p className="text-2xl md:text-3xl font-bold text-black dark:text-white">
                {stats.totalProduksi > 0 ? Math.round((stats.produksiSelesai / stats.totalProduksi) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Selesai</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Produksi Selesai</span>
          <span className="font-medium text-black dark:text-white">{stats.produksiSelesai} / {stats.totalProduksi}</span>
        </div>
      </div>

      <div className="card" style={{ borderLeft: "1px solid #059669" }}>
        <h2 className="text-base font-semibold text-black dark:text-white mb-4">
          Tren Pendapatan (6 Bulan Terakhir)
        </h2>
        {monthlyRevenue.every((m) => m.pendapatan === 0) ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data pendapatan 6 bulan terakhir.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
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
                  border: "1px solid var(--djoker-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
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
