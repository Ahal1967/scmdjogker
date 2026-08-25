"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Plus,
  Shirt,
  Tag,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
  PackageOpen,
  ListChecks,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useToast } from "@/components/useToast";
import { useConfirm } from "@/components/useConfirm";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import { compareValues } from "@/lib/sortUtils";

type RawMaterial = { id: string; nama_bahan: string; satuan: string | null };

type Product = {
  id: string;
  nama_produk: string;
  kategori: string | null;
  harga_default: number;
};

type BomRow = { raw_material_id: string; qty_per_unit: number };

// Estimasi pemakaian bahan per 1 kaos, berdasarkan angka umum industri
// sablon yang dikasih Ahal langsung (bukan saya karang) -- ini cuma
// TITIK AWAL biar staf tidak perlu ngitung sendiri dari nol, bukan angka
// pasti. Realisasinya tetap bisa beda tergantung ukuran desain, cakupan
// warna, mix ukuran kaos (S/M/L/XL), dan teknik sablonnya -- karena itu
// hasil estimasi ini tetap ngisi field yang sama dan tetap bisa diedit
// manual sebelum disimpan, bukan dikunci.
const ESTIMASI_BAHAN = [
  {
    key: "tinta",
    label: "Tinta rubber/waterbase -- ±85 kaos per liter/kg (rentang umum 70-100)",
    qtyPerUnit: 1 / 85,
  },
  {
    key: "kain30s",
    label: "Kain Cotton Combed 30s (tipis/sedang) -- ±122 kaos per roll ±25kg (rentang 120-125)",
    qtyPerUnit: 1 / 122.5,
  },
  {
    key: "kain24s",
    label: "Kain Cotton Combed 24s (lebih tebal) -- ±105 kaos per roll ±25kg (rentang 100-110)",
    qtyPerUnit: 1 / 105,
  },
];

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function ProdukTable({
  initialProducts,
  rawMaterials,
}: {
  initialProducts: Product[];
  rawMaterials: RawMaterial[];
}) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastBanner } = useToast();

  // ---------- Modal tambah/edit produk ----------
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ nama_produk: "", kategori: "", harga_default: 0 });

  // ---------- Modal resep (BOM) ----------
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);
  const [recipeRows, setRecipeRows] = useState<BomRow[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return p.nama_produk.toLowerCase().includes(q) || (p.kategori ?? "").toLowerCase().includes(q);
  });

  type SortField = "nama_produk" | "kategori" | "harga_default";
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

  const totalProduk = products.length;

  function openAdd() {
    setEditing(null);
    setForm({ nama_produk: "", kategori: "", harga_default: 0 });
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ nama_produk: p.nama_produk, kategori: p.kategori ?? "", harga_default: p.harga_default });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      nama_produk: form.nama_produk,
      kategori: form.kategori || null,
      harga_default: Number(form.harga_default),
    };

    if (editing) {
      const { data, error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (!error && data) {
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? data : p)));
        showToast("Produk berhasil diperbarui.", "success");
      } else {
        showToast("Gagal menyimpan: " + error?.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select().single();
      if (!error && data) {
        setProducts((prev) => [data, ...prev]);
        showToast("Produk baru berhasil ditambahkan.", "success");
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
    const ok = await confirm({
      message: "Produk ini akan dihapus permanen, termasuk resep bahan yang sudah diatur.",
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast("Produk berhasil dihapus.", "success");
    } else {
      showToast("Gagal menghapus: " + error.message);
    }
  }

  async function openRecipe(p: Product) {
    setRecipeProduct(p);
    setShowRecipeModal(true);
    setLoadingRecipe(true);

    const { data, error } = await supabase
      .from("product_materials")
      .select("raw_material_id, qty_per_unit")
      .eq("product_id", p.id);

    if (!error && data) {
      setRecipeRows(
        data.length > 0
          ? data.map((r) => ({ raw_material_id: r.raw_material_id, qty_per_unit: Number(r.qty_per_unit) }))
          : [{ raw_material_id: rawMaterials[0]?.id ?? "", qty_per_unit: 0 }]
      );
    } else {
      setRecipeRows([{ raw_material_id: rawMaterials[0]?.id ?? "", qty_per_unit: 0 }]);
    }
    setLoadingRecipe(false);
  }

  function addRecipeRow() {
    setRecipeRows((prev) => [...prev, { raw_material_id: rawMaterials[0]?.id ?? "", qty_per_unit: 0 }]);
  }

  function removeRecipeRow(idx: number) {
    setRecipeRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateRecipeRow(idx: number, field: keyof BomRow, value: string | number) {
    setRecipeRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function saveRecipe() {
    if (!recipeProduct) return;
    setSavingRecipe(true);

    const validRows = recipeRows.filter((r) => r.raw_material_id && Number(r.qty_per_unit) > 0);

    // Sinkronisasi paling sederhana & aman: hapus semua baris resep lama
    // produk ini, lalu masukkan ulang baris yang valid sekarang. Produk
    // biasanya cuma punya beberapa bahan (bukan ratusan baris), jadi
    // hapus-lalu-insert ulang ini jauh lebih simpel & tidak rawan bug
    // dibanding diffing baris satu-satu, dengan ongkos performa yang
    // bisa diabaikan.
    const { error: delError } = await supabase
      .from("product_materials")
      .delete()
      .eq("product_id", recipeProduct.id);

    if (delError) {
      showToast("Gagal menyimpan resep: " + delError.message);
      setSavingRecipe(false);
      return;
    }

    if (validRows.length > 0) {
      const { error: insError } = await supabase.from("product_materials").insert(
        validRows.map((r) => ({
          product_id: recipeProduct.id,
          raw_material_id: r.raw_material_id,
          qty_per_unit: Number(r.qty_per_unit),
        }))
      );
      if (insError) {
        showToast("Gagal menyimpan resep: " + insError.message);
        setSavingRecipe(false);
        return;
      }
    }

    setSavingRecipe(false);
    setShowRecipeModal(false);
    showToast("Resep bahan berhasil disimpan.", "success");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Cari produk..."
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
          Produk Baru
        </button>
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "none" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <TableIconCell icon={Shirt} />
                <SortableTh label="Nama Produk" icon={Shirt} active={sortField === "nama_produk"} direction={sortDir} onClick={() => toggleSort("nama_produk")} center />
                <SortableTh label="Kategori" icon={Tag} active={sortField === "kategori"} direction={sortDir} onClick={() => toggleSort("kategori")} center />
                <SortableTh label="Harga Default" icon={Wallet} active={sortField === "harga_default"} direction={sortDir} onClick={() => toggleSort("harga_default")} center />
                <SortableTh label="Aksi" icon={MoreHorizontal} sortable={false} center />
              </tr>
            </thead>
            <tbody>
              {paginated.map((p, idx) => (
                <tr key={p.id}>
                  <td>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#21262d]/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </span>
                  </td>
                  <td className="text-black dark:text-white text-center">{p.nama_produk}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{p.kategori ?? "-"}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{formatRupiah(p.harga_default)}</td>
                  <td className="td-center">
                    <div className="flex justify-center gap-1.5">
                      <button
                        onClick={() => openRecipe(p)}
                        title="Kelola Resep Bahan"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/40 transition-colors"
                      >
                        <ListChecks size={15} />
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        title="Edit"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
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
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center min-h-[220px] gap-3 py-8">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40">
                        <PackageOpen size={26} className="text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
                      </div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        {search ? "Tidak ditemukan" : "Belum ada produk"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs text-center">
                        {search
                          ? "Coba kata kunci pencarian lain."
                          : "Tambahkan produk dulu supaya bisa dipilih saat membuat pesanan, dan supaya stok bahan bisa otomatis terpotong."}
                      </p>
                      {!search && (
                        <button
                          onClick={openAdd}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                        >
                          <Plus size={14} />
                          Produk Baru
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
              Menampilkan {paginated.length} dari {filtered.length} produk
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
        <div className="flex items-center gap-3 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/40">
            <Shirt size={20} className="text-blue-600 dark:text-blue-400" />
          </span>
          <div>
            <p className="font-display text-xl font-bold text-black dark:text-white">{totalProduk}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Produk di Katalog</p>
          </div>
        </div>
      </div>

      {/* Modal tambah/edit produk */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-0" style={{ border: "none" }}>
            <div className="rounded-t-2xl bg-blue-50 dark:bg-blue-900/30 px-6 py-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/30">
                <Shirt size={18} className="text-white" />
              </span>
              <h2 className="font-display font-bold text-base text-black dark:text-white">
                {editing ? "Edit Produk" : "Produk Baru"}
              </h2>
            </div>
            <form onSubmit={handleSave} className="space-y-3 px-6 py-5">
              <input
                required
                placeholder="Nama Produk (mis. Kaos Cotton Combed 30s)"
                value={form.nama_produk}
                onChange={(e) => setForm({ ...form, nama_produk: e.target.value })}
                className="input-field"
              />
              <input
                placeholder="Kategori (opsional, mis. Kaos, Hoodie)"
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                className="input-field"
              />
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                  Harga Default
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={form.harga_default === 0 ? "" : form.harga_default.toLocaleString("id-ID")}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, harga_default: raw === "" ? 0 : Number(raw) });
                  }}
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Harga ini cuma isi awal saat produk dipilih di form pesanan -- tetap bisa diubah manual per pesanan.
                </p>
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

      {/* Modal resep / BOM */}
      {showRecipeModal && recipeProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="card card-modal w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto p-0" style={{ border: "none" }}>
            <div className="rounded-t-2xl bg-purple-50 dark:bg-purple-900/30 px-6 py-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 shadow-sm shadow-purple-600/30">
                  <ListChecks size={18} className="text-white" />
                </span>
                <div>
                  <h2 className="font-display font-bold text-base text-black dark:text-white">Resep Bahan</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{recipeProduct.nama_produk}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRecipeModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#21262d]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tentukan bahan baku apa saja dan berapa banyak dipakai untuk membuat <b>1 unit</b> produk ini. Setiap
                pesanan baru yang memakai produk ini akan otomatis memotong stok bahan sesuai resep × jumlah pesanan.
              </p>

              {loadingRecipe ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  {recipeRows.map((r, idx) => {
                    const material = rawMaterials.find((m) => m.id === r.raw_material_id);
                    return (
                      <div key={idx} className="space-y-1 rounded-lg border border-gray-100 dark:border-[#30363d] p-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <select
                            value={r.raw_material_id}
                            onChange={(e) => updateRecipeRow(idx, "raw_material_id", e.target.value)}
                            className="input-field min-w-0 flex-1"
                          >
                            {rawMaterials.length === 0 && <option value="">- Belum ada bahan di Gudang -</option>}
                            {rawMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nama_bahan}
                              </option>
                            ))}
                          </select>
                          {/* Qty/satuan/hapus digabung 1 baris terpisah di layar sempit (HP)
                              supaya tidak berdesakan dengan select bahan di atas -- di layar
                              >=sm baru sejajar lagi jadi 1 baris penuh. */}
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              placeholder="Jumlah"
                              value={r.qty_per_unit || ""}
                              onChange={(e) =>
                                updateRecipeRow(idx, "qty_per_unit", e.target.value === "" ? 0 : Number(e.target.value))
                              }
                              className="input-field w-24"
                            />
                            <span className="w-14 shrink-0 text-xs text-gray-400 dark:text-gray-500">
                              {material?.satuan ?? ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeRecipeRow(idx)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <select
                          value=""
                          onChange={(e) => {
                            const preset = ESTIMASI_BAHAN.find((p) => p.key === e.target.value);
                            if (preset) updateRecipeRow(idx, "qty_per_unit", Number(preset.qtyPerUnit.toFixed(5)));
                          }}
                          className="w-full rounded-lg border border-dashed border-gray-200 dark:border-[#3d444d] bg-transparent px-2 py-1 text-[10.5px] text-gray-400 dark:text-gray-500"
                        >
                          <option value="">Isi cepat: pakai estimasi umum industri...</option>
                          {ESTIMASI_BAHAN.map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={addRecipeRow}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 dark:border-[#3d444d] px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <Plus size={13} />
                    Tambah Bahan
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowRecipeModal(false)} className="btn-outline flex-1">
                  Batal
                </button>
                <button
                  type="button"
                  onClick={saveRecipe}
                  disabled={savingRecipe || loadingRecipe}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {savingRecipe && <Loader2 size={15} className="animate-spin" />}
                  {savingRecipe ? "Menyimpan..." : "Simpan Resep"}
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
