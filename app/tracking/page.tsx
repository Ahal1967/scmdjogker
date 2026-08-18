"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  MapPin,
  Shirt,
  ShoppingCart,
  Wallet,
  Factory,
  ShieldCheck,
  PackageCheck,
  Truck,
  CheckCircle2,
  Circle,
  MessageCircle,
} from "lucide-react";

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

/* Nama tahap di order_tracking bersifat teks bebas (diisi dari berbagai
   halaman: Produksi, QC, Packing, Pengiriman), jadi ikon dicocokkan lewat
   kata kunci -- bukan enum tetap -- supaya tetap tampil benar walau
   penulisan tahapnya sedikit berbeda-beda di database. */
function iconForTahap(tahap: string) {
  const t = tahap.toLowerCase();
  if (/bayar|payment/.test(t)) return Wallet;
  if (/produksi|cetak|sablon|proses/.test(t)) return Factory;
  if (/qc|quality|kontrol|periksa/.test(t)) return ShieldCheck;
  if (/packing|kemas/.test(t)) return PackageCheck;
  if (/kirim|antar/.test(t)) return Truck;
  if (/selesai|sampai|diterima pelanggan/.test(t)) return CheckCircle2;
  if (/terima|masuk|order/.test(t)) return ShoppingCart;
  return Circle;
}

/* Sama seperti ikon, status pesanan juga teks bebas dari admin -- warna
   badge dicocokkan lewat kata kunci dengan fallback biru netral.
   PENTING: ini mengembalikan className Tailwind (bukan {bg, fg} hex/rgba
   mentah kayak sebelumnya), karena warna yang dipasang lewat inline
   style={{...}} TIDAK PERNAH ikut varian dark: -- itu murni fitur
   className. Versi sebelumnya kelihatan "nyesuaikan" pas ditest di light
   mode karena background transparan-tipisnya kebetulan masih kebaca di
   dua tema, tapi sebenarnya warnanya statis, sama sekali tidak berubah
   saat mode gelap aktif. */
/* batal/selesai/menunggu/default dipindah ke token semantik terpusat
   (badge-danger/success/warning/info di globals.css) supaya sama persis
   dengan badge status di dashboard admin -- sebelumnya halaman ini pakai
   shade sendiri (bg-*-50/600) yang beda dari dashboard (bg-*-100/700),
   jadi walau sama-sama "merah buat batal" shade-nya tetap tidak seragam.
   kirim/qc/packing TETAP dibiarkan warna sendiri (bukan token) karena itu
   identitas tahap pipeline, sama seperti skema warna di LaporanTable/
   PesananTable/alur -- bukan makna sukses/gagal/peringatan. */
function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (/batal/.test(s)) return "badge-danger";
  if (/selesai|sampai/.test(s)) return "badge-success";
  if (/kirim/.test(s)) return "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
  if (/qc|quality/.test(s)) return "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
  if (/packing/.test(s)) return "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400";
  if (/menunggu|baru|pending/.test(s)) return "badge-warning";
  return "badge-info";
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

  const statusColorClass = order ? statusBadgeClass(order.status) : "";
  // Baris terakhir yang belum "selesai" dianggap tahap yang sedang
  // berjalan sekarang -- baris sebelumnya yang sudah selesai tetap
  // ditandai selesai seperti biasa. Tidak ada tahap masa depan yang
  // dikarang di sini; hanya data yang benar-benar ada di order_tracking.
  const lastIncompleteIdx = tracking.reduce(
    (acc, t, i) => (!t.selesai ? i : acc),
    -1
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-[#0f1420] px-4 py-8 md:py-12">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, rgba(147,197,253,0.5) 0%, transparent 45%), radial-gradient(circle at 0% 100%, rgba(165,180,252,0.35) 0%, transparent 45%)",
        }}
      />

      <div className="mx-auto max-w-xl">
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            Login
          </Link>

          <div className="flex gap-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-1 shadow-sm">
            <span className="rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
              Lacak Pesanan
            </span>
            <Link
              href="/upload"
              className="rounded-full px-3.5 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Upload Desain
            </Link>
          </div>
        </div>

        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              boxShadow: "0 10px 24px -6px rgba(37,99,235,0.5)",
            }}
          >
            <Shirt size={26} className="text-white" />
          </div>
          <span className="mb-3 inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/40 px-3 py-1 text-[10.5px] font-extrabold tracking-widest text-blue-600 dark:text-blue-300">
            DJOGKER SABLON KAOS
          </span>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-black dark:text-white">
            Lacak Pesanan Kamu
          </h1>
          <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] text-gray-500 dark:text-gray-400">
            Masukkan nomor pesanan untuk melihat status produksi &amp; pengiriman secara real-time.
          </p>
        </div>

        <div className="bg-white dark:bg-[#161d2e] mb-5 rounded-[20px] border border-gray-200 dark:border-gray-700 p-5 shadow-lg">
          <form onSubmit={handleSubmit} className="flex gap-2.5">
            <div className="relative flex-1">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={noPesanan}
                onChange={(e) => setNoPesanan(e.target.value)}
                placeholder="Contoh: DJ00125"
                className="input-field pl-10"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary whitespace-nowrap rounded-[13px]">
              {loading ? "Mencari..." : "Lacak"}
            </button>
          </form>
          <p className="mt-2.5 pl-0.5 text-[11.5px] text-gray-400 dark:text-gray-500">
            Contoh format: DJ00125 — cek di struk atau pesan konfirmasi WhatsApp kamu.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-center text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {order && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#161d2e] rounded-[20px] border border-gray-200 dark:border-gray-700 p-5 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-lg font-extrabold tracking-tight text-black dark:text-white">
                    {order.no_pesanan}
                  </h2>
                  <p className="mt-0.5 text-[12.5px] text-gray-500 dark:text-gray-400">{order.pelanggan ?? "-"}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold ${statusColorClass}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {order.status}
                </span>
              </div>

              <div className="mt-4 space-y-1.5 border-t border-dashed border-gray-200 dark:border-gray-700 pt-3.5">
                {order.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-[13px]">
                    <span className="text-gray-700 dark:text-gray-300">
                      {it.nama_produk} × {it.jumlah}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {formatRupiah(it.jumlah * it.harga)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-2.5 flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-base font-extrabold text-black dark:text-white">{formatRupiah(order.total)}</span>
              </div>

              {order.alamat_pengiriman && (
                <div className="mt-4 flex gap-2.5">
                  <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-blue-50 dark:bg-blue-900/40">
                    <MapPin size={15} className="text-blue-600 dark:text-blue-400" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      Alamat Pengiriman
                    </p>
                    <p className="mt-0.5 text-[13px] text-gray-700 dark:text-gray-300">{order.alamat_pengiriman}</p>
                  </div>
                </div>
              )}

              {order.desain_url && (
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Desain Terupload
                  </p>
                  <div className="relative h-20 w-20 overflow-hidden rounded-[14px] border border-gray-200 dark:border-gray-700">
                    <Image src={order.desain_url} alt="Desain" fill className="object-contain" />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#161d2e] rounded-[20px] border border-gray-200 dark:border-gray-700 p-5 shadow-lg">
              <h3 className="mb-4 text-[14.5px] font-extrabold text-black dark:text-white">Riwayat Status</h3>
              <div className="space-y-0">
                {tracking.map((t, i) => {
                  const Icon = iconForTahap(t.tahap);
                  const isCurrent = i === lastIncompleteIdx;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            t.selesai
                              ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-600/30"
                              : isCurrent
                              ? "border-2 border-blue-500 bg-white dark:bg-gray-800"
                              : "border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                          }`}
                        >
                          <Icon
                            size={15}
                            className={
                              t.selesai
                                ? "text-white"
                                : isCurrent
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-300 dark:text-gray-600"
                            }
                          />
                        </div>
                        {i < tracking.length - 1 && (
                          <div
                            className={`min-h-[24px] w-[2.5px] flex-1 rounded ${
                              t.selesai ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          />
                        )}
                      </div>
                      <div className="pb-5">
                        <p
                          className={`text-[13.5px] font-bold ${
                            t.selesai
                              ? "text-black dark:text-white"
                              : isCurrent
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {t.tahap}
                          {isCurrent && (
                            <span className="ml-2 rounded-full bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 text-[9.5px] font-extrabold text-blue-600 dark:text-blue-400">
                              Berlangsung
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-gray-400 dark:text-gray-500">{formatWaktu(t.waktu)}</p>
                      </div>
                    </div>
                  );
                })}
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
              className="flex items-center justify-center gap-2 rounded-[15px] border-[1.5px] border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3.5 text-[13.5px] font-bold text-green-700 dark:text-green-400 transition-colors hover:bg-green-100 dark:hover:bg-green-900/30"
            >
              <MessageCircle size={17} />
              Hubungi Admin via WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
