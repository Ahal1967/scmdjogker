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

    if (error || !data) return;
    setPackingList((prev) => prev.map((item) => (item.id === p.id ? data : item)));

    // Otomatis buat entri pengiriman kalau belum ada
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

  return (
    <div className="card">
      <div className="mb-4">
        <input
          placeholder="Cari no. packing / no. pesanan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-xs"
        />
      </div>

      <table className="table-djoker">
        <thead>
          <tr>
            <th>No. Packing</th>
            <th>No. Pesanan</th>
            <th>Pelanggan</th>
            <th>Tanggal</th>
            <th>Jumlah</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <tr key={p.id}>
              <td className="font-medium">{p.no_packing}</td>
              <td>{p.orders?.no_pesanan ?? "-"}</td>
              <td>{p.orders?.customers?.nama ?? "-"}</td>
              <td>{new Date(p.tanggal).toLocaleDateString("id-ID")}</td>
              <td>{p.jumlah} pcs</td>
              <td>
                <span
                  className={`badge ${
                    p.status === "Siap Kirim"
                      ? "bg-green-500/15 text-green-400"
                      : "bg-yellow-500/15 text-yellow-400"
                  }`}
                >
                  {p.status}
                </span>
              </td>
              <td>
                {p.status === "Diproses" && (
                  <button onClick={() => markReady(p)} className="text-djoker-red text-xs hover:underline">
                    Tandai Siap Kirim
                  </button>
                )}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center text-djoker-muted py-8">
                Belum ada entri packing. Muncul otomatis saat QC lolos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}