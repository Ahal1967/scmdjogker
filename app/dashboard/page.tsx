"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart,
  Factory,
  Users,
  Truck,
  Wallet,
  CalendarDays,
} from "lucide-react";

export default function DashboardPage() {
  const supabase = createClient();
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
    { title: "Total Pesanan", value: stats.totalPesanan, color: "from-blue-50 to-blue-100", textColor: "text-blue-700", valueColor: "text-blue-900", accent: "#2563eb", icon: ShoppingCart, iconBg: "bg-blue-600" },
    { title: "Total Produksi", value: stats.totalProduksi, color: "from-green-50 to-green-100", textColor: "text-green-700", valueColor: "text-green-900", accent: "#16a34a", icon: Factory, iconBg: "bg-green-600" },
    { title: "Pelanggan", value: stats.totalPelanggan, color: "from-purple-50 to-purple-100", textColor: "text-purple-700", valueColor: "text-purple-900", accent: "#9333ea", icon: Users, iconBg: "bg-purple-600" },
    { title: "Supplier", value: stats.totalSupplier, color: "from-orange-50 to-orange-100", textColor: "text-orange-700", valueColor: "text-orange-900", accent: "#ea580c", icon: Truck, iconBg: "bg-orange-600" },
    { title: "Total Pendapatan", value: `Rp ${stats.totalPendapatan.toLocaleString("id-ID")}`, color: "from-emerald-50 to-emerald-100", textColor: "text-emerald-700", valueColor: "text-emerald-900", accent: "#059669", icon: Wallet, iconBg: "bg-emerald-600" },
    { title: "Pesanan Bulan Ini", value: stats.pesananBulanIni, color: "from-cyan-50 to-cyan-100", textColor: "text-cyan-700", valueColor: "text-cyan-900", accent: "#0891b2", icon: CalendarDays, iconBg: "bg-cyan-600" },
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

  const maxCount = Math.max(...statusOrders.map(s => s.count), 1);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          RINGKASAN HARI INI
        </span>
        <h1 className="font-display text-2xl font-bold text-black dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Ringkasan aktivitas SCM Djogker.</p>
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
                <div
                  key={idx}
                  className={`flex-shrink-0 w-[90%] card bg-gradient-to-br ${card.color} snap-center`}
                  style={{ borderLeft: `1px solid ${card.accent}` }}
                >
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}>
                    <Icon className="text-white" size={18} />
                  </div>
                  <p className={`text-xs font-medium uppercase tracking-wide ${card.textColor}`}>{card.title}</p>
                  <p className={`mt-1 font-display text-3xl font-bold ${card.valueColor}`}>{card.value}</p>
                </div>
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
            <div
              key={idx}
              className={`card bg-gradient-to-br ${card.color}`}
              style={{ borderLeft: `1px solid ${card.accent}` }}
            >
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}>
                <Icon className="text-white" size={18} />
              </div>
              <p className={`text-xs font-medium uppercase tracking-wide ${card.textColor}`}>{card.title}</p>
              <p className={`mt-1 font-display text-3xl font-bold ${card.valueColor}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ borderLeft: "1px solid #2563eb" }}>
        <h2 className="text-base font-semibold text-black dark:text-white mb-4">Status Pesanan</h2>
        <div className="space-y-3">
          {statusOrders.map((s) => (
            <div key={s.status}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300 font-medium">{s.status}</span>
                <span className="text-gray-900 dark:text-gray-100 font-bold">{s.count}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    s.status === "Pesanan" ? "bg-blue-500" :
                    s.status === "Produksi" ? "bg-yellow-500" :
                    s.status === "QC" ? "bg-purple-500" :
                    s.status === "Packing" ? "bg-orange-500" :
                    s.status === "Dikirim" ? "bg-cyan-500" :
                    "bg-green-500"
                  }`}
                  style={{ width: `${(s.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
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
        <div className="space-y-3">
          {monthlyRevenue.map((m) => {
            const maxRevenue = Math.max(...monthlyRevenue.map((x) => x.pendapatan), 1);
            return (
              <div key={m.bulan}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{m.bulan}</span>
                  <span className="text-gray-900 dark:text-gray-100 font-bold">
                    Rp {m.pendapatan.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${(m.pendapatan / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
          {monthlyRevenue.every((m) => m.pendapatan === 0) && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data pendapatan 6 bulan terakhir.</p>
          )}
        </div>
      </div>

      <div className="card" style={{ borderLeft: "1px solid #94a3b8" }}>
        <h2 className="text-base font-semibold text-black dark:text-white">Selamat Datang</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Gunakan menu di sidebar untuk mengelola pesanan, produksi, dan laporan.
        </p>
      </div>
    </div>
  );
}
