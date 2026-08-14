"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function TambahPesananPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
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
    setErrorMsg(null);
    setWarningMsg(null);
    setLoading(true);

    const { data: orderData, error } = await supabase
      .from("orders")
      .insert({
        ...formData,
        total: Number(formData.total),
        dp: Number(formData.dp),
        sisa_pembayaran: Number(formData.total) - Number(formData.dp),
      })
      .select("id")
      .single();

    if (error || !orderData) {
      setErrorMsg("Gagal menambah pesanan: " + error?.message);
      setLoading(false);
      return;
    }

    // Samakan dengan alur di modul Pesanan: auto-buat entri tracking + produksi
    // supaya pesanan yang dibuat dari sini juga masuk antrian Produksi.
    await supabase.from("order_tracking").insert({
      order_id: orderData.id,
      tahap: "Pesanan Diterima",
      selesai: true,
    });

    const { count: productionCount } = await supabase
      .from("production")
      .select("*", { count: "exact", head: true });

    const noProduksi = "PRO-" + String((productionCount ?? 0) + 1).padStart(4, "0");

    const { error: prodError } = await supabase.from("production").insert({
      no_produksi: noProduksi,
      order_id: orderData.id,
      status: "Produksi",
      progress: 0,
    });

    setLoading(false);

    if (prodError) {
      // Pesanan tetap tersimpan, tapi entri Produksi gagal -- jangan langsung
      // pindah halaman supaya staf sempat baca peringatannya dan bisa follow-up manual.
      setWarningMsg(
        "Pesanan berhasil disimpan, tapi entri Produksi otomatis gagal dibuat: " + prodError.message
      );
      return;
    }

    router.push("/dashboard/laporan");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-black dark:text-white">Tambah Pesanan Baru</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Isi form di bawah untuk menambah pesanan baru.</p>
      </div>

      <div className="card max-w-2xl" style={{ border: "none" }}>
        {warningMsg ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/40">
              <AlertTriangle size={22} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 max-w-sm mx-auto">{warningMsg}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Silakan buat entri Produksi secara manual dari modul Produksi.
            </p>
            <button
              onClick={() => router.push("/dashboard/laporan")}
              className="btn-primary mt-4"
            >
              Kembali ke Laporan
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">No. Pesanan</label>
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Customer ID</label>
              <input
                type="text"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="input-field"
                placeholder="UUID customer"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                UUID pelanggan — lihat di halaman Pesanan kalau perlu dicocokkan.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Tanggal</label>
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Total (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.total === 0 ? "" : formData.total.toLocaleString("id-ID")}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setFormData({ ...formData, total: raw === "" ? 0 : Number(raw) });
                  }}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">DP (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.dp === 0 ? "" : formData.dp.toLocaleString("id-ID")}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setFormData({ ...formData, dp: raw === "" ? 0 : Number(raw) });
                  }}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Alamat Pengiriman</label>
              <textarea
                value={formData.alamat_pengiriman}
                onChange={(e) => setFormData({ ...formData, alamat_pengiriman: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Alamat lengkap"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Status</label>
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
              <button type="button" onClick={() => router.back()} className="btn-outline flex-1">
                Batal
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
