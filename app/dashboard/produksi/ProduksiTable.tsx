"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Factory, Activity, CheckCircle2, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

export type ProductionRow = {
  id: string;
  no_produksi: string | null;
  status: "Produksi" | "Sablon" | "QC" | "Packing" | "Selesai" | string | null;
  progress: number | null;
  order_id: string | null;
  orders?: {
    no_pesanan?: string | null;
    customers?: {
      nama?: string | null;
    } | null;
  } | null;
};

const STATUS_OPTIONS = ["Produksi", "Sablon", "QC", "Packing", "Selesai"] as const;

const STATUS_COLORS: Record<string, string> = {
  Produksi: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Sablon: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  QC: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Packing: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Selesai: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

// "Sablon" adalah status valid di tabel orders (lihat migrasi SQL yang perlu kamu jalankan).

export default function ProduksiTable({
  initialProductions,
}: {
  initialProductions: ProductionRow[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [productions, setProductions] = useState<ProductionRow[]>(initialProductions);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return productions.filter((p) => {
      const noProduksi = (p.no_produksi || "").toLowerCase();
      const noPesanan = (p.orders?.no_pesanan || "").toLowerCase();
      return noProduksi.includes(q) || noPesanan.includes(q);
    });
  }, [productions, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalProduksi = productions.length;
  const sedangProses = productions.filter((p) => p.status !== "Selesai").length;
  const selesai = productions.filter((p) => p.status === "Selesai").length;

  async function updateStatus(p: ProductionRow, status: string) {
    const progressMap: Record<string, number> = {
      Produksi: 20,
      Sablon: 50,
      QC: 75,
      Packing: 90,
      Selesai: 100,
    };

    const newProgress = progressMap[status] ?? Number(p.progress || 0);

    const { data, error } = await supabase
      .from("production")
      .update({ status, progress: newProgress })
      .eq("id", p.id)
      .select("*, orders(no_pesanan, customers(nama))")
      .single();

    if (!error && data) {
      setProductions((prev) =>
        prev.map((prod) => (prod.id === p.id ? (data as ProductionRow) : prod))
      );

      if (p.order_id) {
        const orderStatus = status;

        await supabase.from("orders").update({ status: orderStatus }).eq("id", p.order_id);

        await supabase.from("order_tracking").insert({
          order_id: p.order_id,
          tahap: status === "Selesai" ? "Produksi Selesai" : status,
          selesai: true,
        });
      }

      if (status === "QC") {
        router.push("/dashboard/qc");
      }
    } else if (error) {
      alert("Gagal mengubah status: " + error.message);
    }
  }

  async function updateProgress(p: ProductionRow, progress: number) {
    const safeProgress = Math.max(0, Math.min(100, progress));

    const { data, error } = await supabase
      .from("production")
      .update({ progress: safeProgress })
      .eq("id", p.id)
      .select("*, orders(no_pesanan, customers(nama))")
      .single();

    if (!error && data) {
      setProductions((prev) =>
        prev.map((prod) => (prod.id === p.id ? (data as ProductionRow) : prod))
      );
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus data produksi ini?")) return;

    const res = await fetch("/api/production/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setProductions((prev) => prev.filter((p) => p.id !== id));
    } else {
      const body = await res.json().catch(() => null);
      alert("Gagal menghapus produksi" + (body?.error ? `: ${body.error}` : ""));
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Cari no. produksi / no. pesanan..."
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
                <th>No. Produksi</th>
                <th>No. Pesanan</th>
                <th>Pelanggan</th>
                <th>Status</th>
                <th>Progress</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/40">
                      <Factory size={15} className="text-blue-600 dark:text-blue-400" />
                    </span>
                  </td>
                  <td className="font-semibold text-black dark:text-white">{p.no_produksi || "-"}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{p.orders?.no_pesanan ?? "-"}</td>
                  <td className="text-sm text-gray-800 dark:text-gray-200">{p.orders?.customers?.nama ?? "-"}</td>
                  <td>
                    <select
                      value={p.status || "Produksi"}
                      onChange={(e) => updateStatus(p, e.target.value)}
                      className={`badge cursor-pointer ${STATUS_COLORS[p.status || ""] ?? ""}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${Number(p.progress || 0)}%` }}
                        />
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={Number(p.progress || 0)}
                        onChange={(e) => updateProgress(p, Number(e.target.value))}
                        className="w-14 rounded border border-gray-300 dark:border-gray-600 py-1 text-center text-xs"
                      />
                      <span className="text-xs text-gray-600 dark:text-gray-400">%</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => handleDelete(p.id)}
                      title="Hapus"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors ml-auto"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex min-h-[140px] items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                      Belum ada antrian produksi. Entri akan muncul otomatis saat ada pesanan baru.
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
              Menampilkan {paginated.length} dari {filtered.length} produksi
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
              <Factory size={20} className="text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalProduksi}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Produksi</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/40">
              <Activity size={20} className="text-orange-600 dark:text-orange-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{sedangProses}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sedang Diproses</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/40">
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{selesai}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Selesai</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
