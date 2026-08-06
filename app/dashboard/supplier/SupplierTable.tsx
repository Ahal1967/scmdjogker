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
      <div className="flex items-center justify-between mb-4 gap-3">
        <input
          placeholder="Cari supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-xs"
        />
        <button onClick={openAdd} className="btn-primary whitespace-nowrap">
          + Tambah Supplier
        </button>
      </div>

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
              <td className="font-medium">{s.nama_supplier}</td>
              <td>{s.kontak}</td>
              <td>{s.no_telepon}</td>
              <td>{s.alamat}</td>
              <td>
                <span
                  className={`badge ${
                    s.status === "Aktif"
                      ? "bg-green-500/15 text-green-400"
                      : "bg-djoker-muted/15 text-djoker-muted"
                  }`}
                >
                  {s.status}
                </span>
              </td>
              <td>
                <div className="flex gap-3 text-xs">
                  <button onClick={() => openEdit(s)} className="text-blue-400 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-djoker-red hover:underline">
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-djoker-muted py-8">
                Belum ada data supplier.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
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
