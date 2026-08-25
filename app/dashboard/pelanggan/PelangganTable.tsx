"use client";

import { useState } from "react";
import { Search, User, ChevronLeft, ChevronRight, Phone, ShoppingBag, Wallet, Trash2 } from "lucide-react";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import { compareValues } from "@/lib/sortUtils";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/useConfirm";
import { useToast } from "@/components/useToast";

type Pelanggan = {
  id: string;
  nama: string;
  no_telepon: string | null;
  totalPesanan: number;
  totalBelanja: number;
};

export default function PelangganTable({ dataPelanggan }: { dataPelanggan: Pelanggan[] }) {
  const supabase = createClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastBanner } = useToast();
  const [pelangganList, setPelangganList] = useState(dataPelanggan);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Pelanggan di modul ini muncul otomatis begitu mereka bikin pesanan
  // pertama (tidak ada form tambah manual, lihat PelangganPage) -- jadi
  // hampir semua pelanggan yang ada di daftar sudah pasti punya riwayat
  // pesanan. Kalau masih ada riwayatnya, hapus DITOLAK (bukan cascade
  // menghapus semua pesanannya) supaya data pendapatan/riwayat transaksi
  // historis tidak pernah hilang gara-gara klik hapus di modul yang salah
  // -- kalau memang mau dihapus, pesanannya harus dihapus dulu satu-satu
  // lewat modul Pesanan (yang sudah punya alur reversal stok sendiri).
  async function handleDelete(c: Pelanggan) {
    if (c.totalPesanan > 0) {
      showToast(
        `Pelanggan "${c.nama}" masih punya ${c.totalPesanan} riwayat pesanan -- hapus dulu pesanannya lewat modul Pesanan sebelum menghapus pelanggan ini.`
      );
      return;
    }

    const ok = await confirm({ message: `Pelanggan "${c.nama}" akan dihapus permanen.`, danger: true });
    if (!ok) return;

    const { error } = await supabase.from("customers").delete().eq("id", c.id);

    if (error) {
      // Fallback kalau ternyata pesanan baru dibuat tepat setelah halaman
      // ini dimuat (totalPesanan di layar jadi basi) -- constraint foreign
      // key di database yang jadi jaring pengaman terakhir.
      console.error("Gagal menghapus pelanggan:", error.message);
      if (error.code === "23503" || /foreign key|violat/i.test(error.message)) {
        showToast(
          `Gagal menghapus: pelanggan "${c.nama}" ternyata masih punya riwayat pesanan. Muat ulang halaman dan coba lagi.`
        );
      } else {
        showToast("Gagal menghapus pelanggan: " + error.message);
      }
      return;
    }

    setPelangganList((prev) => prev.filter((p) => p.id !== c.id));
    showToast("Pelanggan berhasil dihapus.", "success");
  }

  const filtered = pelangganList.filter(
    (c) =>
      c.nama.toLowerCase().includes(search.toLowerCase()) ||
      (c.no_telepon ?? "").includes(search)
  );
  type SortField = "nama" | "no_telepon" | "totalPesanan" | "totalBelanja";
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

  const sorted = sortField
    ? [...filtered].sort((a, b) => compareValues(a[sortField], b[sortField], sortDir))
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Cari nama / no. telepon..."
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
                <TableIconCell icon={User} />
                <SortableTh label="Nama Pelanggan" icon={User} active={sortField === "nama"} direction={sortDir} onClick={() => toggleSort("nama")} center />
                <SortableTh label="No. Telepon" icon={Phone} active={sortField === "no_telepon"} direction={sortDir} onClick={() => toggleSort("no_telepon")} center />
                <SortableTh label="Total Pesanan" icon={ShoppingBag} active={sortField === "totalPesanan"} direction={sortDir} onClick={() => toggleSort("totalPesanan")} center />
                <SortableTh label="Total Belanja Diterima" icon={Wallet} active={sortField === "totalBelanja"} direction={sortDir} onClick={() => toggleSort("totalBelanja")} center />
                <SortableTh label="Aksi" sortable={false} center />
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, idx) => (
                <tr key={c.id}>
                  <td>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#21262d]/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </span>
                  </td>
                  <td className="text-black dark:text-white text-center">{c.nama}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{c.no_telepon || "-"}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{c.totalPesanan} pesanan</td>
                  <td className="td-center text-sm font-medium text-black dark:text-white">
                    Rp {c.totalBelanja.toLocaleString("id-ID")}
                  </td>
                  <td className="td-center">
                    <div className="flex justify-center gap-1.5">
                      <button
                        onClick={() => handleDelete(c)}
                        title="Hapus"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center min-h-[220px] gap-3 py-8">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40">
                        <User size={26} className="text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
                      </div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        {search ? "Tidak ditemukan" : "Belum ada data pelanggan"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs text-center">
                        {search
                          ? "Coba kata kunci pencarian lain."
                          : "Pelanggan baru otomatis muncul di sini saat pesanan pertama mereka dibuat."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-[#30363d] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {paginated.length} dari {filtered.length} pelanggan
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-[#30363d] text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-[#21262d]"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-[#30363d] text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-[#21262d]"
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
                className="rounded-lg border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] px-2 py-1 text-xs text-gray-600 dark:text-gray-300"
              >
                <option value={10}>10 / halaman</option>
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {ConfirmDialog}
      {ToastBanner}
    </div>
  );
}
