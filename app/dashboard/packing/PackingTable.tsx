"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Packing = {
  id: string;
  no_packing: string;
  tanggal: string;
  jumlah: number;
  status: "Diproses" | "Siap Kirim";
  order_id: string;
  orders: { no_pesanan: string; customers: { nama: string } | null } | null;
};

function EmptyState() {
  return (
    <div className="card flex min-h-[16rem] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
        <p className="text-base font-medium text-black">Belum ada entri packing</p>
        <p className="mt-1 text-sm text-gray-600">Muncul otomatis saat QC lolos.</p>
      </div>
    </div>
  );
}

export default function PackingTable({ initialPacking }: { initialPacking: Packing[] }) {
  const supabase = createClient();
  const [packingList, setPackingList] = useState<Packing[]>(initialPacking);
  const [search, setSearch] = useState("");

  const filtered = packingList.filter(
    (p) =>
      p.no_packing.toLowerCase().includes(search.toLowerCase()) ||
      (p.orders?.no_pesanan ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function markReady(p: Packing) {
    const { data, error } = await supabase
      .from("packing")
      .update({ status: "Siap Kirim" })
      .eq("id", p.id)
      .select("*, orders(no_pesanan, customers(nama))")
      .single();

    if (error || !data) {
      alert("Gagal update packing: " + error?.message);
      return;
    }
    setPackingList((prev) => prev.map((item) => (item.id === p.id ? data : item)));

    const { data: existing } = await supabase
      .from("shipments")
      .select("id")
      .eq("order_id", p.order_id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("shipments").insert({
        order_id: p.order_id,
        status: "Diproses",
      });
    }

    await supabase.from("orders").update({ status: "Dikirim" }).eq("id", p.order_id);
    await supabase.from("order_tracking").insert({
      order_id: p.order_id,
      tahap: "Siap Kirim",
      selesai: true,
    });
  }

  if (packingList.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="card overflow-x-auto">
      <div className="mb-4">
        <input
          placeholder="Cari no. packing / no. pesanan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-xs"
        />
      </div>

      <table className="table-djoker w-full">
        <thead>
          <tr>
            <th>No. Packing</th>
            <th>No. Pesanan</th>
            <th>Pelanggan</th>
            <th>Tanggal</th>
            <th>Jumlah</th>
            <th>Status</th>
            <th className="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <tr key={p.id}>
              <td className="font-semibold text-black">{p.no_packing}</td>
              <td className="text-sm text-gray-700">{p.orders?.no_pesanan ?? "-"}</td>
              <td className="text-sm text-gray-700">{p.orders?.customers?.nama ?? "-"}</td>
              <td className="text-sm text-gray-600">
                {new Date(p.tanggal).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="text-sm text-gray-700">{p.jumlah} pcs</td>
              <td>
                <span
                  className={`badge ${
                    p.status === "Siap Kirim"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {p.status}
                </span>
              </td>
              <td className="text-right">
                {p.status === "Diproses" && (
                  <button
                    onClick={() => markReady(p)}
                    className="text-blue-600 hover:text-blue-700 hover:underline text-xs font-medium"
                  >
                    Tandai Siap Kirim
                  </button>
                )}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7}>
                <div className="flex min-h-[100px] items-center justify-center text-gray-500">
                  Tidak ditemukan.
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
