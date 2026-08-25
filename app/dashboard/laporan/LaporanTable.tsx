"use client";

import { useState } from "react";
import { Search, FileText, ChevronLeft, ChevronRight, ClipboardList, Calendar, Wallet, CreditCard, Receipt, CheckCircle2, MapPin } from "lucide-react";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import { compareValues } from "@/lib/sortUtils";

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
  type SortField = "no_pesanan" | "tanggal" | "total" | "dp" | "sisa" | "status" | "alamat";
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function sortValue(o: Order, field: SortField) {
    switch (field) {
      case "no_pesanan":
        return o.no_pesanan ?? "";
      case "tanggal":
        return o.tanggal ?? o.created_at ?? "";
      case "total":
        return Number(o.total) || 0;
      case "dp":
        return Number(o.dp) || 0;
      case "sisa":
        return Number(o.sisa_pembayaran) || 0;
      case "status":
        return o.status ?? "";
      case "alamat":
        return o.alamat_pengiriman ?? "";
    }
  }

  const sorted = sortField
    ? [...filtered].sort((a, b) => compareValues(sortValue(a, sortField), sortValue(b, sortField), sortDir))
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

      <div className="card overflow-hidden p-0" style={{ border: "none" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <TableIconCell icon={FileText} />
                <SortableTh label="No. Pesanan" icon={ClipboardList} active={sortField === "no_pesanan"} direction={sortDir} onClick={() => toggleSort("no_pesanan")} center />
                <SortableTh label="Tanggal" icon={Calendar} active={sortField === "tanggal"} direction={sortDir} onClick={() => toggleSort("tanggal")} center />
                <SortableTh label="Total" icon={Wallet} active={sortField === "total"} direction={sortDir} onClick={() => toggleSort("total")} center />
                <SortableTh label="DP" icon={CreditCard} active={sortField === "dp"} direction={sortDir} onClick={() => toggleSort("dp")} center />
                <SortableTh label="Sisa" icon={Receipt} active={sortField === "sisa"} direction={sortDir} onClick={() => toggleSort("sisa")} center />
                <SortableTh label="Status" icon={CheckCircle2} active={sortField === "status"} direction={sortDir} onClick={() => toggleSort("status")} center />
                <SortableTh label="Alamat" icon={MapPin} active={sortField === "alamat"} direction={sortDir} onClick={() => toggleSort("alamat")} center />
              </tr>
            </thead>
            <tbody>
              {paginated.map((order, idx) => (
                <tr key={order.id}>
                  <td>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#171717]/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </span>
                  </td>
                  <td className="text-black dark:text-white text-center">{order.no_pesanan || "-"}</td>
                  <td className="text-sm text-gray-600 dark:text-gray-400 text-center">{formatTanggal(order.tanggal || order.created_at)}</td>
                  <td className="text-sm font-medium text-black dark:text-white whitespace-nowrap text-center">{formatRupiah(Number(order.total) || 0)}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center whitespace-nowrap">{formatRupiah(Number(order.dp) || 0)}</td>
                  <td
                    className={`text-sm font-medium text-center whitespace-nowrap ${
                      (Number(order.sisa_pembayaran) || 0) > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatRupiah(Number(order.sisa_pembayaran) || 0)}
                  </td>
                  <td className="text-center">
                    <span className={`badge ${STATUS_COLORS[order.status || ""] ?? "bg-gray-100 text-gray-600 dark:bg-[#171717] dark:text-gray-400"}`}>
                      <span className="status-dot" />
                      {order.status || "-"}
                    </span>
                  </td>
                  <td className="max-w-[10rem] truncate text-sm text-gray-700 dark:text-gray-300 md:max-w-xs text-center">
                    {order.alamat_pengiriman || "-"}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8}>
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
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-[#262626] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {paginated.length} dari {filtered.length} pesanan
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-[#262626] text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-[#171717]"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-[#262626] text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-[#171717]"
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
                className="rounded-lg border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#0a0a0a] px-2 py-1 text-xs text-gray-600 dark:text-gray-300"
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
