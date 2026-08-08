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
  Lolos: "bg-green-100 text-green-700",
  Perbaikan: "bg-yellow-100 text-yellow-700",
  Gagal: "bg-red-100 text-red-700",
};

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
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
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <p className="text-base font-medium text-black">{title}</p>
        <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
}

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
      await supabase
        .from("production")
        .update({ status: "Packing", progress: 90 })
        .eq("id", activeProduction.id);

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
    <div className="space-y-4 md:space-y-6">
      {/* Antrian QC */}
      {pending.length === 0 ? (
        <EmptyState
          title="Tidak ada produksi yang menunggu QC saat ini"
          subtitle="Semua pesanan sudah melewati tahap QC atau belum ada produksi."
        />
      ) : (
        <div className="card overflow-x-auto">
          <h2 className="mb-4 text-base font-semibold text-black md:text-lg">Menunggu Pemeriksaan</h2>
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <th>No. Produksi</th>
                <th>No. Pesanan</th>
                <th>Pelanggan</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold text-black">{p.no_produksi}</td>
                  <td className="text-sm text-gray-700">{p.orders?.no_pesanan ?? "-"}</td>
                  <td className="text-sm text-gray-700">{p.orders?.customers?.nama ?? "-"}</td>
                  <td className="text-right">
                    <button
                      onClick={() => openCheck(p)}
                      className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium"
                    >
                      Periksa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Riwayat QC */}
      <div className="card overflow-x-auto">
        <h2 className="mb-4 text-base font-semibold text-black md:text-lg">Riwayat Pemeriksaan</h2>
        <table className="table-djoker w-full">
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
                <td className="font-semibold text-black">{r.no_qc}</td>
                <td className="text-sm text-gray-700">{r.production?.no_produksi ?? "-"}</td>
                <td className="text-sm text-gray-600">
                  {new Date(r.tanggal).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td>
                  <span className={`badge ${HASIL_COLORS[r.hasil]}`}>{r.hasil}</span>
                </td>
                <td className="text-sm text-gray-600">{r.catatan || "-"}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="flex min-h-[100px] items-center justify-center text-gray-500">
                    Belum ada riwayat QC.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && activeProduction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h2 className="font-display font-semibold text-lg mb-1 text-black">
              Periksa {activeProduction.no_produksi}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {activeProduction.orders?.no_pesanan} — {activeProduction.orders?.customers?.nama}
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Hasil Pemeriksaan</label>
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
              <p className="text-xs text-gray-500">
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
