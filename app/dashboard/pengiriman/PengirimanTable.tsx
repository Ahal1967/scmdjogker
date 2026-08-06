"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Shipment = {
  id: string;
  order_id: string;
  kurir: string | null;
  no_resi: string | null;
  status: "Diproses" | "Dikirim" | "Terkirim";
  orders: {
    no_pesanan: string;
    alamat_pengiriman: string | null;
    customers: { nama: string } | null;
  } | null;
};

export default function PengirimanTable({ initialShipments }: { initialShipments: Shipment[] }) {
  const supabase = createClient();
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [showModal, setShowModal] = useState(false);
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [kurir, setKurir] = useState("");
  const [noResi, setNoResi] = useState("");
  const [saving, setSaving] = useState(false);

  function openEdit(s: Shipment) {
    setActiveShipment(s);
    setKurir(s.kurir ?? "");
    setNoResi(s.no_resi ?? "");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeShipment) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("shipments")
      .update({
        kurir,
        no_resi: noResi,
        status: "Dikirim",
      })
      .eq("id", activeShipment.id)
      .select("*, orders(no_pesanan, alamat_pengiriman, customers(nama))")
      .single();

    if (error || !data) {
      alert("Gagal update pengiriman: " + error?.message);
      setSaving(false);
      return;
    }

    setShipments((prev) => prev.map((s) => (s.id === activeShipment.id ? data : s)));

    await supabase.from("orders").update({ status: "Dikirim" }).eq("id", activeShipment.order_id);
    await supabase.from("order_tracking").insert({
      order_id: activeShipment.order_id,
      tahap: "Dikirim",
      selesai: true,
    });

    setShowModal(false);
    setSaving(false);
  }

  async function markTerkirim(s: Shipment) {
    const { data, error } = await supabase
      .from("shipments")
      .update({ status: "Terkirim" })
      .eq("id", s.id)
      .select("*, orders(no_pesanan, alamat_pengiriman, customers(nama))")
      .single();

    if (error || !data) return;

    setShipments((prev) => prev.map((item) => (item.id === s.id ? data : item)));

    await supabase.from("orders").update({ status: "Selesai" }).eq("id", s.order_id);
    await supabase.from("order_tracking").insert({
      order_id: s.order_id,
      tahap: "Terkirim",
      selesai: true,
    });
  }

  const STATUS_COLORS: Record<string, string> = {
    Diproses: "bg-yellow-500/15 text-yellow-400",
    Dikirim: "bg-blue-500/15 text-blue-400",
    Terkirim: "bg-green-500/15 text-green-400",
  };

  return (
    <div className="card">
      <table className="table-djoker">
        <thead>
          <tr>
            <th>No. Pesanan</th>
            <th>Pelanggan</th>
            <th>Alamat</th>
            <th>Kurir</th>
            <th>No. Resi</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {shipments.map((s) => (
            <tr key={s.id}>
              <td className="font-medium">{s.orders?.no_pesanan ?? "-"}</td>
              <td>{s.orders?.customers?.nama ?? "-"}</td>
              <td className="max-w-xs truncate">{s.orders?.alamat_pengiriman ?? "-"}</td>
              <td>{s.kurir || "-"}</td>
              <td>{s.no_resi || "-"}</td>
              <td>
                <span className={`badge ${STATUS_COLORS[s.status]}`}>{s.status}</span>
              </td>
              <td>
                {s.status === "Diproses" && (
                  <button onClick={() => openEdit(s)} className="text-djoker-red text-xs hover:underline">
                    Isi Kurir & Resi
                  </button>
                )}
                {s.status === "Dikirim" && (
                  <button
                    onClick={() => markTerkirim(s)}
                    className="text-djoker-red text-xs hover:underline"
                  >
                    Tandai Terkirim
                  </button>
                )}
              </td>
            </tr>
          ))}
          {shipments.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center text-djoker-muted py-8">
                Belum ada pengiriman. Muncul otomatis saat packing siap kirim.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showModal && activeShipment && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h2 className="font-display font-semibold text-lg mb-1">
              Update Pengiriman {activeShipment.orders?.no_pesanan}
            </h2>
            <p className="text-xs text-djoker-muted mb-4">
              {activeShipment.orders?.customers?.nama}
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-djoker-muted mb-1.5 block">Nama Kurir</label>
                <input
                  value={kurir}
                  onChange={(e) => setKurir(e.target.value)}
                  placeholder="Contoh: JNE, J&T, SiCepat"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-djoker-muted mb-1.5 block">No. Resi</label>
                <input
                  value={noResi}
                  onChange={(e) => setNoResi(e.target.value)}
                  placeholder="Contoh: JNE123456789"
                  className="input-field"
                  required
                />
              </div>
              <p className="text-xs text-djoker-muted">
                Status akan berubah menjadi "Dikirim" setelah data disimpan.
              </p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}