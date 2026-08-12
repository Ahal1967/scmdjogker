"use client";

import { useState } from "react";
import { Search, User, ChevronLeft, ChevronRight } from "lucide-react";

type Pelanggan = {
  id: string;
  nama: string;
  no_telepon: string | null;
  totalPesanan: number;
  totalBelanja: number;
};

export default function PelangganTable({ dataPelanggan }: { dataPelanggan: Pelanggan[] }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = dataPelanggan.filter(
    (c) =>
      c.nama.toLowerCase().includes(search.toLowerCase()) ||
      (c.no_telepon ?? "").includes(search)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
                <th className="w-10"></th>
                <th>Nama Pelanggan</th>
                <th>No. Telepon</th>
                <th>Total Pesanan</th>
                <th>Total Belanja Diterima</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/40">
                      <User size={15} className="text-blue-600 dark:text-blue-400" />
                    </span>
                  </td>
                  <td className="font-semibold text-black dark:text-white">{c.nama}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{c.no_telepon || "-"}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{c.totalPesanan} pesanan</td>
                  <td className="text-sm font-medium text-black dark:text-white">
                    Rp {c.totalBelanja.toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
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
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-700 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {paginated.length} dari {filtered.length} pelanggan
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
