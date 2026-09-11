"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Eye,
  X,
  Loader2,
  Undo2,
  FileText,
  AlertTriangle,
  Shirt,
  PackageX,
  Palette,
  HelpCircle,
  Tag,
  MoreHorizontal,
  Calendar,
  Hash,
  type LucideIcon,
} from "lucide-react";
import { useToast } from "@/components/useToast";
import { useConfirm } from "@/components/useConfirm";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import StatusDropdown from "@/components/StatusDropdown";
import { compareValues } from "@/lib/sortUtils";
import { generateUniqueCode } from "@/lib/generateCode";

type OrderItemRef = { id: string; nama_produk: string; ukuran: string | null; jumlah: number };
type OrderRef = {
  id: string;
  no_pesanan: string;
  customers: { nama: string | null } | null;
  order_items: OrderItemRef[];
};

type ReturnRow = {
  id: string;
  no_retur: string;
  order_id: string;
  order_item_id: string | null;
  alasan: string;
  catatan: string | null;
  jumlah: number | null;
  tanggal: string;
  status: "Diajukan" | "Diproses" | "Selesai" | "Ditolak";
  created_at: string;
  orders: { no_pesanan: string; customers: { nama: string | null } | null } | null;
  order_items: { nama_produk: string; ukuran: string | null } | null;
};

// Token warna badge bersama (badge-success/warning/danger/info di
// globals.css) -- dipakai buat status "sukses/proses/gagal/netral" yang
// BUKAN pipeline bertahap (beda dari STATUS_COLORS 6-warna di
// PesananTable.tsx), pola sama persis seperti QcTable/PengirimanTable.
const STATUS_COLORS: Record<string, string> = {
  Diajukan: "badge-info",
  Diproses: "badge-warning",
  Selesai: "badge-success",
  Ditolak: "badge-danger",
};
const STATUS_OPTIONS = ["Diajukan", "Diproses", "Selesai", "Ditolak"] as const;

// Kategori alasan retur -- sesuai constraint kolom "alasan" di migrasi
// (supabase/migration_add_returns.sql), bukan teks bebas polos supaya bisa
// direkap/difilter nanti, senada pola quality_control.hasil (kategori) +
// quality_control.catatan (teks bebas pelengkap) yang sudah ada.
const ALASAN_META: Record<string, { icon: LucideIcon; bg: string; text: string }> = {
  "Produk Cacat": {
    icon: AlertTriangle,
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-300",
  },
  "Ukuran Tidak Sesuai": {
    icon: Shirt,
    bg: "bg-blue-50 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-300",
  },
  "Salah Kirim": {
    icon: PackageX,
    bg: "bg-orange-50 dark:bg-orange-900/30",
    text: "text-orange-600 dark:text-orange-300",
  },
  "Warna/Desain Tidak Sesuai": {
    icon: Palette,
    bg: "bg-purple-50 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-300",
  },
  Lainnya: {
    icon: HelpCircle,
    bg: "bg-gray-100 dark:bg-[#21262d]",
    text: "text-gray-600 dark:text-gray-400",
  },
};
const ALASAN_OPTIONS = Object.keys(ALASAN_META);

function formatTanggal(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function itemLabel(item: { nama_produk: string; ukuran: string | null } | null) {
  if (!item) return null;
  return item.ukuran ? `${item.nama_produk} (${item.ukuran})` : item.nama_produk;
}

export default function ReturTable({ initialReturns, orders }: { initialReturns: ReturnRow[]; orders: OrderRef[] }) {
  const supabase = createClient();
  const [returns, setReturns] = useState<ReturnRow[]>(initialReturns);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [detailRetur, setDetailRetur] = useState<ReturnRow | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastBanner } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    order_id: "",
    order_item_id: "",
    alasan: "",
    catatan: "",
    jumlah: 0,
  });

  // Sheet "Pilih Pesanan" -- pola sama seperti sheet Pilih Bahan di
  // ProdukTable.tsx (ada pencarian karena daftar pesanan bisa banyak,
  // beda dari Kategori Bahan/Satuan yang cuma sedikit pilihan tetap).
  const [showPesananPicker, setShowPesananPicker] = useState(false);
  const [pesananSearch, setPesananSearch] = useState("");
  // Sheet "Pilih Alasan Retur" -- pola sama seperti sheet Kategori Bahan
  // (5 pilihan tetap, masing-masing punya ikon sendiri, tap langsung pilih
  // & tutup).
  const [showAlasanPicker, setShowAlasanPicker] = useState(false);

  const selectedOrder = orders.find((o) => o.id === form.order_id) ?? null;

  const filtered = returns.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.no_retur.toLowerCase().includes(q) ||
      (r.orders?.no_pesanan ?? "").toLowerCase().includes(q) ||
      (r.orders?.customers?.nama ?? "").toLowerCase().includes(q) ||
      r.alasan.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
  });

  type SortField = "no_retur" | "pesanan" | "alasan" | "tanggal" | "status";
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

  function sortValue(r: ReturnRow, field: SortField) {
    switch (field) {
      case "no_retur":
        return r.no_retur;
      case "pesanan":
        return r.orders?.no_pesanan ?? "";
      case "alasan":
        return r.alasan;
      case "tanggal":
        return r.tanggal;
      case "status":
        return r.status;
    }
  }

  const sorted = sortField
    ? [...filtered].sort((a, b) => compareValues(sortValue(a, sortField), sortValue(b, sortField), sortDir))
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const filteredOrders = orders.filter((o) => {
    const q = pesananSearch.toLowerCase();
    return o.no_pesanan.toLowerCase().includes(q) || (o.customers?.nama ?? "").toLowerCase().includes(q);
  });

  function openAdd() {
    setForm({ order_id: "", order_item_id: "", alasan: "", catatan: "", jumlah: 0 });
    setPesananSearch("");
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Validasi eksplisit + showToast bahasa Indonesia, pola sama seperti
    // SupplierTable.tsx/PesananTable.tsx -- bukan cuma andalkan "required"
    // bawaan browser.
    if (!form.order_id) {
      showToast("Pilih pesanan yang diretur terlebih dahulu.");
      return;
    }
    if (!form.alasan) {
      showToast("Pilih alasan retur terlebih dahulu.");
      return;
    }

    setSaving(true);

    const no_retur = await generateUniqueCode(supabase, "returns", "no_retur", "RTN-");

    const { data, error } = await supabase
      .from("returns")
      .insert({
        no_retur,
        order_id: form.order_id,
        order_item_id: form.order_item_id || null,
        alasan: form.alasan,
        catatan: form.catatan.trim() || null,
        jumlah: form.jumlah > 0 ? form.jumlah : null,
      })
      .select("*, orders(no_pesanan, customers(nama)), order_items(nama_produk, ukuran)")
      .single();

    if (!error && data) {
      setReturns((prev) => [data as unknown as ReturnRow, ...prev]);
      showToast("Pengajuan retur berhasil dicatat.", "success");
      setShowModal(false);
    } else {
      showToast("Gagal menyimpan: " + error?.message);
    }

    setSaving(false);
  }

  async function updateStatus(retur: ReturnRow, status: string) {
    const { data, error } = await supabase
      .from("returns")
      .update({ status })
      .eq("id", retur.id)
      .select("*, orders(no_pesanan, customers(nama)), order_items(nama_produk, ukuran)")
      .single();

    if (!error && data) {
      setReturns((prev) => prev.map((r) => (r.id === retur.id ? (data as unknown as ReturnRow) : r)));
      setDetailRetur((prev) => (prev?.id === retur.id ? (data as unknown as ReturnRow) : prev));
    } else {
      showToast("Gagal mengubah status: " + error?.message);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      message: "Data retur ini akan dihapus permanen dan tidak bisa dikembalikan.",
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("returns").delete().eq("id", id);
    if (!error) {
      setReturns((prev) => prev.filter((r) => r.id !== id));
      setDetailRetur((prev) => (prev?.id === id ? null : prev));
    } else {
      console.error("Gagal menghapus data retur:", error.message);
      showToast("Gagal menghapus data retur: " + error.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Cari no. retur, no. pesanan, atau nama pelanggan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field rounded-full pl-10"
          />
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 whitespace-nowrap"
        >
          <Plus size={16} />
          Catat Retur
        </button>
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "none" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <TableIconCell icon={Undo2} />
                {/* No. Retur/Pesanan/Item rata kiri (teks/kode -- Pesanan
                    isinya 2 baris bertumpuk, rata tengah bikin baris atas &
                    bawah beda titik mulai, rata kiri jauh lebih enak
                    dipindai). Jumlah diminta user rata TENGAH (bukan
                    kanan). Alasan/Tanggal/Status/Aksi tetap tengah. */}
                <SortableTh label="No. Retur" icon={Hash} active={sortField === "no_retur"} direction={sortDir} onClick={() => toggleSort("no_retur")} />
                <SortableTh label="Pesanan" icon={FileText} active={sortField === "pesanan"} direction={sortDir} onClick={() => toggleSort("pesanan")} />
                <SortableTh label="Item" icon={Tag} sortable={false} />
                <SortableTh label="Alasan" icon={AlertTriangle} active={sortField === "alasan"} direction={sortDir} onClick={() => toggleSort("alasan")} center />
                <SortableTh label="Jumlah" icon={Hash} sortable={false} center />
                <SortableTh label="Tanggal" icon={Calendar} active={sortField === "tanggal"} direction={sortDir} onClick={() => toggleSort("tanggal")} center />
                <SortableTh label="Status" icon={Tag} active={sortField === "status"} direction={sortDir} onClick={() => toggleSort("status")} center />
                <SortableTh label="Aksi" icon={MoreHorizontal} sortable={false} center />
              </tr>
            </thead>
            <tbody>
              {paginated.map((r, idx) => {
                const AIcon = ALASAN_META[r.alasan]?.icon ?? HelpCircle;
                return (
                  <tr key={r.id}>
                    <td>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#21262d]/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </span>
                    </td>
                    <td className="font-medium text-black dark:text-white">{r.no_retur}</td>
                    <td>
                      <p className="text-sm text-black dark:text-white">{r.orders?.no_pesanan ?? "-"}</p>
                      <p className="text-[11px] text-gray-400">{r.orders?.customers?.nama ?? "-"}</p>
                    </td>
                    <td className="text-gray-700 dark:text-gray-300">
                      {itemLabel(r.order_items) ?? <span className="text-gray-400">Semua item</span>}
                    </td>
                    <td className="text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ALASAN_META[r.alasan]?.bg ?? "bg-gray-100 dark:bg-[#21262d]"} ${ALASAN_META[r.alasan]?.text ?? "text-gray-600 dark:text-gray-400"}`}
                      >
                        <AIcon size={12} />
                        {r.alasan}
                      </span>
                    </td>
                    <td className="text-center text-gray-700 dark:text-gray-300">{r.jumlah ?? "-"}</td>
                    <td className="text-center text-gray-700 dark:text-gray-300">{formatTanggal(r.tanggal)}</td>
                    <td className="text-center">
                      <StatusDropdown
                        value={r.status}
                        options={STATUS_OPTIONS}
                        colorClasses={STATUS_COLORS}
                        onChange={(status) => updateStatus(r, status)}
                      />
                    </td>
                    <td className="td-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => setDetailRetur(r)}
                          title="Lihat detail"
                          aria-label="Lihat detail"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          title="Hapus"
                          aria-label="Hapus"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center min-h-[220px] gap-3 py-8">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40">
                        <Undo2 size={26} className="text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
                      </div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        {search ? "Tidak ditemukan" : "Belum ada data retur"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs text-center">
                        {search ? "Coba kata kunci pencarian lain." : "Catat pengajuan retur pertama dari pelanggan."}
                      </p>
                      {!search && (
                        <button
                          onClick={openAdd}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                        >
                          <Plus size={14} />
                          Catat Retur
                        </button>
                      )}
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
              Menampilkan {paginated.length} dari {filtered.length} retur
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

      {/* Modal "Catat Retur" -- header + form, pola sama seperti modal
          Tambah Supplier/Bahan Masuk (ikon di kotak biru rounded-t-2xl +
          judul + subjudul + tombol X). */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="modal-fade-in card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-0 shadow-2xl" style={{ border: "none" }}>
            <div className="rounded-t-2xl bg-blue-50 dark:bg-blue-900/30 px-6 py-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/30">
                  <Undo2 size={18} className="text-white" />
                </span>
                <div>
                  <h2 className="font-display font-bold text-base text-black dark:text-white">Catat Retur</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ajukan retur atas nama pelanggan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-[#30363d] text-gray-400 hover:bg-white dark:hover:bg-[#21262d]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 px-6 py-5">
              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <FileText size={12} className="text-gray-500 dark:text-gray-400" />
                  Pesanan
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPesananSearch("");
                    setShowPesananPicker(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors"
                  style={{ borderColor: "var(--djoker-border)" }}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    <FileText size={14} />
                  </span>
                  <span className={`flex-1 truncate text-sm ${selectedOrder ? "text-black dark:text-white" : "text-gray-400"}`}>
                    {selectedOrder
                      ? `${selectedOrder.no_pesanan} -- ${selectedOrder.customers?.nama ?? "Tanpa nama"}`
                      : "- Pilih Pesanan -"}
                  </span>
                  <ChevronDown size={14} className="shrink-0 text-gray-400" />
                </button>
              </div>

              {selectedOrder && selectedOrder.order_items.length > 0 && (
                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <Tag size={12} className="text-gray-500 dark:text-gray-400" />
                    Item yang Diretur <span className="font-normal text-gray-400">(opsional)</span>
                  </span>
                  <select
                    value={form.order_item_id}
                    onChange={(e) => setForm({ ...form, order_item_id: e.target.value })}
                    className="input-field"
                  >
                    <option value="">- Semua item pesanan ini -</option>
                    {selectedOrder.order_items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.nama_produk}
                        {it.ukuran ? ` (${it.ukuran})` : ""} -- {it.jumlah} pcs
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <AlertTriangle size={12} className="text-gray-500 dark:text-gray-400" />
                  Alasan Retur
                </span>
                <button
                  type="button"
                  onClick={() => setShowAlasanPicker(true)}
                  className="flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors"
                  style={{ borderColor: "var(--djoker-border)" }}
                >
                  {form.alasan ? (
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ALASAN_META[form.alasan].bg} ${ALASAN_META[form.alasan].text}`}>
                      {(() => {
                        const AIcon = ALASAN_META[form.alasan].icon;
                        return <AIcon size={14} />;
                      })()}
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-[#21262d]">
                      <AlertTriangle size={14} />
                    </span>
                  )}
                  <span className={`flex-1 text-sm ${form.alasan ? "text-black dark:text-white" : "text-gray-400"}`}>
                    {form.alasan || "- Pilih Alasan Retur -"}
                  </span>
                  <ChevronDown size={14} className="shrink-0 text-gray-400" />
                </button>
              </div>

              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Hash size={12} className="text-gray-500 dark:text-gray-400" />
                  Jumlah <span className="font-normal text-gray-400">(opsional, pcs)</span>
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.jumlah || ""}
                  onChange={(e) => setForm({ ...form, jumlah: e.target.value === "" ? 0 : Number(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <FileText size={12} className="text-gray-500 dark:text-gray-400" />
                  Catatan <span className="font-normal text-gray-400">(opsional)</span>
                </span>
                <textarea
                  value={form.catatan}
                  onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Detail tambahan dari pelanggan..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom sheet "Pilih Pesanan" -- pola sama seperti sheet Pilih
          Bahan di ProdukTable.tsx (createPortal ke document.body, ada
          pencarian karena daftar pesanan bisa banyak). */}
      {showPesananPicker &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
            onClick={() => setShowPesananPicker(false)}
          >
            <div
              className="modal-fade-in flex w-full max-w-sm flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-[#161b22] sm:max-h-[80vh] sm:rounded-3xl"
              style={{ border: "1px solid var(--djoker-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 sm:hidden">
                <span className="h-1 w-10 rounded-full bg-gray-300 dark:bg-[#30363d]" />
              </div>
              <div className="flex shrink-0 items-start justify-between px-5 pb-1 pt-3">
                <div>
                  <h3 className="font-display text-base font-bold text-black dark:text-white">Pilih Pesanan</h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Cari berdasarkan no. pesanan atau nama pelanggan</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPesananPicker(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="relative shrink-0 px-5 pt-3">
                <Search size={14} className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={pesananSearch}
                  onChange={(e) => setPesananSearch(e.target.value)}
                  placeholder="Cari pesanan..."
                  className="input-field w-full pl-9"
                />
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-6 pt-3">
                {orders.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">Belum ada data pesanan.</p>
                ) : filteredOrders.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">Tidak ada pesanan yang cocok.</p>
                ) : (
                  filteredOrders.map((o) => {
                    const active = form.order_id === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, order_id: o.id, order_item_id: "" }));
                          setShowPesananPicker(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                          active
                            ? "border-blue-300 bg-blue-50/70 dark:border-blue-500/40 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-[#30363d]"
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                          <FileText size={16} />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">{o.no_pesanan}</span>
                          <span className="block text-[11px] text-gray-400">{o.customers?.nama ?? "Tanpa nama"} -- {o.order_items.length} item</span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Bottom sheet "Pilih Alasan Retur" -- pola identik sheet Kategori
          Bahan di GudangTable.tsx (5 pilihan tetap, masing-masing ikon
          sendiri, tap langsung pilih & tutup). */}
      {showAlasanPicker &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
            onClick={() => setShowAlasanPicker(false)}
          >
            <div
              className="modal-fade-in w-full max-w-sm rounded-t-3xl bg-white shadow-2xl dark:bg-[#161b22] sm:rounded-3xl"
              style={{ border: "1px solid var(--djoker-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 sm:hidden">
                <span className="h-1 w-10 rounded-full bg-gray-300 dark:bg-[#30363d]" />
              </div>
              <div className="flex items-start justify-between px-5 pb-1 pt-3">
                <div>
                  <h3 className="font-display text-base font-bold text-black dark:text-white">Alasan Retur</h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Pilih alasan yang paling sesuai</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAlasanPicker(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="space-y-2 px-5 pb-6 pt-3">
                {ALASAN_OPTIONS.map((a) => {
                  const meta = ALASAN_META[a];
                  const AIcon = meta.icon;
                  const active = form.alasan === a;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, alasan: a });
                        setShowAlasanPicker(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                        active
                          ? "border-blue-300 bg-blue-50/70 dark:border-blue-500/40 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-[#30363d]"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.text}`}>
                        <AIcon size={16} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{a}</span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          active ? "border-blue-600" : "border-gray-300 dark:border-[#3d444d]"
                        }`}
                      >
                        {active && <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal detail retur (tombol mata di tabel) -- read-only kecuali
          status (StatusDropdown yang sama dipakai di tabel, supaya admin
          bisa langsung ubah status dari sini juga tanpa perlu tutup dulu). */}
      {detailRetur && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="modal-fade-in card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-0 shadow-2xl" style={{ border: "none" }}>
            <div className="rounded-t-2xl bg-blue-50 dark:bg-blue-900/30 px-6 py-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/30">
                  <Undo2 size={18} className="text-white" />
                </span>
                <div>
                  <h2 className="font-display font-bold text-base text-black dark:text-white">{detailRetur.no_retur}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Detail pengajuan retur</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailRetur(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-[#30363d] text-gray-400 hover:bg-white dark:hover:bg-[#21262d]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
                <StatusDropdown
                  value={detailRetur.status}
                  options={STATUS_OPTIONS}
                  colorClasses={STATUS_COLORS}
                  onChange={(status) => updateStatus(detailRetur, status)}
                />
              </div>

              <div className="rounded-xl border border-gray-100 p-3 dark:border-[#30363d]">
                <p className="text-[11px] font-medium text-gray-400">Pesanan</p>
                <p className="mt-0.5 text-sm font-medium text-black dark:text-white">{detailRetur.orders?.no_pesanan ?? "-"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{detailRetur.orders?.customers?.nama ?? "-"}</p>
              </div>

              <div className="rounded-xl border border-gray-100 p-3 dark:border-[#30363d]">
                <p className="text-[11px] font-medium text-gray-400">Item yang Diretur</p>
                <p className="mt-0.5 text-sm text-black dark:text-white">
                  {itemLabel(detailRetur.order_items) ?? "Semua item pada pesanan ini"}
                </p>
                {detailRetur.jumlah != null && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{detailRetur.jumlah} pcs</p>
                )}
              </div>

              <div className="rounded-xl border border-gray-100 p-3 dark:border-[#30363d]">
                <p className="text-[11px] font-medium text-gray-400">Alasan</p>
                <p className="mt-0.5 text-sm text-black dark:text-white">{detailRetur.alasan}</p>
              </div>

              <div className="rounded-xl border border-gray-100 p-3 dark:border-[#30363d]">
                <p className="text-[11px] font-medium text-gray-400">Catatan</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {detailRetur.catatan || "-"}
                </p>
              </div>

              <p className="text-center text-[11px] text-gray-400">Diajukan {formatTanggal(detailRetur.tanggal)}</p>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handleDelete(detailRetur.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={14} />
                  Hapus
                </button>
                <button type="button" onClick={() => setDetailRetur(null)} className="btn-primary flex-1">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialog}
      {ToastBanner}
    </div>
  );
}
