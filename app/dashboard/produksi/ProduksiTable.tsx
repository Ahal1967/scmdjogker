"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Production = {
  id: string;
  no_produksi: string;
  status: "Produksi" | "Sablon" | "QC" | "Packing" | "Selesai";
  progress: number;
  order_id: string;
  orders: { no_pesanan: string; customers: { nama: string } | null } | null;
};

const STATUS_OPTIONS = ["Produksi", "Sablon", "QC", "Packing", "Selesai"];

const STATUS_COLORS: Record<string, string> = {
  Produksi: "text-blue-600",
  Sablon: "text-yellow-600",
  QC: "text-purple-600",
  Packing: "text-orange-600",
  Selesai: "text-green-600",
};

export default function ProduksiTable({ initialProductions }: { initialProductions: Production[] }) {
  const supabase = createClient();
  const [productions, setProductions] = useState<Production[]>(initialProductions);
  const [search, setSearch] = useState("");

  const filtered = productions.filter(
    (p) =>
      p.no_produksi.toLowerCase().includes(search.toLowerCase()) ||
      (p.orders?.no_pesanan ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function updateStatus(p: Production, status: string) {
    const progressMap: Record<string, number> = {
      Produksi: 20,
      Sablon: 50,
      QC: 75,
      Packing: 90,
      Selesai: 100,
    };
    const newProgress = progressMap[status] ?? p.progress;

    const { data, error } = await supabase
      .from("production")
      .update({ status, progress: newProgress })
      .eq("id", p.id)
      .select("*, orders(no_pesanan, customers(nama))")
      .single();

    if (!error && data) {
      setProductions((prev) => prev.map((prod) => (prod.id === p.id ? data : prod)));

      if (status === "QC" || status === "Packing" || status === "Selesai" || status === "Produksi") {
        const orderStatus = status === "Selesai" ? "Packing" : status;
        await supabase.from("orders").update({ status: orderStatus }).eq("id", p.order_id);
        await supabase.from("order_tracking").insert({
          order_id: p.order_id,
          tahap: status === "Selesai" ? "Produksi Selesai" : status,
          selesai: true,
        });
      }
    }
  }

  async function updateProgress(p: Production, progress: number) {
    const { data, error } = await supabase
      .from("production")
      .update({ progress })
      .eq("id", p.id)
      .select("*, orders(no_pesanan, customers(nama))")
      .single();
    if (!error && data) {
      setProductions((prev) => prev.map((prod) => (prod.id === p.id ? data : prod)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus data produksi ini?")) return;

    const res = await fetch("/api/production/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setProductions((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert("Gagal menghapus produksi");
    }
  }

  return (
    <div className="card overflow-x-auto">
      <div className="mb-4">
        <input
          placeholder="Cari no. produksi / no. pesanan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-xs"
        />
      </div>

      <table className="table-djoker w-full">
        <thead>
          <tr>
            <th>No. Produksi</th>
            <th>No. Pesanan</th>
            <th>Pelanggan</th>
            <th>Status</th>
            <th>Progress</th>
            <th className="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <tr key={p.id}>
              <td className="font-semibold text-black">{p.no_produksi}</td>
              <td className="text-sm text-gray-700">{p.orders?.no_pesanan ?? "-"}</td>
              <td className="text-sm text-gray-800">{p.orders?.customers?.nama ?? "-"}</td>
              <td>
                <select
                  value={p.status}
                  onChange={(e) => updateStatus(p, e.target.value)}
                  className={`badge cursor-pointer ${STATUS_COLORS[p.status] ?? ""}`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={p.progress}
                    onChange={(e) => updateProgress(p, Number(e.target.value))}
                    className="w-14 border border-gray-300 rounded text-xs text-center py-1"
                  />
                  <span className="text-xs text-gray-600">%</span>
                </div>
              </td>
              <td className="text-right">
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-red-600 hover:text-red-700 hover:underline text-xs"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-gray-500 py-8">
                Belum ada antrian produksi. Entri akan muncul otomatis saat ada pesanan baru.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}