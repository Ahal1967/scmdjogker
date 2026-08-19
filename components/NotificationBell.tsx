"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "@headlessui/react";
import { Bell, AlertTriangle, ShieldCheck, ClipboardList, Wallet, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NotifItem = {
  label: string;
  count: number;
  href: string;
  icon: typeof Bell;
  color: string;
};

export default function NotificationBell() {
  const supabase = createClient();
  const [items, setItems] = useState<NotifItem[]>([]);

  useEffect(() => {
    async function fetchCounts() {
      const [{ data: materials }, { count: qcCount }, { count: pesananBaruCount }, { data: belumLunas }, { data: qcBermasalah }] =
        await Promise.all([
          supabase.from("raw_materials").select("id, status").eq("status", "Kritis"),
          supabase.from("production").select("*", { count: "exact", head: true }).eq("status", "QC"),
          // Pesanan yang baru masuk & belum mulai diproses (masih di status awal).
          supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "Pesanan"),
          // Proksi "jatuh tempo" -- belum ada kolom tanggal jatuh tempo di database,
          // jadi dianggap paling mendesak ditagih: barang sudah di tangan pelanggan
          // (Dikirim/Selesai) tapi sisa pembayaran masih ada.
          supabase.from("orders").select("id, sisa_pembayaran").in("status", ["Dikirim", "Selesai"]).gt("sisa_pembayaran", 0),
          // Hasil QC yang butuh tindak lanjut (bukan sekadar menunggu diperiksa).
          supabase.from("quality_control").select("id, hasil").in("hasil", ["Perbaikan", "Gagal"]),
        ]);

      const list: NotifItem[] = [];
      if (pesananBaruCount && pesananBaruCount > 0) {
        list.push({
          label: "Pesanan baru masuk",
          count: pesananBaruCount,
          href: "/dashboard/pesanan",
          icon: ClipboardList,
          color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400",
        });
      }
      if (materials && materials.length > 0) {
        list.push({
          label: "Bahan baku stok kritis",
          count: materials.length,
          href: "/dashboard/gudang",
          icon: AlertTriangle,
          color: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400",
        });
      }
      if (qcBermasalah && qcBermasalah.length > 0) {
        list.push({
          label: "Hasil QC butuh tindak lanjut",
          count: qcBermasalah.length,
          href: "/dashboard/qc",
          icon: XCircle,
          color: "text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400",
        });
      }
      if (qcCount && qcCount > 0) {
        list.push({
          label: "Menunggu pemeriksaan QC",
          count: qcCount,
          href: "/dashboard/qc",
          icon: ShieldCheck,
          color: "text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400",
        });
      }
      if (belumLunas && belumLunas.length > 0) {
        list.push({
          label: "Pesanan terkirim, belum lunas",
          count: belumLunas.length,
          href: "/dashboard/laporan",
          icon: Wallet,
          color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400",
        });
      }
      setItems(list);
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // refresh tiap 1 menit
    return () => clearInterval(interval);
  }, []);

  const totalCount = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#0a0a0a] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#171717] transition-colors">
        <Bell size={16} />
        {totalCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </Menu.Button>

      <Menu.Items className="absolute right-0 z-50 mt-3 w-72 origin-top-right rounded-xl border border-gray-200 dark:border-[#262626] bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-md p-2 shadow-xl focus:outline-none">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Notifikasi</p>

        {items.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Tidak ada notifikasi baru.
          </p>
        )}

        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Menu.Item key={item.label}>
              {({ active }) => (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    active ? "bg-gray-50 dark:bg-[#171717]" : ""
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                    <Icon size={16} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-gray-800 dark:text-gray-200">{item.label}</span>
                    <span className="text-xs text-gray-400">{item.count} item</span>
                  </span>
                </Link>
              )}
            </Menu.Item>
          );
        })}
      </Menu.Items>
    </Menu>
  );
}
