"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";

type Order = {
  id: string;
  no_pesanan: string;
  total: number;
  status: string;
};

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function HapusPesananPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      const { data } = await supabase
        .from("orders")
        .select("id, no_pesanan, total, status")
        .eq("id", params.id)
        .single();

      setOrder(data);
    }

    fetchOrder();
  }, [params.id, supabase]);

  async function handleDelete() {
    setErrorMsg(null);
    setLoading(true);

    // order_items dan order_tracking punya "on delete cascade" ke orders,
    // jadi cukup hapus row orders-nya saja.
    const { error } = await supabase.from("orders").delete().eq("id", params.id);

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard/laporan");
    }
  }

  if (!order) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat data...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-black dark:text-white">Hapus Pesanan</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Konfirmasi penghapusan pesanan.</p>
      </div>

      <div className="card max-w-md" style={{ border: "none" }}>
        <div className="mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
            <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 text-center">Apakah Anda yakin ingin menghapus:</p>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="font-medium text-lg text-black dark:text-white">{order.no_pesanan}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{formatRupiah(Number(order.total) || 0)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Status: {order.status}</p>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 mt-3 text-center">
            Item pesanan dan riwayat tracking terkait akan ikut terhapus. Tidak dapat dikembalikan.
          </p>

          {errorMsg && (
            <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              Gagal menghapus: {errorMsg}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-outline flex-1"
            disabled={loading}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="btn-danger flex-1"
          >
            {loading ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
