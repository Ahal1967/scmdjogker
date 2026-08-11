"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Truck, Clock, PackageCheck, ChevronLeft, ChevronRight, ClipboardEdit, CheckCircle2 } from "lucide-react";

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
  Diproses: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  "Dalam Proses": "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  Dikirim: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  Terkirim: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  Diterima: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
};

function EmptyState() {
  return (
    <div className="card flex min-h-[16rem] items-center justify-center" style={{ border: "1px solid #e5e7eb" }}>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40">
          <Truck size={30} className="text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
        </div>
        <p className="text-base font-medium text-black dark:text-white">Belum ada pengiriman</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Entri muncul otomatis saat packing ditandai siap kirim.
        </p>
      </div>
    </div>
  );
}

export default function PengirimanTable({ initialShipments }: { initialShipments: Shipment[] }) {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/dashboard/laporan");
  }, []);
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [kurir, setKurir] = useState("");
  const [noResi, setNoResi] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = shipments.filter(
    (s) =>
      (s.orders?.no_pesanan ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.orders?.customers?.nama ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalPengiriman = shipments.length;
  const totalDiproses = shipments.filter((s) => s.status === "Diproses" || s.status === "Dalam Proses" || s.status === "Dikirim").length;
  const totalTerkirim = shipments.filter((s) => s.status === "Terkirim" || s.status === "Diterima").length;

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

    await supabase
      .from("production")
      .update({ status: "Selesai", progress: 100 })
      .eq("order_id", s.order_id);

    router.push("/dashboard/laporan");
  }

  if (shipments.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Cari no. pesanan / pelanggan..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="input-field rounded-full pl-10 max-w-md"
        />
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "1px solid #e5e7eb" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <th className="w-10"></th>
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
              {paginated.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/40">
                      <Truck size={15} className="text-blue-600 dark:text-blue-400" />
                    </span>
                  </td>
                  <td className="font-semibold text-black dark:text-white">{s.orders?.no_pesanan ?? "-"}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{s.orders?.customers?.nama ?? "-"}</td>
                  <td className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                    {s.orders?.alamat_pengiriman ?? "-"}
                  </td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{s.kurir || "-"}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{s.no_resi || "-"}</td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[s.status] ?? ""}`}>{s.status}</span>
                  </td>
                  <td className="text-right">
                    {s.status === "Diproses" && (
                      <button
                        onClick={() => openEdit(s)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                      >
                        <ClipboardEdit size={13} />
                        Isi Kurir
                      </button>
                    )}
                    {s.status === "Dikirim" && (
                      <button
                        onClick={() => markTerkirim(s)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                      >
                        <CheckCircle2 size={13} />
                        Terkirim
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="flex min-h-[100px] items-center justify-center text-gray-500 dark:text-gray-400">
                      Tidak ditemukan.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-700 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {paginated.length} dari {filtered.length} pengiriman
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-600 dark:text-gray-300"
              >
                <option value={10}>10 / halaman</option>
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-700 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/40">
              <Truck size={20} className="text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalPengiriman}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Pengiriman</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-50 dark:bg-yellow-900/40">
              <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalDiproses}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dalam Proses</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/40">
              <PackageCheck size={20} className="text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalTerkirim}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Terkirim</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && activeShipment && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="card w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-0" style={{ border: "1px solid #e5e7eb" }}>
            <div className="rounded-t-2xl bg-blue-50 dark:bg-blue-900/30 px-6 py-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/30">
                <Truck size={18} className="text-white" />
              </span>
              <div>
                <h2 className="font-display font-bold text-base text-black dark:text-white">
                  Update Pengiriman {activeShipment.orders?.no_pesanan}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{activeShipment.orders?.customers?.nama}</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 px-6 py-5">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Nama Kurir</label>
                <input
                  value={kurir}
                  onChange={(e) => setKurir(e.target.value)}
                  placeholder="Contoh: JNE, J&T, SiCepat"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">No. Resi</label>
                <input
                  value={noResi}
                  onChange={(e) => setNoResi(e.target.value)}
                  placeholder="Contoh: JNE123456789"
                  className="input-field"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
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
