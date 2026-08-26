"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
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
  ChevronDown,
  Save,
  Package,
  Zap,
  BookOpen,
  Droplet,
  Wrench,
  LayoutGrid,
} from "lucide-react";
import { useToast } from "@/components/useToast";
import { useConfirm } from "@/components/useConfirm";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import { compareValues } from "@/lib/sortUtils";

type RawMaterial = { id: string; nama_bahan: string; satuan: string | null; kategori: string | null };

/* Ikon per kategori bahan buat picker "Pilih Bahan" di modal Resep Bahan --
   nilai KATEGORI_OPTIONS-nya SAMA dengan yang di GudangTable.tsx (Kain/
   Tinta/Alat/Bahan/Lainnya), tapi ikon Kain & Tinta di sini sengaja beda
   dari KATEGORI_META di Gudang (yang pakai Layers/Tag) -- di sini ikutin
   referensi user yang lebih baru untuk bagian ini spesifik: Kain pakai
   ikon buku, Tinta pakai ikon tetesan (lebih pas secara makna buat tinta).
   Dua referensi user beda ikon buat kategori yang sama -- kalau mau
   disamakan salah satu, bilang saja. */
const KATEGORI_ICON: Record<string, typeof Package> = {
  Kain: BookOpen,
  Tinta: Droplet,
  Alat: Wrench,
  Bahan: Package,
  Lainnya: LayoutGrid,
};

/* Warna avatar di picker "Pilih Bahan" ditebak dari kata warna yang ada
   di nama bahan (mis. "Kain Hitam" -> hitam), sesuai referensi user.
   Ini heuristik nama, bukan data terstruktur -- bahan yang namanya tidak
   mengandung kata warna dikenal akan jatuh ke warna netral (abu-abu). */
const WARNA_DARI_NAMA: { key: string; bg: string; text: string }[] = [
  { key: "hitam", bg: "bg-gray-900 dark:bg-gray-700", text: "text-white" },
  { key: "putih", bg: "bg-white border border-gray-300 dark:bg-[#21262d] dark:border-[#3d444d]", text: "text-gray-700 dark:text-gray-300" },
  { key: "merah", bg: "bg-red-500", text: "text-white" },
  { key: "pink", bg: "bg-pink-400", text: "text-white" },
  { key: "biru", bg: "bg-blue-500", text: "text-white" },
  { key: "kuning", bg: "bg-yellow-400", text: "text-white" },
  { key: "hijau", bg: "bg-green-500", text: "text-white" },
  { key: "ungu", bg: "bg-purple-500", text: "text-white" },
  { key: "coklat", bg: "bg-amber-800", text: "text-white" },
  { key: "cokelat", bg: "bg-amber-800", text: "text-white" },
  { key: "abu", bg: "bg-gray-400", text: "text-white" },
  { key: "oranye", bg: "bg-orange-500", text: "text-white" },
];

function warnaDariNamaBahan(nama: string) {
  const lower = nama.toLowerCase();
  return WARNA_DARI_NAMA.find((w) => lower.includes(w.key));
}

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
  // Index baris resep yang lagi milih bahan lewat sheet "Pilih Bahan"
  // (null = sheet tertutup). Bukan boolean biasa karena tiap baris resep
  // bisa buka sheet ini sendiri-sendiri.
  const [bahanPickerRowIdx, setBahanPickerRowIdx] = useState<number | null>(null);
  const [bahanSearch, setBahanSearch] = useState("");

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

    // Sebelumnya cuma andalkan HTML5 "required" -- itu cukup buat "nama
    // tidak boleh kosong", TAPI tidak bisa menegakkan aturan bisnis kayak
    // "harga harus > 0" (input harga_default ini text+inputMode numeric,
    // required cuma cek string-nya tidak kosong, jadi kalau kebetulan
    // hasil parsing-nya 0 tetap lolos). Disamakan ke pola PesananTable.tsx:
    // validasi eksplisit + showToast bahasa Indonesia.
    if (!form.nama_produk.trim()) {
      showToast("Nama produk wajib diisi.");
      return;
    }
    if (!form.harga_default || Number(form.harga_default) <= 0) {
      showToast("Harga default harus lebih dari 0.");
      return;
    }

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
                        aria-label="Kelola Resep Bahan"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/40 transition-colors"
                      >
                        <ListChecks size={15} />
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        title="Edit"
                        aria-label="Edit"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
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
          <div className="modal-fade-in card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-0 shadow-2xl" style={{ border: "none" }}>
            <div className="rounded-t-2xl bg-blue-50 dark:bg-blue-900/30 px-6 py-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/30">
                <Shirt size={18} className="text-white" />
              </span>
              <h2 className="font-display font-bold text-base text-black dark:text-white">
                {editing ? "Edit Produk" : "Produk Baru"}
              </h2>
            </div>
            {/* Polesan sama seperti modal "Bahan Masuk" di Gudang dan
                "Pesanan Baru": ikon di dalam field, label kecil buat
                field yang sebelumnya cuma placeholder tanpa label, dan
                Harga Default dibungkus panel bertinta biru + prefix "Rp"
                (bahasa visual yang sama dipakai buat semua field uang di
                app ini -- DP di Pesanan Baru juga begitu). */}
            <form onSubmit={handleSave} className="space-y-3 px-6 py-5">
              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Shirt size={12} className="text-gray-500 dark:text-gray-400" />
                  Nama Produk
                </span>
                <input
                  required
                  value={form.nama_produk}
                  onChange={(e) => setForm({ ...form, nama_produk: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Tag size={12} className="text-gray-500 dark:text-gray-400" />
                  Kategori <span className="font-normal text-gray-400">(opsional)</span>
                </span>
                <input
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/60 dark:bg-blue-900/10 p-3.5">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Wallet size={12} className="text-gray-500 dark:text-gray-400" />
                  Harga Default
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={form.harga_default === 0 ? "" : form.harga_default.toLocaleString("id-ID")}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setForm({ ...form, harga_default: raw === "" ? 0 : Number(raw) });
                    }}
                    className="input-field w-full bg-white dark:bg-[#0d1117] pl-7"
                  />
                </div>
                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
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
          <div className="modal-fade-in card card-modal w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto p-0 shadow-2xl" style={{ border: "none" }}>
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
                <div className="space-y-3">
                  {recipeRows.map((r, idx) => {
                    const material = rawMaterials.find((m) => m.id === r.raw_material_id);
                    return (
                      <div
                        key={idx}
                        className="space-y-2.5 rounded-xl border border-gray-200 dark:border-[#30363d] bg-gray-50/70 dark:bg-[#0d1117] p-3.5"
                      >
                        {/* Header baris: avatar ikon + nama bahan. Diganti dari
                            <select> asli jadi tombol pemicu sheet "Pilih Bahan"
                            (sesuai contoh dari user) -- lebih enak dipakai kalau
                            bahan di Gudang banyak, karena ada pencarian. Avatar
                            ikonnya ikut kategori bahan yang lagi dipilih, warnanya
                            ditebak dari nama (mis. "Kain Hitam" -> hitam). */}
                        <button
                          type="button"
                          onClick={() => {
                            setBahanSearch("");
                            setBahanPickerRowIdx(idx);
                          }}
                          className="flex w-full items-center gap-2.5 text-left"
                        >
                          {(() => {
                            const KIcon = (material?.kategori && KATEGORI_ICON[material.kategori]) || Package;
                            const warna = material ? warnaDariNamaBahan(material.nama_bahan) : undefined;
                            return (
                              <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                                  warna?.bg ?? "bg-purple-50 dark:bg-purple-900/30"
                                } ${warna?.text ?? "text-purple-600 dark:text-purple-300"}`}
                              >
                                <KIcon size={13} />
                              </span>
                            );
                          })()}
                          <span className="min-w-0 flex-1 truncate font-display text-[11px] font-bold text-black dark:text-white">
                            {material?.nama_bahan || "- Pilih bahan -"}
                          </span>
                          <ChevronDown size={13} className="shrink-0 text-gray-400" />
                        </button>

                        {/* Jumlah + satuan (ikut bahan yang dipilih, bukan bisa
                            diganti bebas -- makanya tanpa chevron, biar tidak
                            kelihatan seperti dropdown padahal cuma tampilan) +
                            hapus. */}
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
                            className="input-field w-24 bg-white dark:bg-[#161b22] text-[11px]"
                          />
                          <span className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] px-3 py-2 text-[11px] text-gray-700 dark:text-gray-300">
                            {material?.satuan || "-"}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeRecipeRow(idx)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Isi cepat -- estimasi industri, distyle jadi baris
                            berbingkai (ikon petir + teks + chevron) senada
                            dengan select lain, bukan lagi dashed-select tipis. */}
                        <div className="relative">
                          <Zap size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-purple-500" />
                          <select
                            value=""
                            onChange={(e) => {
                              const preset = ESTIMASI_BAHAN.find((p) => p.key === e.target.value);
                              if (preset) updateRecipeRow(idx, "qty_per_unit", Number(preset.qtyPerUnit.toFixed(5)));
                            }}
                            className="w-full appearance-none rounded-lg border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] py-2 pl-8 pr-7 text-[11px] text-gray-600 dark:text-gray-400"
                          >
                            <option value="">Isi cepat: pakai estimasi umum industri</option>
                            {ESTIMASI_BAHAN.map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
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
                  {savingRecipe ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {savingRecipe ? "Menyimpan..." : "Simpan Resep"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sheet "Pilih Bahan" -- pola sama dengan Kategori/Satuan di Gudang
          (createPortal, backdrop gelap, kartu mengambang di desktop / nempel
          bawah di mobile), tapi aksen warnanya ungu (ikut warna modal Resep
          Bahan) dan ada pencarian karena daftar bahan bisa banyak & bebas
          diisi user (beda dari Kategori/Satuan yang cuma 5 pilihan tetap). */}
      {bahanPickerRowIdx !== null &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
            onClick={() => setBahanPickerRowIdx(null)}
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
                  <h3 className="font-display text-base font-bold text-black dark:text-white">Pilih Bahan</h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Cari atau pilih dari daftar bahan di Gudang</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBahanPickerRowIdx(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="relative shrink-0 px-5 pt-3">
                <Search size={14} className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={bahanSearch}
                  onChange={(e) => setBahanSearch(e.target.value)}
                  placeholder="Cari bahan..."
                  className="input-field w-full pl-9"
                />
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-6 pt-3">
                {rawMaterials.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                    Belum ada bahan di Gudang.
                  </p>
                ) : (
                  rawMaterials
                    .filter((m) => m.nama_bahan.toLowerCase().includes(bahanSearch.toLowerCase()))
                    .map((m) => {
                      const KIcon = (m.kategori && KATEGORI_ICON[m.kategori]) || Package;
                      const warna = warnaDariNamaBahan(m.nama_bahan);
                      const active = bahanPickerRowIdx !== null && recipeRows[bahanPickerRowIdx]?.raw_material_id === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (bahanPickerRowIdx !== null) updateRecipeRow(bahanPickerRowIdx, "raw_material_id", m.id);
                            setBahanPickerRowIdx(null);
                          }}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                            active
                              ? "border-purple-300 bg-purple-50/70 dark:border-purple-500/40 dark:bg-purple-900/20"
                              : "border-gray-200 dark:border-[#30363d]"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              warna?.bg ?? "bg-gray-100 dark:bg-[#21262d]"
                            } ${warna?.text ?? "text-gray-500 dark:text-gray-400"}`}
                          >
                            <KIcon size={16} />
                          </span>
                          <span className="flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">{m.nama_bahan}</span>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              active ? "border-purple-600" : "border-gray-300 dark:border-[#3d444d]"
                            }`}
                          >
                            {active && <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />}
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

      {ConfirmDialog}
      {ToastBanner}
    </div>
  );
}
