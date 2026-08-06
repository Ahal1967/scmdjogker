"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function TambahPesananPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    no_pesanan: "",
    customer_id: "",
    tanggal: new Date().toISOString().split("T")[0],
    total: 0,
    dp: 0,
    alamat_pengiriman: "",
    status: "Pesanan",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("orders").insert({
      ...formData,
      total: Number(formData.total),
      dp: Number(formData.dp),
      sisa_pembayaran: Number(formData.total) - Number(formData.dp),
    });

    if (error) {
      alert("Gagal menambah pesanan: " + error.message);
    } else {
      alert("Pesanan berhasil ditambahkan!");
      router.push("/dashboard/laporan");
    }

    setLoading(false);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl">Tambah Pesanan Baru</h1>
        <p className="text-djoker-muted text-sm">
          Isi form di bawah untuk menambah pesanan baru.
        </p>
      </div>

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-djoker-muted mb-1.5 block">No. Pesanan</label>
            <input
              type="text"
              value={formData.no_pesanan}
              onChange={(e) => setFormData({ ...formData, no_pesanan: e.target.value })}
              className="input-field"
              placeholder="Contoh: DJ00003"
              required
            />
          </div>

          <div>
            <label className="text-xs text-djoker-muted mb-1.5 block">Customer ID</label>
            <input
              type="text"
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="input-field"
              placeholder="UUID customer"
              required
            />
          </div>

          <div>
            <label className="text-xs text-djoker-muted mb-1.5 block">Tanggal</label>
            <input
              type="date"
              value={formData.tanggal}
              onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-djoker-muted mb-1.5 block">Total (Rp)</label>
              <input
                type="number"
                value={formData.total}
                onChange={(e) => setFormData({ ...formData, total: Number(e.target.value) })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="text-xs text-djoker-muted mb-1.5 block">DP (Rp)</label>
              <input
                type="number"
                value={formData.dp}
                onChange={(e) => setFormData({ ...formData, dp: Number(e.target.value) })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-djoker-muted mb-1.5 block">Alamat Pengiriman</label>
            <textarea
              value={formData.alamat_pengiriman}
              onChange={(e) => setFormData({ ...formData, alamat_pengiriman: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Alamat lengkap"
            />
          </div>

          <div>
            <label className="text-xs text-djoker-muted mb-1.5 block">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="input-field"
            >
              <option value="Pesanan">Pesanan</option>
              <option value="Produksi">Produksi</option>
              <option value="QC">QC</option>
              <option value="Packing">Packing</option>
              <option value="Dikirim">Dikirim</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-outline flex-1"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}