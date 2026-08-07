"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Supplier = {
  id: string;
  nama_supplier: string | null;
  kontak_person: string | null;
  no_telepon: string | null;
  alamat: string | null;
};

export default function SupplierPage() {
  const supabase = createClient();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    nama_supplier: "",
    kontak_person: "",
    no_telepon: "",
    alamat: "",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("nama_supplier", { ascending: true });

    if (error) {
      console.error("Error fetching suppliers:", error);
      setSuppliers([]);
    } else {
      setSuppliers((data || []) as Supplier[]);
    }
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({
      nama_supplier: "",
      kontak_person: "",
      no_telepon: "",
      alamat: "",
    });
    setShowModal(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      nama_supplier: s.nama_supplier || "",
      kontak_person: s.kontak_person || "",
      no_telepon: s.no_telepon || "",
      alamat: s.alamat || "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!form.nama_supplier.trim()) {
      alert("Nama supplier wajib diisi");
      return;
    }

    if (editing) {
      const { data, error } = await supabase
        .from("suppliers")
        .update(form)
        .eq("id", editing.id)
        .select()
        .single();

      if (error) {
        alert("Gagal mengupdate supplier: " + error.message);
        return;
      }

      if (data) {
        setSuppliers((prev) => prev.map((s) => (s.id === editing.id ? (data as Supplier) : s)));
      }
    } else {
      const { data, error } = await supabase
        .from("suppliers")
        .insert(form)
        .select()
        .single();

      if (error) {
        alert("Gagal menambah supplier: " + error.message);
        return;
      }

      if (data) {
        setSuppliers((prev) => [data as Supplier, ...prev]);
      }
    }

    closeModal();
  }

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus supplier "${nama}"?`)) return;

    const { error } = await supabase.from("suppliers").delete().eq("id", id);

    if (error) {
      alert("Gagal menghapus supplier: " + error.message);
      return;
    }

    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }

  const filteredSuppliers = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter((s) =>
      [
        s.nama_supplier,
        s.kontak_person,
        s.no_telepon,
        s.alamat,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Memuat data supplier...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Supplier</h1>
        <p className="mt-1 text-sm text-gray-600">Kelola data supplier bahan baku.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Supplier</p>
          <p className="mt-1 font-display text-3xl font-bold text-black">{suppliers.length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          placeholder="Cari nama / kontak / alamat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field w-full md:max-w-xs"
        />
        <button onClick={openAdd} className="btn-primary whitespace-nowrap">
          + Tambah Supplier
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card overflow-x-auto">
        <h2 className="mb-4 text-base font-semibold text-black md:text-lg">Daftar Supplier</h2>
        <table className="table-djoker w-full">
          <thead>
            <tr>
              <th className="whitespace-nowrap">Nama Supplier</th>
              <th className="whitespace-nowrap">Kontak</th>
              <th className="whitespace-nowrap">No. Telepon</th>
              <th className="whitespace-nowrap">Alamat</th>
              <th className="text-right whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((s) => (
              <tr key={s.id}>
                <td className="font-semibold text-black whitespace-nowrap">{s.nama_supplier || "-"}</td>
                <td className="text-sm text-gray-700 whitespace-nowrap">{s.kontak_person || "-"}</td>
                <td className="text-sm text-gray-700 whitespace-nowrap">{s.no_telepon || "-"}</td>
                <td className="text-sm text-gray-600 max-w-xs truncate">{s.alamat || "-"}</td>
                <td className="text-right whitespace-nowrap">
                  <div className="flex justify-end gap-3 text-xs">
                    <button
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                      onClick={() => openEdit(s)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:text-red-700 hover:underline"
                      onClick={() => handleDelete(s.id, s.nama_supplier || "-")}
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredSuppliers.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="flex min-h-[140px] items-center justify-center py-8 text-gray-500">
                    Belum ada data supplier.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        <h2 className="text-base font-semibold text-black">Daftar Supplier</h2>

        {filteredSuppliers.length === 0 ? (
          <div className="card">
            <div className="flex min-h-[140px] items-center justify-center text-gray-500">
              Belum ada data supplier.
            </div>
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <div key={s.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-black">{s.nama_supplier || "-"}</p>
                  <p className="text-sm text-gray-600">{s.kontak_person || "-"}</p>
                </div>
              </div>

              <div className="text-sm text-gray-700">
                <p><span className="font-medium text-gray-900">No. Telepon:</span> {s.no_telepon || "-"}</p>
                <p className="mt-1"><span className="font-medium text-gray-900">Alamat:</span> {s.alamat || "-"}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600"
                  onClick={() => openEdit(s)}
                >
                  Edit
                </button>
                <button
                  className="flex-1 rounded-md border border-red-600 px-3 py-2 text-sm font-medium text-red-600"
                  onClick={() => handleDelete(s.id, s.nama_supplier || "-")}
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md">
            <h2 className="mb-4 font-display text-lg font-semibold">
              {editing ? "Edit Supplier" : "Tambah Supplier"}
            </h2>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Supplier *</label>
                <input
                  required
                  value={form.nama_supplier}
                  onChange={(e) => setForm({ ...form, nama_supplier: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Kontak Person</label>
                <input
                  value={form.kontak_person}
                  onChange={(e) => setForm({ ...form, kontak_person: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">No. Telepon</label>
                <input
                  value={form.no_telepon}
                  onChange={(e) => setForm({ ...form, no_telepon: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Alamat</label>
                <textarea
                  rows={3}
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-outline flex-1">
                  Batal
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editing ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}