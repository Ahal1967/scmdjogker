"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PendingProduction = {
  id: string;
  no_produksi: string;
  orders: { no_pesanan: string; customers: { nama: string } | null } | null;
};

type QcRecord = {
  id: string;
  no_qc: string;
  tanggal: string;
  hasil: "Lolos" | "Perbaikan" | "Gagal";
  catatan: string | null;
  production: { no_produksi: string; orders: { no_pesanan: string } | null } | null;
};

const HASIL_COLORS: Record<string, string> = {
  Lolos: "bg-green-500/15 text-green-400",
  Perbaikan: "bg-yellow-500/15 text-yellow-400",
  Gagal: "bg-red-500/15 text-red-400",
};

export default function QcTable({
  pendingProduction,
  initialRecords,
  nextQcNumber,
  nextPackingNumber,
}: {
  pendingProduction: PendingProduction[];
  initialRecords: QcRecord[];
  nextQcNumber: number;
  nextPackingNumber: number;
}) {
  const supabase = createClient();
  const [pending, setPending] = useState(pendingProduction);
  const [records, setRecords] = useState<QcRecord[]>(initialRecords);
  const [qcSeq, setQcSeq] = useState(nextQcNumber);
  const [packingSeq, setPackingSeq] = useState(nextPackingNumber);
  const [showModal, setShowModal] = useState(false);
  const [activeProduction, setActiveProduction] = useState<PendingProduction | null>(null);
  const [hasil, setHasil] = useState<"Lolos" | "Perbaikan" | "Gagal">("Lolos");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);

  function openCheck(p: PendingProduction) {
    setActiveProduction(p);
    setHasil("Lolos");
    setCatatan("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProduction) return;
    setSaving(true);

    const noQc = "QC-" + String(qcSeq).padStart(4, "0");

    const { data: qcData, error: qcError } = await supabase
      .from("quality_control")
      .insert({
        no_qc: noQc,
        production_id: activeProduction.id,
        hasil,
        catatan,
      })
      .select("*, production(no_produksi, orders(no_pesanan))")
      .single();

    if (qcError || !qcData) {
      alert("Gagal menyimpan hasil QC: " + qcError?.message);
      setSaving(false);
      return;
    }

    setRecords((prev) => [qcData, ...prev]);
    setQcSeq((n) => n + 1);

    if (hasil === "Lolos") {
      // Update produksi -> Packing, buat entri packing otomatis
      await supabase
        .from("production")
        .update({ status: "Packing", progress: 90 })
        .eq("id", activeProduction.id);

      // Ambil order_id dan total qty dari order_items untuk entri packing
      const { data: prodFull } = await supabase
        .from("production")
        .select("order_id, orders(order_items(jumlah))")
        .eq("id", activeProduction.id)
        .single();

      const orderId = prodFull?.order_id;
      const totalQty =
        (prodFull as any)?.orders?.order_items?.reduce(
          (sum: number, it: any) => sum + Number(it.jumlah ?? 0),
          0
        ) ?? 0;

      if (orderId) {
        const noPacking = "PK-" + String(packingSeq).padStart(4, "0");
        await supabase.from("packing").insert({
          no_packing: noPacking,
          order_id: orderId,
          jumlah: totalQty,
          status: "Diproses",
        });
        setPackingSeq((n) => n + 1);

        await supabase.from("orders").update({ status: "Packing" }).eq("id", orderId);
        await supabase.from("order_tracking").insert({
          order_id: orderId,
          tahap: "QC Lolos",
          selesai: true,
        });
      }

      setPending((prev) => prev.filter((p) => p.id !== activeProduction.id));
    } else {
      // Perbaikan / Gagal -> kembalikan ke tahap Produksi untuk rework
      await supabase
        .from("production")
        .update({ status: "Produksi", progress: 40 })
        .eq("id", activeProduction.id);
      setPending((prev) => prev.filter((p) => p.id !== activeProduction.id));
    }

    setShowModal(false);
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Antrian QC */}
      <div className="card">
        <p className="font-medium text-sm mb-3">Menunggu Pemeriksaan</p>
        <table className="table-djoker">
          <thead>
            <tr>
              <th>No. Produksi</th>
              <th>No. Pesanan</th>
              <th>Pelanggan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.no_produksi}</td>
                <td>{p.orders?.no_pesanan ?? "-"}</td>
                <td>{p.orders?.customers?.nama ?? "-"}</td>
                <td>
                  <button onClick={() => openCheck(p)} className="text-djoker-red text-xs hover:underline">
                    Periksa
                  </button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-djoker-muted py-6">
                  Tidak ada produksi yang menunggu QC saat ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Riwayat QC */}
      <div className="card">
        <p className="font-medium text-sm mb-3">Riwayat Pemeriksaan</p>
        <table className="table-djoker">
          <thead>
            <tr>
              <th>No. QC</th>
              <th>No. Produksi</th>
              <th>Tanggal</th>
              <th>Hasil</th>
              <th>Catatan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.no_qc}</td>
                <td>{r.production?.no_produksi ?? "-"}</td>
                <td>{new Date(r.tanggal).toLocaleDateString("id-ID")}</td>
                <td>
                  <span className={`badge ${HASIL_COLORS[r.hasil]}`}>{r.hasil}</span>
                </td>
                <td className="text-djoker-muted">{r.catatan || "-"}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-djoker-muted py-6">
                  Belum ada riwayat QC.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && activeProduction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h2 className="font-display font-semibold text-lg mb-1">Periksa {activeProduction.no_produksi}</h2>
            <p className="text-xs text-djoker-muted mb-4">
              {activeProduction.orders?.no_pesanan} — {activeProduction.orders?.customers?.nama}
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-djoker-muted mb-1.5 block">Hasil Pemeriksaan</label>
                <select
                  value={hasil}
                  onChange={(e) => setHasil(e.target.value as any)}
                  className="input-field"
                >
                  <option value="Lolos">Lolos</option>
                  <option value="Perbaikan">Perbaikan</option>
                  <option value="Gagal">Gagal</option>
                </select>
              </div>
              <textarea
                placeholder="Catatan (opsional)"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="input-field"
                rows={3}
              />
              <p className="text-xs text-djoker-muted">
                {hasil === "Lolos"
                  ? "Produksi akan otomatis lanjut ke tahap Packing."
                  : "Produksi akan dikembalikan ke tahap Produksi untuk perbaikan."}
              </p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Menyimpan..." : "Simpan Hasil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}