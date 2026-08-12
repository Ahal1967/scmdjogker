"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Package, Clock, CheckCircle2, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { useToast } from "@/components/useToast";

type Packing = {
  id: string;
  no_packing: string;
  tanggal: string;
  jumlah: number;
  status: "Diproses" | "Siap Kirim";
  order_id: string;
  orders: { no_pesanan: string; customers: { nama: string } | null } | null;
};

function EmptyState() {
  return (
    <div className="card flex min-h-[16rem] items-center justify-center" style={{ border: "1px solid #e5e7eb" }}>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40">
          <Package size={30} className="text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
        </div>
        <p className="text-base font-medium text-black dark:text-white">Belum ada entri packing</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Muncul otomatis saat QC lolos.</p>
      </div>
    </div>
  );
}

export default function PackingTable({ initialPacking }: { initialPacking: Packing[] }) {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/dashboard/pengiriman");
  }, []);
  const [packingList, setPackingList] = useState<Packing[]>(initialPacking);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { showToast, ToastBanner } = useToast();

  const filtered = packingList.filter(
    (p) =>
      p.no_packing.toLowerCase().includes(search.toLowerCase()) ||
      (p.orders?.no_pesanan ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalPacking = packingList.length;
  const totalDiproses = packingList.filter((p) => p.status === "Diproses").length;
  const totalSiapKirim = packingList.filter((p) => p.status === "Siap Kirim").length;

  async function markReady(p: Packing) {
    const { data, error } = await supabase
      .from("packing")
      .update({ status: "Siap Kirim" })
      .eq("id", p.id)
      .select("*, orders(no_pesanan, customers(nama))")
      .single();

    if (error || !data) {
      showToast("Gagal update packing: " + error?.message);
      return;
    }
    setPackingList((prev) => prev.map((item) => (item.id === p.id ? data : item)));

    const { data: existing } = await supabase
      .from("shipments")
      .select("id")
      .eq("order_id", p.order_id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("shipments").insert({
        order_id: p.order_id,
        status: "Diproses",
      });
    }

    await supabase.from("orders").update({ status: "Dikirim" }).eq("id", p.order_id);
    await supabase.from("order_tracking").insert({
      order_id: p.order_id,
      tahap: "Siap Kirim",
      selesai: true,
    });

    showToast("Packing siap kirim, otomatis lanjut ke Pengiriman.", "success");
    setTimeout(() => router.push("/dashboard/pengiriman"), 900);
  }

  if (packingList.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Cari no. packing / no. pesanan..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="input-field rounded-full pl-10 max-w-md"
        />
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "1px solid #e5e7eb" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>No. Packing</th>
                <th>No. Pesanan</th>
                <th>Pelanggan</th>
                <th>Tanggal</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/40">
                      <Package size={15} className="text-blue-600 dark:text-blue-400" />
                    </span>
                  </td>
                  <td className="font-semibold text-black dark:text-white">{p.no_packing}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{p.orders?.no_pesanan ?? "-"}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{p.orders?.customers?.nama ?? "-"}</td>
                  <td className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(p.tanggal).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{p.jumlah} pcs</td>
                  <td>
                    <span
                      className={`badge ${
                        p.status === "Siap Kirim"
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                          : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="text-right">
                    {p.status === "Diproses" && (
                      <button
                        onClick={() => markReady(p)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                      >
                        <Send size={13} />
                        Siap Kirim
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="flex min-h-[100px] items-center justify-center text-gray-500 dark:text-gray-400">
                      Tidak ditemukan.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-700 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {paginated.length} dari {filtered.length} packing
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-600 dark:text-gray-300"
              >
                <option value={10}>10 / halaman</option>
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-700 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/40">
              <Package size={20} className="text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalPacking}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Packing</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-50 dark:bg-yellow-900/40">
              <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalDiproses}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sedang Diproses</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/40">
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalSiapKirim}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Siap Kirim</p>
            </div>
          </div>
        </div>
      </div>
      {ToastBanner}
    </div>
  );
}
