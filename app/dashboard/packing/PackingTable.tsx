"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Package, Clock, CheckCircle2, ChevronLeft, ChevronRight, Send, ClipboardList, User, Calendar, Boxes, MoreHorizontal } from "lucide-react";
import { useToast } from "@/components/useToast";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import { compareValues } from "@/lib/sortUtils";

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
    <div className="card flex min-h-[16rem] items-center justify-center" style={{ border: "none" }}>
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
  type SortField = "no_packing" | "no_pesanan" | "pelanggan" | "tanggal" | "jumlah" | "status";
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

  function sortValue(p: Packing, field: SortField) {
    switch (field) {
      case "no_pesanan":
        return p.orders?.no_pesanan ?? "";
      case "pelanggan":
        return p.orders?.customers?.nama ?? "";
      case "jumlah":
        return Number(p.jumlah) || 0;
      default:
        return p[field];
    }
  }

  const sorted = sortField
    ? [...filtered].sort((a, b) => compareValues(sortValue(a, sortField), sortValue(b, sortField), sortDir))
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    setTimeout(() => {
      router.push("/dashboard/pengiriman");
      router.refresh();
    }, 900);
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

      <div className="card overflow-hidden p-0" style={{ border: "none" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <TableIconCell icon={Package} />
                <SortableTh label="No. Packing" icon={Package} active={sortField === "no_packing"} direction={sortDir} onClick={() => toggleSort("no_packing")} center />
                <SortableTh label="No. Pesanan" icon={ClipboardList} active={sortField === "no_pesanan"} direction={sortDir} onClick={() => toggleSort("no_pesanan")} center />
                <SortableTh label="Pelanggan" icon={User} active={sortField === "pelanggan"} direction={sortDir} onClick={() => toggleSort("pelanggan")} center />
                <SortableTh label="Tanggal" icon={Calendar} active={sortField === "tanggal"} direction={sortDir} onClick={() => toggleSort("tanggal")} center />
                <SortableTh label="Jumlah" icon={Boxes} active={sortField === "jumlah"} direction={sortDir} onClick={() => toggleSort("jumlah")} center />
                <SortableTh label="Status" icon={CheckCircle2} active={sortField === "status"} direction={sortDir} onClick={() => toggleSort("status")} center />
                <SortableTh label="Aksi" icon={MoreHorizontal} sortable={false} center />
              </tr>
            </thead>
            <tbody>
              {paginated.map((p, idx) => (
                <tr key={p.id}>
                  <td>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#171717]/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </span>
                  </td>
                  <td className="text-black dark:text-white text-center">{p.no_packing}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{p.orders?.no_pesanan ?? "-"}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{p.orders?.customers?.nama ?? "-"}</td>
                  <td className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    {new Date(p.tanggal).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{p.jumlah} pcs</td>
                  <td className="text-center">
                    {/* Dipindah ke token semantik terpusat (badge-success/warning
                        di globals.css), sebelumnya "Diproses" pakai bg-yellow-100
                        hardcode di sini -- sekarang amber lewat token yang sama
                        dipakai QcTable & PengirimanTable buat makna yang sama. */}
                    <span
                      className={`badge ${
                        p.status === "Siap Kirim" ? "badge-success" : "badge-warning"
                      }`}
                    >
                      <span className="status-dot" />
                      {p.status}
                    </span>
                  </td>
                  <td className="td-center">
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
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-[#262626] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {paginated.length} dari {filtered.length} packing
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

      <div className="card p-0 overflow-hidden" style={{ border: "none" }}>
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
