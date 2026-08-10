"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, FileText, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

type Order = {
  id: string;
  no_pesanan: string | null;
  tanggal: string | null;
  total: number | null;
  dp: number | null;
  sisa_pembayaran: number | null;
  status: string | null;
  alamat_pengiriman: string | null;
  created_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  Pesanan: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Produksi: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  QC: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Packing: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Dikirim: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Selesai: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatTanggal(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function LaporanTable({ dataOrders }: { dataOrders: Order[] }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = dataOrders.filter((o) =>
    (o.no_pesanan ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Cari no. pesanan..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="input-field rounded-full pl-10"
        />
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "1px solid #e5e7eb" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>No. Pesanan</th>
                <th>Tanggal</th>
                <th>Total</th>
                <th>DP</th>
                <th>Sisa</th>
                <th>Status</th>
                <th>Alamat</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((order) => (
                <tr key={order.id}>
                  <td>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/40">
                      <FileText size={15} className="text-blue-600 dark:text-blue-400" />
                    </span>
                  </td>
                  <td className="font-semibold text-black dark:text-white">{order.no_pesanan || "-"}</td>
                  <td className="text-sm text-gray-600 dark:text-gray-400">{formatTanggal(order.tanggal || order.created_at)}</td>
                  <td className="text-sm font-medium text-black dark:text-white">{formatRupiah(Number(order.total) || 0)}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{formatRupiah(Number(order.dp) || 0)}</td>
                  <td
                    className={`text-sm font-medium ${
                      (Number(order.sisa_pembayaran) || 0) > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatRupiah(Number(order.sisa_pembayaran) || 0)}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[order.status || ""] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"}`}>
                      {order.status || "-"}
                    </span>
                  </td>
                  <td className="max-w-[10rem] truncate text-sm text-gray-700 dark:text-gray-300 md:max-w-xs">
                    {order.alamat_pengiriman || "-"}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Link
                        href={`/dashboard/laporan/edit/${order.id}`}
                        title="Edit"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Pencil size={15} />
                      </Link>
                      <Link
                        href={`/dashboard/laporan/hapus/${order.id}`}
                        title="Hapus"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <Trash2 size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="flex min-h-[140px] items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                      Belum ada pesanan.
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
              Menampilkan {paginated.length} dari {filtered.length} pesanan
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
    </div>
  );
}
