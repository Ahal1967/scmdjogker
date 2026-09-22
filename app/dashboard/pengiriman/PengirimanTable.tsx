"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, Truck, Clock, PackageCheck, ChevronLeft, ChevronRight, ClipboardEdit, CheckCircle2, Loader2, ClipboardList, User, MapPin, Barcode, MoreHorizontal } from "lucide-react";
import { useToast } from "@/components/useToast";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import { compareValues } from "@/lib/sortUtils";

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

/* Dipindah ke token semantik terpusat (badge-warning/info/success di
   globals.css) -- "Diproses"/"Dalam Proses" sebelumnya bg-yellow-100,
   sekarang amber lewat token yang sama dipakai QcTable & PackingTable
   buat makna "menunggu/proses" yang sama. */
const STATUS_COLORS: Record<string, string> = {
  Diproses: "badge-warning",
  "Dalam Proses": "badge-warning",
  Dikirim: "badge-info",
  Terkirim: "badge-success",
  Diterima: "badge-success",
};

function EmptyState() {
  return (
    <div className="card flex min-h-[16rem] items-center justify-center" style={{ border: "none" }}>
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
  const { showToast, ToastBanner } = useToast();

  const filtered = shipments.filter(
    (s) =>
      (s.orders?.no_pesanan ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.orders?.customers?.nama ?? "").toLowerCase().includes(search.toLowerCase())
  );
  type SortField = "no_pesanan" | "pelanggan" | "alamat" | "kurir" | "no_resi" | "status";
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function sortValue(s: Shipment, field: SortField) {
    switch (field) {
      case "no_pesanan":
        return s.orders?.no_pesanan ?? "";
      case "pelanggan":
        return s.orders?.customers?.nama ?? "";
      case "alamat":
        return s.orders?.alamat_pengiriman ?? "";
      case "kurir":
        return s.kurir ?? "";
      case "no_resi":
        return s.no_resi ?? "";
      case "status":
        return s.status ?? "";
    }
  }

  const sorted = sortField
    ? [...filtered].sort((a, b) => compareValues(sortValue(a, sortField), sortValue(b, sortField), sortDir))
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
      showToast("Gagal update pengiriman: " + error?.message);
      setSaving(false);
      return;
    }

    setShipments((prev) => prev.map((s) => (s.id === activeShipment.id ? data : s)));

    const warnings: string[] = [];
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "Dikirim" })
      .eq("id", activeShipment.order_id);
    if (orderError) {
      console.error("Gagal update status pesanan ke Dikirim:", orderError.message);
      warnings.push("status pesanan induk gagal disinkronkan");
    }
    const { error: trackingError } = await supabase.from("order_tracking").insert({
      order_id: activeShipment.order_id,
      tahap: "Dikirim",
      selesai: true,
    });
    if (trackingError) {
      console.error("Gagal mencatat riwayat 'Dikirim':", trackingError.message);
      warnings.push("riwayat pesanan gagal dicatat");
    }

    setShowModal(false);
    setSaving(false);
    if (warnings.length > 0) {
      showToast("Data pengiriman tersimpan, tapi ada langkah lanjutan yang gagal: " + warnings.join(", ") + ".");
    } else {
      showToast("Data pengiriman tersimpan, status berubah jadi Dikirim.", "success");
    }
  }

  async function markTerkirim(s: Shipment) {
    const { data, error } = await supabase
      .from("shipments")
      .update({ status: "Terkirim" })
      .eq("id", s.id)
      .select("*, orders(no_pesanan, alamat_pengiriman, customers(nama))")
      .single();

    if (error || !data) {
      showToast("Gagal update status: " + error?.message);
      return;
    }

    setShipments((prev) => prev.map((item) => (item.id === s.id ? data : item)));

    const warnings: string[] = [];
    const { error: orderError } = await supabase.from("orders").update({ status: "Selesai" }).eq("id", s.order_id);
    if (orderError) {
      console.error("Gagal update status pesanan ke Selesai:", orderError.message);
      warnings.push("status pesanan induk gagal disinkronkan");
    }
    const { error: trackingError } = await supabase.from("order_tracking").insert({
      order_id: s.order_id,
      tahap: "Terkirim",
      selesai: true,
    });
    if (trackingError) {
      console.error("Gagal mencatat riwayat 'Terkirim':", trackingError.message);
      warnings.push("riwayat pesanan gagal dicatat");
    }

    const { error: prodError } = await supabase
      .from("production")
      .update({ status: "Selesai", progress: 100 })
      .eq("order_id", s.order_id);
    if (prodError) {
      console.error("Gagal update status produksi ke Selesai:", prodError.message);
      warnings.push("status produksi gagal disinkronkan");
    }

    if (warnings.length > 0) {
      showToast("Pesanan selesai, tapi ada langkah lanjutan yang gagal: " + warnings.join(", ") + ".");
    } else {
      showToast("Pesanan selesai! Otomatis lanjut ke halaman Laporan.", "success");
    }
    setTimeout(() => {
      router.push("/dashboard/laporan");
      router.refresh();
    }, 900);
  }

  if (shipments.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Cari no. pesanan / pelanggan..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="input-field rounded-full max-w-md"
          style={{ padding: "7px 14px 7px 34px", fontSize: "0.8125rem" }}
        />
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "none" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <TableIconCell icon={Truck} />
                {/* Kolom teks/kode/alamat rata kiri. Status/Aksi tetap
                    tengah. */}
                <SortableTh label="No. Pesanan" icon={ClipboardList} active={sortField === "no_pesanan"} direction={sortDir} onClick={() => toggleSort("no_pesanan")} />
                <SortableTh label="Pelanggan" icon={User} active={sortField === "pelanggan"} direction={sortDir} onClick={() => toggleSort("pelanggan")} />
                <SortableTh label="Alamat" icon={MapPin} active={sortField === "alamat"} direction={sortDir} onClick={() => toggleSort("alamat")} />
                <SortableTh label="Kurir" icon={Truck} active={sortField === "kurir"} direction={sortDir} onClick={() => toggleSort("kurir")} />
                <SortableTh label="No. Resi" icon={Barcode} active={sortField === "no_resi"} direction={sortDir} onClick={() => toggleSort("no_resi")} />
                <SortableTh label="Status" icon={CheckCircle2} active={sortField === "status"} direction={sortDir} onClick={() => toggleSort("status")} center />
                <SortableTh label="Aksi" icon={MoreHorizontal} sortable={false} center />
              </tr>
            </thead>
            <tbody>
              {paginated.map((s, idx) => (
                <tr key={s.id}>
                  <td>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#21262d]/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </span>
                  </td>
                  <td className="text-black dark:text-white">{s.orders?.no_pesanan ?? "-"}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 capitalize">{s.orders?.customers?.nama ?? "-"}</td>
                  <td className="text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                    {s.orders?.alamat_pengiriman ?? "-"}
                  </td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{s.kurir || "-"}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300">{s.no_resi || "-"}</td>
                  <td className="text-center">
                    <span className={`badge capitalize ${STATUS_COLORS[s.status] ?? ""}`}>
                      <span className="status-dot" />
                      {s.status}
                    </span>
                  </td>
                  <td className="td-center">
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
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-[#30363d] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {paginated.length} dari {filtered.length} pengiriman
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-[#30363d] text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-[#21262d]"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-[#30363d] text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-[#21262d]"
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
                className="rounded-lg border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] px-2 py-1 text-xs text-gray-600 dark:text-gray-300"
              >
                <option value={10}>10 / halaman</option>
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Kartu statistik dipindah ke pola .dash-kpi-card (icon chip
          bergradasi) -- dipakai ulang apa adanya dari Dashboard, lihat
          komentar sejenis di app/dashboard/gudang/page.tsx. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="dash-kpi-card">
          <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#3b82f6,#2563eb)" }}>
            <Truck size={14} />
          </span>
          <p className="dash-kpi-label">TOTAL PENGIRIMAN</p>
          <p className="dash-kpi-value font-display">{totalPengiriman}</p>
        </div>
        <div className="dash-kpi-card">
          <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#fbbf24,#d97706)" }}>
            <Clock size={14} />
          </span>
          <p className="dash-kpi-label">DALAM PROSES</p>
          <p className="dash-kpi-value font-display">{totalDiproses}</p>
        </div>
        <div className="dash-kpi-card">
          <span className="dash-kpi-icon" style={{ background: "linear-gradient(135deg,#34d399,#059669)" }}>
            <PackageCheck size={14} />
          </span>
          <p className="dash-kpi-label">TERKIRIM</p>
          <p className="dash-kpi-value font-display">{totalTerkirim}</p>
        </div>
      </div>

      {showModal && activeShipment && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="modal-fade-in card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-0 shadow-2xl" style={{ border: "none" }}>
            <div className="rounded-t-2xl bg-blue-50 dark:bg-blue-900/30 px-6 py-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/30">
                <Truck size={18} className="text-white" />
              </span>
              <div>
                <h2 className="font-display font-bold text-base text-black dark:text-white">
                  Update Pengiriman {activeShipment.orders?.no_pesanan}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{activeShipment.orders?.customers?.nama}</p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 px-6 py-5">
              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Truck size={12} className="text-gray-500 dark:text-gray-400" />
                  Nama Kurir
                </span>
                <input
                  value={kurir}
                  onChange={(e) => setKurir(e.target.value)}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Barcode size={12} className="text-gray-500 dark:text-gray-400" />
                  No. Resi
                </span>
                <input
                  value={noResi}
                  onChange={(e) => setNoResi(e.target.value)}
                  className="input-field w-full"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Status akan berubah menjadi &quot;Dikirim&quot; setelah data disimpan.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline flex-1"
                  style={{ padding: "9px 16px", fontSize: "0.8125rem" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  style={{ padding: "9px 16px", fontSize: "0.8125rem" }}
                >
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {ToastBanner}
    </div>
  );
}
