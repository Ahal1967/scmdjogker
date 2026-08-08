"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Shipment = {
  id: string;
  order_id: string;
  kurir: string | null;
  no_resi: string | null;
  status: "Diproses" | "Dalam Proses" | "Dikirim" | "Terkirim" | "Diterima";
  orders: {
    no_pesanan: string;
    alamat_pengiriman: string | null;
    customers: { nama: string } | null;
  } | null;
};

const STATUS_COLORS: Record<string, string> = {
  Diproses: "bg-yellow-100 text-yellow-700",
  "Dalam Proses": "bg-yellow-100 text-yellow-700",
  Dikirim: "bg-blue-100 text-blue-700",
  Terkirim: "bg-green-100 text-green-700",
  Diterima: "bg-green-100 text-green-700",
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
            <rect x="1" y="3" width="15" height="13" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        </div>
        <p className="text-base font-medium text-black">Belum ada pengiriman</p>
        <p className="mt-1 text-sm text-gray-600">
          Entri muncul otomatis saat packing ditandai siap kirim.
        </p>
      </div>
    </div>
  );
}

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

    if (error || !data) {
      alert("Gagal update status: " + error?.message);
      return;
    }

    setShipments((prev) => prev.map((item) => (item.id === s.id ? data : item)));

    await supabase.from("orders").update({ status: "Selesai" }).eq("id", s.order_id);
    await supabase.from("order_tracking").insert({
      order_id: s.order_id,
      tahap: "Terkirim",
      selesai: true,
    });

    // Sinkronkan balik ke tabel production, supaya statistik "Progress Produksi"
    // di dashboard ikut kehitung benar (sebelumnya production.status nyangkut
    // di "Packing" selamanya walau order sudah Selesai).
    await supabase
      .from("production")
      .update({ status: "Selesai", progress: 100 })
      .eq("order_id", s.order_id);
  }

  if (shipments.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="table-djoker w-full">
        <thead>
          <tr>
            <th>No. Pesanan</th>
            <th>Pelanggan</th>
            <th>Alamat</th>
            <th>Kurir</th>
            <th>No. Resi</th>
            <th>Status</th>
            <th className="text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {shipments.map((s) => (
            <tr key={s.id}>
              <td className="font-semibold text-black">{s.orders?.no_pesanan ?? "-"}</td>
              <td className="text-sm text-gray-700">{s.orders?.customers?.nama ?? "-"}</td>
              <td className="text-sm text-gray-600 max-w-xs truncate">
                {s.orders?.alamat_pengiriman ?? "-"}
              </td>
              <td className="text-sm text-gray-700">{s.kurir || "-"}</td>
              <td className="text-sm text-gray-700">{s.no_resi || "-"}</td>
              <td>
                <span className={`badge ${STATUS_COLORS[s.status] ?? ""}`}>{s.status}</span>
              </td>
              <td className="text-right">
                {s.status === "Diproses" && (
                  <button
                    onClick={() => openEdit(s)}
                    className="text-blue-600 hover:text-blue-700 hover:underline text-xs font-medium"
                  >
                    Isi Kurir & Resi
                  </button>
                )}
                {s.status === "Dikirim" && (
                  <button
                    onClick={() => markTerkirim(s)}
                    className="text-blue-600 hover:text-blue-700 hover:underline text-xs font-medium"
                  >
                    Tandai Terkirim
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && activeShipment && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="card w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-semibold text-lg mb-1 text-black">
              Update Pengiriman {activeShipment.orders?.no_pesanan}
            </h2>
            <p className="text-xs text-gray-500 mb-4">{activeShipment.orders?.customers?.nama}</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nama Kurir</label>
                <input
                  value={kurir}
                  onChange={(e) => setKurir(e.target.value)}
                  placeholder="Contoh: JNE, J&T, SiCepat"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">No. Resi</label>
                <input
                  value={noResi}
                  onChange={(e) => setNoResi(e.target.value)}
                  placeholder="Contoh: JNE123456789"
                  className="input-field"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">
                Status akan berubah menjadi &quot;Dikirim&quot; setelah data disimpan.
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
