"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type TrackingStep = { tahap: string; waktu: string; selesai: boolean };
type OrderItem = { nama_produk: string; jumlah: number; harga: number };
type OrderInfo = {
  no_pesanan: string;
  tanggal: string;
  status: string;
  total: number;
  alamat_pengiriman: string | null;
  desain_url: string | null;
  pelanggan: string | null;
  items: OrderItem[];
};

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatWaktu(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrackingPage() {
  const [noPesanan, setNoPesanan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [tracking, setTracking] = useState<TrackingStep[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOrder(null);
    setLoading(true);

    const res = await fetch(`/api/public/track?no_pesanan=${encodeURIComponent(noPesanan.trim())}`);
    const result = await res.json().catch(() => null);

    setLoading(false);

    if (!res.ok) {
      setError(result?.error ?? "Terjadi kesalahan.");
      return;
    }

    setOrder(result.order);
    setTracking(result.tracking);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 px-4 py-10 md:py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/login"
          className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:border-blue-200 hover:text-blue-600 hover:shadow transition-all"
        >
          <ArrowLeft size={15} strokeWidth={2.5} />
          Kembali ke Login
        </Link>

        <div className="rounded-xl border border-blue-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg md:p-8 mb-6">
          <div className="mb-6 text-center">
            <p className="font-display text-xs font-bold tracking-widest text-blue-600">DJOKER SABLON KAOS</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-black dark:text-white">Lacak Pesanan</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Masukkan nomor pesanan kamu untuk melihat status terbaru.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={noPesanan}
              onChange={(e) => setNoPesanan(e.target.value)}
              placeholder="Contoh: DJ00125"
              className="input-field flex-1"
              required
            />
            <button type="submit" disabled={loading} className="btn-primary whitespace-nowrap">
              {loading ? "Mencari..." : "Lacak"}
            </button>
          </form>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center mt-4">
              {error}
            </div>
          )}
        </div>

        {order && (
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display font-bold text-lg text-black dark:text-white">{order.no_pesanan}</h2>
                <span className="badge text-blue-600">{order.status}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{order.pelanggan ?? "-"}</p>

              <div className="mt-4 space-y-1.5">
                {order.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-200">
                      {it.nama_produk} × {it.jumlah}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatRupiah(it.jumlah * it.harga)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total</span>
                <span className="font-bold text-black dark:text-white">{formatRupiah(order.total)}</span>
              </div>

              {order.alamat_pengiriman && (
                <div className="mt-3 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">Alamat Pengiriman</p>
                  <p className="text-gray-800 dark:text-gray-200">{order.alamat_pengiriman}</p>
                </div>
              )}

              {order.desain_url && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Desain Terupload</p>
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <Image src={order.desain_url} alt="Desain" fill className="object-contain" />
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-semibold text-black dark:text-white mb-4">Riwayat Status</h3>
              <div className="space-y-0">
                {tracking.map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          t.selesai ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {t.selesai ? "✓" : ""}
                      </div>
                      {i < tracking.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 min-h-[24px]" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-black dark:text-white">{t.tahap}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatWaktu(t.waktu)}</p>
                    </div>
                  </div>
                ))}
                {tracking.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada riwayat status.</p>
                )}
              </div>
            </div>

            <a
              href={`https://wa.me/628812798805?text=${encodeURIComponent(
                `Halo, saya mau tanya soal pesanan ${order.no_pesanan}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline w-full text-center block"
            >
              Hubungi Admin
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
