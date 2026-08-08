"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [form, setForm] = useState({
    nama_bahan: "",
    kategori: KATEGORI_OPTIONS[0],
    satuan: SATUAN_OPTIONS[0],
    stok: 0,
    stok_minimum: 0,
    supplier_id: "",
  });

  const filtered = materials.filter((m) =>
    m.nama_bahan.toLowerCase().includes(search.toLowerCase())
  );

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
      }
    } else {
      const { data, error } = await supabase
        .from("raw_materials")
        .insert(payload)
        .select("*, suppliers(nama_supplier)")
        .single();
      if (!error && data) {
        setMaterials((prev) => [data, ...prev]);
      }
    }

    setShowModal(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus bahan ini dari stok?")) return;
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
    <div className="card overflow-x-auto">
      <div className="mb-4 flex items-center justify-between gap-3">
        <input
          placeholder="Cari bahan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-xs"
        />
        <button onClick={openAdd} className="btn-primary whitespace-nowrap">
          + Bahan Masuk
        </button>
      </div>

      <table className="table-djoker w-full">
        <thead>
          <tr>
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
          {filtered.map((m) => (
            <tr key={m.id}>
              <td className="font-semibold text-black">{m.nama_bahan}</td>
              <td className="text-sm text-gray-700">{m.kategori}</td>
              <td className="text-sm text-gray-700">{m.satuan}</td>
              <td>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => quickAdjustStock(m, -1)}
                    className="w-6 h-6 rounded border border-gray-300 text-xs hover:border-blue-600"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm text-gray-800">{m.stok}</span>
                  <button
                    onClick={() => quickAdjustStock(m, 1)}
                    className="w-6 h-6 rounded border border-gray-300 text-xs hover:border-blue-600"
                  >
                    +
                  </button>
                </div>
              </td>
              <td className="text-sm text-gray-700">{m.stok_minimum}</td>
              <td className="text-sm text-gray-700">{m.suppliers?.nama_supplier ?? "-"}</td>
              <td>
                <span
                  className={`badge ${
                    m.status === "Aman"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {m.status}
                </span>
              </td>
              <td className="text-right">
                <div className="flex justify-end gap-3 text-xs">
                  <button onClick={() => openEdit(m)} className="text-blue-600 hover:text-blue-700 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-700 hover:underline">
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={8}>
                <div className="flex min-h-[140px] items-center justify-center text-gray-500">
                  Belum ada data bahan baku.
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="card w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-semibold text-lg mb-4 text-black">
              {editing ? "Edit Bahan" : "Bahan Masuk"}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
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
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Stok Awal</label>
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
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Stok Minimum</label>
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
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Supplier</label>
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
