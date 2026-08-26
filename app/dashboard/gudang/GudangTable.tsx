"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus, Package, Boxes, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, Pencil, Trash2, Loader2, PackageOpen, Tag, Ruler, Truck, MoreHorizontal, Download, Layers, Wrench, LayoutGrid, X, Cylinder, Scale, Droplet } from "lucide-react";
import { useToast } from "@/components/useToast";
import { useConfirm } from "@/components/useConfirm";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import { compareValues } from "@/lib/sortUtils";
import { exportToExcel } from "@/lib/exportData";

type Supplier = { id: string; nama_supplier: string };

type Material = {
  id: string;
  nama_bahan: string;
  kategori: string | null;
  satuan: string | null;
  stok: number;
  stok_minimum: number;
  supplier_id: string | null;
  status: "Aman" | "Kritis";
  suppliers: { nama_supplier: string } | null;
};

const KATEGORI_OPTIONS = ["Kain", "Tinta", "Alat", "Bahan", "Lainnya"];
const SATUAN_OPTIONS = ["Roll", "Kg", "Pcs", "Liter", "Meter"];

/* Mapping ikon+warna per kategori bahan, dipakai di picker "Kategori Bahan"
   (bottom sheet, sesuai contoh dari user) -- ikon & warnanya diambil persis
   dari referensi gambar: Kain=biru, Tinta=hijau, Alat=oranye, Bahan=ungu,
   Lainnya=pink. */
const KATEGORI_META: Record<string, { icon: typeof Layers; bg: string; text: string }> = {
  Kain: { icon: Layers, bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-300" },
  Tinta: { icon: Tag, bg: "bg-green-50 dark:bg-green-900/30", text: "text-green-600 dark:text-green-300" },
  Alat: { icon: Wrench, bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-300" },
  Bahan: { icon: Package, bg: "bg-purple-50 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-300" },
  Lainnya: { icon: LayoutGrid, bg: "bg-pink-50 dark:bg-pink-900/30", text: "text-pink-600 dark:text-pink-300" },
};

/* Sama seperti KATEGORI_META, dipakai di picker "Satuan" -- bedanya di
   referensi user semua ikon Satuan pakai 1 warna biru yang sama (bukan
   warna beda-beda per pilihan seperti Kategori), jadi bg/text di sini
   sengaja sama semua. */
const SATUAN_META: Record<string, { icon: typeof Ruler }> = {
  Roll: { icon: Cylinder },
  Kg: { icon: Scale },
  Pcs: { icon: Package },
  Liter: { icon: Droplet },
  Meter: { icon: Ruler },
};

export default function GudangTable({
  initialMaterials,
  suppliers,
}: {
  initialMaterials: Material[];
  suppliers: Supplier[];
}) {
  const supabase = createClient();
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [showKategoriPicker, setShowKategoriPicker] = useState(false);
  const [showSatuanPicker, setShowSatuanPicker] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastBanner } = useToast();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState({
    nama_bahan: "",
    kategori: KATEGORI_OPTIONS[0],
    satuan: SATUAN_OPTIONS[0],
    stok: 0,
    stok_minimum: 0,
    supplier_id: "",
  });

  const filtered = materials.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.nama_bahan.toLowerCase().includes(q) ||
      (m.kategori ?? "").toLowerCase().includes(q) ||
      (m.suppliers?.nama_supplier ?? "").toLowerCase().includes(q)
    );
  });
  type SortField = "nama_bahan" | "kategori" | "satuan" | "stok" | "stok_minimum" | "supplier" | "status";
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

  function sortValue(m: Material, field: SortField) {
    switch (field) {
      case "supplier":
        return m.suppliers?.nama_supplier ?? "";
      default:
        return m[field];
    }
  }

  const sorted = sortField
    ? [...filtered].sort((a, b) => compareValues(sortValue(a, sortField), sortValue(b, sortField), sortDir))
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalJenis = materials.length;
  const totalAman = materials.filter((m) => m.status === "Aman").length;
  const totalKritis = materials.filter((m) => m.status === "Kritis").length;

  function openAdd() {
    setEditing(null);
    setForm({
      nama_bahan: "",
      kategori: KATEGORI_OPTIONS[0],
      satuan: SATUAN_OPTIONS[0],
      stok: 0,
      stok_minimum: 0,
      supplier_id: suppliers[0]?.id ?? "",
    });
    setShowModal(true);
  }

  function openEdit(m: Material) {
    setEditing(m);
    setForm({
      nama_bahan: m.nama_bahan,
      kategori: m.kategori ?? KATEGORI_OPTIONS[0],
      satuan: m.satuan ?? SATUAN_OPTIONS[0],
      stok: m.stok,
      stok_minimum: m.stok_minimum,
      supplier_id: m.supplier_id ?? "",
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      nama_bahan: form.nama_bahan,
      kategori: form.kategori,
      satuan: form.satuan,
      stok: Number(form.stok),
      stok_minimum: Number(form.stok_minimum),
      supplier_id: form.supplier_id || null,
    };

    if (editing) {
      const { data, error } = await supabase
        .from("raw_materials")
        .update(payload)
        .eq("id", editing.id)
        .select("*, suppliers(nama_supplier)")
        .single();
      if (!error && data) {
        setMaterials((prev) => prev.map((m) => (m.id === editing.id ? data : m)));
        showToast("Bahan berhasil diperbarui.", "success");
      } else {
        showToast("Gagal menyimpan: " + error?.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("raw_materials")
        .insert(payload)
        .select("*, suppliers(nama_supplier)")
        .single();
      if (!error && data) {
        setMaterials((prev) => [data, ...prev]);
        showToast("Bahan baru berhasil ditambahkan.", "success");
      } else {
        showToast("Gagal menyimpan: " + error?.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setShowModal(false);
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ message: "Bahan ini akan dihapus permanen dari data stok.", danger: true });
    if (!ok) return;
    const { error } = await supabase.from("raw_materials").delete().eq("id", id);
    if (!error) {
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    }
  }

  async function quickAdjustStock(m: Material, delta: number) {
    const newStok = Math.max(0, Number(m.stok) + delta);
    const { data, error } = await supabase
      .from("raw_materials")
      .update({ stok: newStok })
      .eq("id", m.id)
      .select("*, suppliers(nama_supplier)")
      .single();
    if (!error && data) {
      setMaterials((prev) => prev.map((mat) => (mat.id === m.id ? data : mat)));
    }
  }

  function handleExport() {
    exportToExcel(
      "stok-bahan-baku",
      "Gudang",
      sorted.map((m) => ({
        "Nama Bahan": m.nama_bahan,
        Kategori: m.kategori ?? "-",
        Satuan: m.satuan ?? "-",
        Stok: m.stok,
        "Stok Minimum": m.stok_minimum,
        Supplier: m.suppliers?.nama_supplier ?? "-",
        Status: m.status,
      }))
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Cari bahan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field rounded-full pl-10"
          />
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={sorted.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-[#21262d] disabled:cursor-not-allowed disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <Download size={15} />
          Export
        </button>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 whitespace-nowrap"
        >
          <Plus size={16} />
          Bahan Masuk
        </button>
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "none" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <TableIconCell icon={Package} />
                <SortableTh label="Nama Bahan" icon={Package} active={sortField === "nama_bahan"} direction={sortDir} onClick={() => toggleSort("nama_bahan")} center />
                <SortableTh label="Kategori" icon={Tag} active={sortField === "kategori"} direction={sortDir} onClick={() => toggleSort("kategori")} center />
                <SortableTh label="Satuan" icon={Ruler} active={sortField === "satuan"} direction={sortDir} onClick={() => toggleSort("satuan")} center />
                <SortableTh label="Stok" icon={Boxes} active={sortField === "stok"} direction={sortDir} onClick={() => toggleSort("stok")} center />
                <SortableTh label="Minimum" icon={AlertTriangle} active={sortField === "stok_minimum"} direction={sortDir} onClick={() => toggleSort("stok_minimum")} center />
                <SortableTh label="Supplier" icon={Truck} active={sortField === "supplier"} direction={sortDir} onClick={() => toggleSort("supplier")} center />
                <SortableTh label="Status" icon={CheckCircle2} active={sortField === "status"} direction={sortDir} onClick={() => toggleSort("status")} center />
                <SortableTh label="Aksi" icon={MoreHorizontal} sortable={false} center />
              </tr>
            </thead>
            <tbody>
              {paginated.map((m, idx) => (
                <tr key={m.id}>
                  <td>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#21262d]/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </span>
                  </td>
                  <td className="text-black dark:text-white text-center">{m.nama_bahan}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{m.kategori}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{m.satuan}</td>
                  <td>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => quickAdjustStock(m, -1)}
                        className="w-6 h-6 rounded border border-gray-300 dark:border-[#3d444d] text-xs hover:border-blue-600"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm text-gray-800 dark:text-gray-200">{m.stok}</span>
                      <button
                        onClick={() => quickAdjustStock(m, 1)}
                        className="w-6 h-6 rounded border border-gray-300 dark:border-[#3d444d] text-xs hover:border-blue-600"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{m.stok_minimum}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{m.suppliers?.nama_supplier ?? "-"}</td>
                  <td className="text-center">
                    <span
                      className={`badge ${
                        m.status === "Aman"
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                          : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                      }`}
                    >
                      <span className="status-dot" />
                      {m.status}
                    </span>
                  </td>
                  <td className="td-center">
                    <div className="flex justify-center gap-1.5">
                      <button
                        onClick={() => openEdit(m)}
                        title="Edit"
                        aria-label="Edit"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        title="Hapus"
                        aria-label="Hapus"
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
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center min-h-[220px] gap-3 py-8">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40">
                        <PackageOpen size={26} className="text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
                      </div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        {search ? "Tidak ditemukan" : "Belum ada data bahan baku"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs text-center">
                        {search ? "Coba kata kunci pencarian lain." : "Mulai catat bahan baku pertama kamu."}
                      </p>
                      {!search && (
                        <button
                          onClick={openAdd}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                        >
                          <Plus size={14} />
                          Bahan Masuk
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
              Menampilkan {paginated.length} dari {filtered.length} bahan
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

      <div className="card p-0 overflow-hidden" style={{ border: "none" }}>
        <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-700 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/40">
              <Boxes size={20} className="text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalJenis}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Jenis Bahan</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/40">
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalAman}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Stok Aman</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/40">
              <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalKritis}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Stok Kritis</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="modal-fade-in card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-0 shadow-2xl" style={{ border: "none" }}>
            <div className="rounded-t-2xl bg-blue-50 dark:bg-blue-900/30 px-6 py-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/30">
                <Package size={18} className="text-white" />
              </span>
              <h2 className="font-display font-bold text-base text-black dark:text-white">
                {editing ? "Edit Bahan" : "Bahan Masuk"}
              </h2>
            </div>
            {/* Konsisten sama polesan yang baru dipakai di modal "Pesanan
                Baru" -- label kecil di tiap field (sebelumnya Kategori/
                Satuan tidak ada label sama sekali, cuma select polos),
                ikon kontekstual di tiap label, chevron custom (bukan
                bawaan browser) di semua <select>, dan Stok Awal/Minimum
                digabung 1 panel bertinta karena keduanya sama-sama soal
                ambang stok (sama seperti DP+Total digabung di Pesanan). */}
            <form onSubmit={handleSave} className="space-y-3 px-6 py-5">
              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Tag size={12} className="text-gray-500 dark:text-gray-400" />
                  Nama Bahan
                </span>
                <input
                  required
                  value={form.nama_bahan}
                  onChange={(e) => setForm({ ...form, nama_bahan: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <PackageOpen size={12} className="text-gray-500 dark:text-gray-400" />
                    Kategori
                  </span>
                  {/* Diganti dari <select> polos jadi tombol pemicu bottom
                      sheet "Kategori Bahan" (sesuai contoh dari user) --
                      value form.kategori tetap sama persis, cuma cara
                      memilihnya yang beda. */}
                  <button
                    type="button"
                    onClick={() => setShowKategoriPicker(true)}
                    className="input-field flex w-full items-center gap-2 text-left"
                  >
                    {(() => {
                      const meta = KATEGORI_META[form.kategori];
                      const KIcon = meta?.icon ?? Package;
                      return (
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${meta?.bg ?? "bg-gray-100 dark:bg-[#21262d]"} ${meta?.text ?? "text-gray-500"}`}>
                          <KIcon size={11} />
                        </span>
                      );
                    })()}
                    <span className="flex-1 truncate">{form.kategori}</span>
                    <ChevronDown size={13} className="shrink-0 text-gray-400" />
                  </button>
                </div>
                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <Ruler size={12} className="text-gray-500 dark:text-gray-400" />
                    Satuan
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSatuanPicker(true)}
                    className="input-field flex w-full items-center gap-2 text-left"
                  >
                    {(() => {
                      const SIcon = SATUAN_META[form.satuan]?.icon ?? Ruler;
                      return (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                          <SIcon size={11} />
                        </span>
                      );
                    })()}
                    <span className="flex-1 truncate">{form.satuan}</span>
                    <ChevronDown size={13} className="shrink-0 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-[#30363d] bg-gray-50/70 dark:bg-[#0d1117] p-3.5">
                <span className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Boxes size={12} className="text-gray-500 dark:text-gray-400" />
                  Level Stok
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] text-gray-400">Stok Awal</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={form.stok || ""}
                      onChange={(e) => setForm({ ...form, stok: e.target.value === "" ? 0 : Number(e.target.value) })}
                      className="input-field w-full bg-white dark:bg-[#161b22]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-gray-400">Stok Minimum</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={form.stok_minimum || ""}
                      onChange={(e) => setForm({ ...form, stok_minimum: e.target.value === "" ? 0 : Number(e.target.value) })}
                      className="input-field w-full bg-white dark:bg-[#161b22]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Truck size={12} className="text-gray-500 dark:text-gray-400" />
                  Supplier
                </span>
                <div className="relative">
                  <select
                    value={form.supplier_id}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    className="input-field w-full appearance-none pr-7"
                  >
                    <option value="">- Pilih Supplier -</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama_supplier}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
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
      {/* Bottom sheet "Kategori Bahan" (sesuai contoh dari user) -- lewat
          createPortal ke document.body supaya tidak tersandung backdrop-
          filter ancestor mana pun (pola sama yang dipakai useConfirm/
          useToast), dan z-index lebih tinggi dari modal Bahan Masuk (z-50)
          di baliknya. Radio + highlight-nya murni CSS, bukan <input
          type="radio"> asli, karena tiap baris sudah jadi tombol sendiri. */}
      {showKategoriPicker &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
            onClick={() => setShowKategoriPicker(false)}
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
                  <h3 className="font-display text-base font-bold text-black dark:text-white">Kategori Bahan</h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Pilih kategori bahan yang sesuai</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKategoriPicker(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="space-y-2 px-5 pb-6 pt-3">
                {KATEGORI_OPTIONS.map((k) => {
                  const meta = KATEGORI_META[k];
                  const KIcon = meta.icon;
                  const active = form.kategori === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, kategori: k });
                        setShowKategoriPicker(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                        active
                          ? "border-blue-300 bg-blue-50/70 dark:border-blue-500/40 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-[#30363d]"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bg} ${meta.text}`}>
                        <KIcon size={16} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{k}</span>
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
      {/* Bottom sheet "Satuan" -- pola identik sama Kategori Bahan di atas,
          cuma semua ikonnya 1 warna biru (bukan beda-beda per pilihan). */}
      {showSatuanPicker &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
            onClick={() => setShowSatuanPicker(false)}
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
                  <h3 className="font-display text-base font-bold text-black dark:text-white">Satuan</h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Pilih satuan yang sesuai</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSatuanPicker(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="space-y-2 px-5 pb-6 pt-3">
                {SATUAN_OPTIONS.map((s) => {
                  const SIcon = SATUAN_META[s]?.icon ?? Ruler;
                  const active = form.satuan === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, satuan: s });
                        setShowSatuanPicker(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                        active
                          ? "border-blue-300 bg-blue-50/70 dark:border-blue-500/40 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-[#30363d]"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                        <SIcon size={16} />
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{s}</span>
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
      {ConfirmDialog}
      {ToastBanner}
    </div>
  );
}
