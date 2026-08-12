"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "@headlessui/react";
import { Bell, AlertTriangle, ShieldCheck } from "lucide-react";
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
      const [{ data: materials }, { count: qcCount }] = await Promise.all([
        supabase.from("raw_materials").select("id, status").eq("status", "Kritis"),
        supabase.from("production").select("*", { count: "exact", head: true }).eq("status", "QC"),
      ]);

      const list: NotifItem[] = [];
      if (materials && materials.length > 0) {
        list.push({
          label: "Bahan baku stok kritis",
          count: materials.length,
          href: "/dashboard/gudang",
          icon: AlertTriangle,
          color: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400",
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
      setItems(list);
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // refresh tiap 1 menit
    return () => clearInterval(interval);
  }, []);

  const totalCount = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        <Bell size={16} />
        {totalCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </Menu.Button>

      <Menu.Items className="absolute right-0 z-50 mt-3 w-72 origin-top-right rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 shadow-xl focus:outline-none">
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
                    active ? "bg-gray-50 dark:bg-gray-700" : ""
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
