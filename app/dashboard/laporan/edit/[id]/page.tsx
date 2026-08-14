"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

type Order = {
  id: string;
  no_pesanan: string;
  customer_id: string;
  tanggal: string;
  total: number;
  dp: number;
  sisa_pembayaran: number;
  status: string;
  alamat_pengiriman: string | null;
};

export default function EditPesananPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState<Order>({
    id: "",
    no_pesanan: "",
    customer_id: "",
    tanggal: "",
    total: 0,
    dp: 0,
    sisa_pembayaran: 0,
    status: "Pesanan",
    alamat_pengiriman: "",
  });

  useEffect(() => {
    async function fetchOrder() {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setFetching(false);
        return;
      }

      setFormData(data);
      setFetching(false);
    }

    fetchOrder();
  }, [params.id, router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase
      .from("orders")
      .update({
        ...formData,
        total: Number(formData.total),
        dp: Number(formData.dp),
        sisa_pembayaran: Number(formData.total) - Number(formData.dp),
      })
      .eq("id", params.id);

    if (error) {
      setErrorMsg("Gagal update pesanan: " + error.message);
      setLoading(false);
    } else {
      router.push("/dashboard/laporan");
    }
  }

  if (fetching) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat data...</div>;
  }

  if (notFound) {
    return (
      <div className="card max-w-md mx-auto text-center py-8" style={{ border: "none" }}>
        <p className="text-gray-600 dark:text-gray-400">Data pesanan tidak ditemukan.</p>
        <button onClick={() => router.push("/dashboard/laporan")} className="btn-outline mt-4">
          Kembali ke Laporan
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-black dark:text-white">Edit Pesanan</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Update data pesanan {formData.no_pesanan}.</p>
      </div>

      <div className="card max-w-2xl" style={{ border: "none" }}>
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
              value={formData.alamat_pengiriman ?? ""}
              onChange={(e) => setFormData({ ...formData, alamat_pengiriman: e.target.value })}
              className="input-field"
              rows={3}
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
              {loading ? "Menyimpan..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
