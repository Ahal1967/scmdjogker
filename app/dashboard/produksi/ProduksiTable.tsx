"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ProductionRow = {
  id: string;
  no_produksi: string | null;
  status: "Produksi" | "Sablon" | "QC" | "Packing" | "Selesai" | string | null;
  progress: number | null;
  order_id: string | null;
  orders?: {
    no_pesanan?: string | null;
    customers?: {
      nama?: string | null;
    } | null;
  } | null;
};

const STATUS_OPTIONS = ["Produksi", "Sablon", "QC", "Packing", "Selesai"] as const;

const STATUS_COLORS: Record<string, string> = {
  Produksi: "text-blue-600",
  Sablon: "text-yellow-600",
  QC: "text-purple-600",
  Packing: "text-orange-600",
  Selesai: "text-green-600",
};

// "Sablon" adalah status valid di tabel orders (lihat migrasi SQL yang perlu kamu jalankan).

export default function ProduksiTable({
  initialProductions,
}: {
  initialProductions: ProductionRow[];
}) {
  const supabase = createClient();
  const [productions, setProductions] = useState<ProductionRow[]>(initialProductions);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return productions.filter((p) => {
      const noProduksi = (p.no_produksi || "").toLowerCase();
      const noPesanan = (p.orders?.no_pesanan || "").toLowerCase();
      return noProduksi.includes(q) || noPesanan.includes(q);
    });
  }, [productions, search]);

  async function updateStatus(p: ProductionRow, status: string) {
    const progressMap: Record<string, number> = {
      Produksi: 20,
      Sablon: 50,
      QC: 75,
      Packing: 90,
      Selesai: 100,
    };

    const newProgress = progressMap[status] ?? Number(p.progress || 0);

    const { data, error } = await supabase
      .from("production")
      .update({ status, progress: newProgress })
      .eq("id", p.id)
      .select("*, orders(no_pesanan, customers(nama))")
      .single();

    if (!error && data) {
      setProductions((prev) =>
        prev.map((prod) => (prod.id === p.id ? (data as ProductionRow) : prod))
      );

      if (p.order_id) {
        const orderStatus = status;

        await supabase.from("orders").update({ status: orderStatus }).eq("id", p.order_id);

        await supabase.from("order_tracking").insert({
          order_id: p.order_id,
          tahap: status === "Selesai" ? "Produksi Selesai" : status,
          selesai: true,
        });
      }
    } else if (error) {
      alert("Gagal mengubah status: " + error.message);
    }
  }

  async function updateProgress(p: ProductionRow, progress: number) {
    const safeProgress = Math.max(0, Math.min(100, progress));

    const { data, error } = await supabase
      .from("production")
      .update({ progress: safeProgress })
      .eq("id", p.id)
      .select("*, orders(no_pesanan, customers(nama))")
      .single();

    if (!error && data) {
      setProductions((prev) =>
        prev.map((prod) => (prod.id === p.id ? (data as ProductionRow) : prod))
      );
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
      const body = await res.json().catch(() => null);
      alert("Gagal menghapus produksi" + (body?.error ? `: ${body.error}` : ""));
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
              <td className="font-semibold text-black">{p.no_produksi || "-"}</td>
              <td className="text-sm text-gray-700">{p.orders?.no_pesanan ?? "-"}</td>
              <td className="text-sm text-gray-800">{p.orders?.customers?.nama ?? "-"}</td>
              <td>
                <select
                  value={p.status || "Produksi"}
                  onChange={(e) => updateStatus(p, e.target.value)}
                  className={`badge cursor-pointer ${STATUS_COLORS[p.status || ""] ?? ""}`}
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
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${Number(p.progress || 0)}%` }}
                    />
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={Number(p.progress || 0)}
                    onChange={(e) => updateProgress(p, Number(e.target.value))}
                    className="w-14 rounded border border-gray-300 py-1 text-center text-xs"
                  />
                  <span className="text-xs text-gray-600">%</span>
                </div>
              </td>
              <td className="text-right">
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-xs text-red-600 hover:text-red-700 hover:underline"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}

          {filtered.length === 0 && (
            <tr>
              <td colSpan={6}>
                <div className="flex min-h-[140px] items-center justify-center py-8 text-gray-500">
                  Belum ada antrian produksi. Entri akan muncul otomatis saat ada pesanan baru.
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
