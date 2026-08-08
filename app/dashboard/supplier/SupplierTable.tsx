"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    nama_supplier: "",
    kontak: "",
    no_telepon: "",
    alamat: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

  const filtered = suppliers.filter((s) =>
    s.nama_supplier.toLowerCase().includes(search.toLowerCase())
  );

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

    if (editing) {
      const { data, error } = await supabase
        .from("suppliers")
        .update(form)
        .eq("id", editing.id)
        .select()
        .single();
      if (!error && data) {
        setSuppliers((prev) => prev.map((s) => (s.id === editing.id ? data : s)));
      }
    } else {
      const { data, error } = await supabase.from("suppliers").insert(form).select().single();
      if (!error && data) {
        setSuppliers((prev) => [data, ...prev]);
      }
    }

    setShowModal(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus supplier ini?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (!error) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    }
  }

  return (
    <div className="card">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
        <input
          placeholder="Cari supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field md:max-w-xs"
        />
        <button onClick={openAdd} className="btn-primary whitespace-nowrap">
          + Tambah Supplier
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="table-djoker">
          <thead>
            <tr>
              <th>Nama Supplier</th>
              <th>Kontak</th>
              <th>No. Telepon</th>
              <th>Alamat</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="font-semibold text-black">{s.nama_supplier}</td>
                <td className="text-gray-700">{s.kontak || "-"}</td>
                <td className="text-gray-700">{s.no_telepon || "-"}</td>
                <td className="text-gray-600 max-w-xs truncate">{s.alamat || "-"}</td>
                <td>
                  <span
                    className={`badge ${
                      s.status === "Aktif"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {s.status}
                  </span>
                </td>
                <td>
                  <div className="flex justify-end gap-3 text-xs">
                    <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-700 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-700 hover:underline">
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="flex min-h-[140px] items-center justify-center text-gray-500">
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
        {filtered.length === 0 ? (
          <div className="flex min-h-[140px] items-center justify-center text-gray-500">
            Belum ada data supplier.
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="rounded-2xl border border-djoker-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-black">{s.nama_supplier}</p>
                  <p className="text-sm text-gray-600">{s.kontak || "-"}</p>
                </div>
                <span
                  className={`badge shrink-0 ${
                    s.status === "Aktif" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {s.status}
                </span>
              </div>

              <div className="text-sm text-gray-700">
                <p><span className="font-medium text-gray-900">No. Telepon:</span> {s.no_telepon || "-"}</p>
                <p className="mt-1"><span className="font-medium text-gray-900">Alamat:</span> {s.alamat || "-"}</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => openEdit(s)} className="btn-outline flex-1 !py-2 text-sm">
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="card w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-semibold text-lg mb-4">
              {editing ? "Edit Supplier" : "Tambah Supplier"}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
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
                <button type="submit" className="btn-primary flex-1">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
