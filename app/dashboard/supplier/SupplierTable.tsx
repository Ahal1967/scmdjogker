"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus, Truck, Users2, CheckCircle2, Ban, ChevronLeft, ChevronRight, Pencil, Trash2, Loader2, PackageOpen, Phone, Smartphone, MapPin, Tag, MoreHorizontal } from "lucide-react";
import { useToast } from "@/components/useToast";
import { useConfirm } from "@/components/useConfirm";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import { compareValues } from "@/lib/sortUtils";

type Supplier = {
  id: string;
  nama_supplier: string;
  kontak: string | null;
  no_telepon: string | null;
  alamat: string | null;
  status: "Aktif" | "Nonaktif";
};

export default function SupplierTable({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastBanner } = useToast();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    nama_supplier: "",
    kontak: "",
    no_telepon: "",
    alamat: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

  const filtered = suppliers.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.nama_supplier.toLowerCase().includes(q) ||
      (s.kontak ?? "").toLowerCase().includes(q) ||
      (s.no_telepon ?? "").includes(q) ||
      (s.alamat ?? "").toLowerCase().includes(q)
    );
  });
  type SortField = "nama_supplier" | "kontak" | "no_telepon" | "alamat" | "status";
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

  const totalSupplier = suppliers.length;
  const totalAktif = suppliers.filter((s) => s.status === "Aktif").length;
  const totalNonaktif = suppliers.filter((s) => s.status === "Nonaktif").length;

  function openAdd() {
    setEditing(null);
    setForm({ nama_supplier: "", kontak: "", no_telepon: "", alamat: "", status: "Aktif" });
    setShowModal(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      nama_supplier: s.nama_supplier,
      kontak: s.kontak ?? "",
      no_telepon: s.no_telepon ?? "",
      alamat: s.alamat ?? "",
      status: s.status,
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editing) {
      const { data, error } = await supabase
        .from("suppliers")
        .update(form)
        .eq("id", editing.id)
        .select()
        .single();
      if (!error && data) {
        setSuppliers((prev) => prev.map((s) => (s.id === editing.id ? data : s)));
        showToast("Supplier berhasil diperbarui.", "success");
      } else {
        showToast("Gagal menyimpan: " + error?.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase.from("suppliers").insert(form).select().single();
      if (!error && data) {
        setSuppliers((prev) => [data, ...prev]);
        showToast("Supplier baru berhasil ditambahkan.", "success");
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
    const ok = await confirm({ message: "Supplier ini akan dihapus permanen dan tidak bisa dikembalikan.", danger: true });
    if (!ok) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (!error) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } else {
      // Sebelumnya tidak ada cabang ini -- kalau delete gagal (misal
      // ke-block foreign key dari data Gudang), baris tetap ada di tabel
      // tanpa penjelasan apa pun ke user.
      console.error("Gagal menghapus supplier:", error.message);
      showToast("Gagal menghapus supplier: " + error.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Cari supplier..."
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
          Tambah Supplier
        </button>
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "none" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <TableIconCell icon={Truck} />
                <SortableTh label="Nama Supplier" icon={Users2} active={sortField === "nama_supplier"} direction={sortDir} onClick={() => toggleSort("nama_supplier")} center />
                <SortableTh label="Kontak" icon={Phone} active={sortField === "kontak"} direction={sortDir} onClick={() => toggleSort("kontak")} center />
                <SortableTh label="No. Telepon" icon={Smartphone} active={sortField === "no_telepon"} direction={sortDir} onClick={() => toggleSort("no_telepon")} center />
                <SortableTh label="Alamat" icon={MapPin} active={sortField === "alamat"} direction={sortDir} onClick={() => toggleSort("alamat")} center />
                <SortableTh label="Status" icon={Tag} active={sortField === "status"} direction={sortDir} onClick={() => toggleSort("status")} center />
                <SortableTh label="Aksi" icon={MoreHorizontal} sortable={false} center />
              </tr>
            </thead>
            <tbody>
              {paginated.map((s, idx) => (
                <tr key={s.id}>
                  <td>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#21262d]/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </span>
                  </td>
                  <td className="text-black dark:text-white text-center">{s.nama_supplier}</td>
                  <td className="text-gray-700 dark:text-gray-300 text-center">{s.kontak || "-"}</td>
                  <td className="text-gray-700 dark:text-gray-300 text-center">{s.no_telepon || "-"}</td>
                  <td className="text-gray-600 dark:text-gray-400 max-w-xs truncate text-center">{s.alamat || "-"}</td>
                  <td className="text-center">
                    <span
                      className={`badge ${
                        s.status === "Aktif"
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                          : "bg-gray-100 dark:bg-[#21262d] text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      <span className="status-dot" />
                      {s.status}
                    </span>
                  </td>
                  <td className="td-center">
                    <div className="flex justify-center gap-1.5">
                      <button
                        onClick={() => openEdit(s)}
                        title="Edit"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
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
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center min-h-[220px] gap-3 py-8">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40">
                        <PackageOpen size={26} className="text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
                      </div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        {search ? "Tidak ditemukan" : "Belum ada data supplier"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs text-center">
                        {search ? "Coba kata kunci pencarian lain." : "Mulai tambahkan supplier pertama kamu."}
                      </p>
                      {!search && (
                        <button
                          onClick={openAdd}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                        >
                          <Plus size={14} />
                          Tambah Supplier
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
              Menampilkan {paginated.length} dari {filtered.length} supplier
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
              <Users2 size={20} className="text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalSupplier}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Supplier</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/40">
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalAktif}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Supplier Aktif</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#21262d]">
              <Ban size={20} className="text-gray-500 dark:text-gray-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalNonaktif}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Nonaktif</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-0" style={{ border: "none" }}>
            <div className="rounded-t-2xl bg-blue-50 dark:bg-blue-900/30 px-6 py-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/30">
                <Truck size={18} className="text-white" />
              </span>
              <h2 className="font-display font-bold text-base text-black dark:text-white">
                {editing ? "Edit Supplier" : "Tambah Supplier"}
              </h2>
            </div>
            <form onSubmit={handleSave} className="space-y-3 px-6 py-5">
              <input
                required
                placeholder="Nama Supplier"
                value={form.nama_supplier}
                onChange={(e) => setForm({ ...form, nama_supplier: e.target.value })}
                className="input-field"
              />
              <input
                placeholder="Kontak"
                value={form.kontak}
                onChange={(e) => setForm({ ...form, kontak: e.target.value })}
                className="input-field"
              />
              <input
                placeholder="No. Telepon"
                value={form.no_telepon}
                onChange={(e) => setForm({ ...form, no_telepon: e.target.value })}
                className="input-field"
              />
              <textarea
                placeholder="Alamat"
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                className="input-field"
                rows={2}
              />
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "Aktif" | "Nonaktif" })}
                className="input-field"
              >
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>

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
