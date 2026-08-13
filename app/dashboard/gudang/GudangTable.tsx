"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus, Package, Boxes, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Pencil, Trash2, Loader2, PackageOpen } from "lucide-react";
import { useToast } from "@/components/useToast";
import { useConfirm } from "@/components/useConfirm";

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
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 whitespace-nowrap"
        >
          <Plus size={16} />
          Bahan Masuk
        </button>
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "1px solid #e5e7eb" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>Nama Bahan</th>
                <th>Kategori</th>
                <th>Satuan</th>
                <th>Stok</th>
                <th>Minimum</th>
                <th>Supplier</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/40">
                      <Package size={15} className="text-blue-600 dark:text-blue-400" />
                    </span>
                  </td>
                  <td className="font-semibold text-black dark:text-white">{m.nama_bahan}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{m.kategori}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{m.satuan}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => quickAdjustStock(m, -1)}
                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 text-xs hover:border-blue-600"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm text-gray-800 dark:text-gray-200">{m.stok}</span>
                      <button
                        onClick={() => quickAdjustStock(m, 1)}
                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 text-xs hover:border-blue-600"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{m.stok_minimum}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{m.suppliers?.nama_supplier ?? "-"}</td>
                  <td>
                    <span
                      className={`badge ${
                        m.status === "Aman"
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                          : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(m)}
                        title="Edit"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
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
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-700 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {paginated.length} dari {filtered.length} bahan
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
          <div className="card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-0" style={{ border: "1px solid #e5e7eb" }}>
            <div className="rounded-t-2xl bg-blue-50 dark:bg-blue-900/30 px-6 py-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/30">
                <Package size={18} className="text-white" />
              </span>
              <h2 className="font-display font-bold text-base text-black dark:text-white">
                {editing ? "Edit Bahan" : "Bahan Masuk"}
              </h2>
            </div>
            <form onSubmit={handleSave} className="space-y-3 px-6 py-5">
              <input
                required
                placeholder="Nama Bahan"
                value={form.nama_bahan}
                onChange={(e) => setForm({ ...form, nama_bahan: e.target.value })}
                className="input-field"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  className="input-field"
                >
                  {KATEGORI_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <select
                  value={form.satuan}
                  onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                  className="input-field"
                >
                  {SATUAN_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Stok Awal</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.stok}
                    onChange={(e) => setForm({ ...form, stok: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Stok Minimum</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.stok_minimum}
                    onChange={(e) => setForm({ ...form, stok_minimum: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Supplier</label>
                <select
                  value={form.supplier_id}
                  onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">- Pilih Supplier -</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama_supplier}
                    </option>
                  ))}
                </select>
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
      {ConfirmDialog}
      {ToastBanner}
    </div>
  );
}
