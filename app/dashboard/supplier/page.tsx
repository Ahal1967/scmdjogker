"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("nama_supplier", { ascending: true });

    if (error) {
      console.error("Error fetching suppliers:", error);
    } else {
      setSuppliers(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus supplier "${nama}"?`)) return;

    const res = await fetch("/api/suppliers/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      fetchSuppliers();
    } else {
      alert("Gagal menghapus supplier");
    }
  }

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Memuat data supplier...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Supplier</h1>
        <p className="mt-1 text-sm text-gray-600">
          Kelola data supplier bahan baku.
        </p>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Supplier
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-black">
            {suppliers.length}
          </p>
        </div>
      </div>

      {/* Tabel Supplier */}
      <div className="card overflow-x-auto">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <h2 className="text-base font-semibold text-black md:text-lg">Daftar Supplier</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <th className="whitespace-nowrap">Nama Supplier</th>
                <th className="whitespace-nowrap">Kontak</th>
                <th className="whitespace-nowrap">Alamat</th>
                <th className="text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="font-semibold text-black whitespace-nowrap">
                    {s.nama_supplier || "-"}
                  </td>
                  <td className="text-sm text-gray-700">
                    <div className="flex flex-col gap-1">
                      <span className="whitespace-nowrap">{s.kontak_person || "-"}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {s.no_telepon || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="text-sm text-gray-600 max-w-[8rem] truncate md:max-w-xs">
                    {s.alamat || "-"}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-3 text-xs">
                      <button
                        className="text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap"
                        onClick={() => alert("Fitur edit akan segera hadir")}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-600 hover:text-red-700 hover:underline whitespace-nowrap"
                        onClick={() => handleDelete(s.id, s.nama_supplier || "-")}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 py-8 whitespace-nowrap">
                    Belum ada data supplier.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}