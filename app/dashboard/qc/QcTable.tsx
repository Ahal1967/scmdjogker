"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, ShieldCheck, ClipboardCheck, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Eye, Loader2, ClipboardList, User, Factory, Calendar, FileText, MoreHorizontal } from "lucide-react";
import { useToast } from "@/components/useToast";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import { compareValues } from "@/lib/sortUtils";
import { generateUniqueCode } from "@/lib/generateCode";

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

/* Dipindah dari class Tailwind hardcode ke token semantik terpusat
   (badge-success/warning/danger di globals.css) -- sebelumnya "Perbaikan"
   pakai bg-yellow-100 di sini padahal makna "perlu perbaikan/menunggu"
   yang sama di tabel lain (Pengiriman, Packing) sudah dirapikan jadi
   amber lewat token yang sama, biar tidak dobel sumber warna lagi. */
const HASIL_COLORS: Record<string, string> = {
  Lolos: "badge-success",
  Perbaikan: "badge-warning",
  Gagal: "badge-danger",
};

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="card flex min-h-[16rem] items-center justify-center" style={{ border: "none" }}>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40">
          <CheckCircle2 size={30} className="text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
        </div>
        <p className="text-base font-medium text-black dark:text-white">{title}</p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

export default function QcTable({
  pendingProduction,
  initialRecords,
}: {
  pendingProduction: PendingProduction[];
  initialRecords: QcRecord[];
}) {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/dashboard/packing");
  }, []);
  const [pending, setPending] = useState(pendingProduction);
  const [records, setRecords] = useState<QcRecord[]>(initialRecords);
  const [showModal, setShowModal] = useState(false);
  const [activeProduction, setActiveProduction] = useState<PendingProduction | null>(null);
  const [hasil, setHasil] = useState<"Lolos" | "Perbaikan" | "Gagal">("Lolos");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const { showToast, ToastBanner } = useToast();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.no_qc.toLowerCase().includes(q) ||
        (r.production?.no_produksi ?? "").toLowerCase().includes(q)
    );
  }, [records, search]);

  type PendingSortField = "no_produksi" | "no_pesanan" | "pelanggan";
  const [pendingSortField, setPendingSortField] = useState<PendingSortField | null>(null);
  const [pendingSortDir, setPendingSortDir] = useState<"asc" | "desc">("asc");

  function togglePendingSort(field: PendingSortField) {
    if (pendingSortField === field) {
      setPendingSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setPendingSortField(field);
      setPendingSortDir("asc");
    }
  }

  function pendingSortValue(p: PendingProduction, field: PendingSortField) {
    switch (field) {
      case "no_produksi":
        return p.no_produksi ?? "";
      case "no_pesanan":
        return p.orders?.no_pesanan ?? "";
      case "pelanggan":
        return p.orders?.customers?.nama ?? "";
    }
  }

  const sortedPending = pendingSortField
    ? [...pending].sort((a, b) => compareValues(pendingSortValue(a, pendingSortField), pendingSortValue(b, pendingSortField), pendingSortDir))
    : pending;

  type RecordSortField = "no_qc" | "no_produksi" | "tanggal" | "hasil" | "catatan";
  const [recordSortField, setRecordSortField] = useState<RecordSortField | null>(null);
  const [recordSortDir, setRecordSortDir] = useState<"asc" | "desc">("asc");

  function toggleRecordSort(field: RecordSortField) {
    if (recordSortField === field) {
      setRecordSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setRecordSortField(field);
      setRecordSortDir("asc");
    }
  }

  function recordSortValue(r: QcRecord, field: RecordSortField) {
    switch (field) {
      case "no_produksi":
        return r.production?.no_produksi ?? "";
      default:
        return r[field] ?? "";
    }
  }

  const sortedRecords = recordSortField
    ? [...filteredRecords].sort((a, b) => compareValues(recordSortValue(a, recordSortField), recordSortValue(b, recordSortField), recordSortDir))
    : filteredRecords;

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const paginated = sortedRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalLolos = records.filter((r) => r.hasil === "Lolos").length;
  const totalPerbaikan = records.filter((r) => r.hasil === "Perbaikan").length;
  const totalGagal = records.filter((r) => r.hasil === "Gagal").length;

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

    const noQc = await generateUniqueCode(supabase, "quality_control", "no_qc", "QC-");

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
      showToast("Gagal menyimpan hasil QC: " + qcError?.message);
      setSaving(false);
      return;
    }

    setRecords((prev) => [qcData, ...prev]);

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
      const orderRaw = Array.isArray((prodFull as any)?.orders)
        ? (prodFull as any).orders[0]
        : (prodFull as any)?.orders;
      const orderItemsRaw = Array.isArray(orderRaw?.order_items) ? orderRaw.order_items : [];
      const totalQty = orderItemsRaw.reduce(
          (sum: number, it: any) => sum + Number(it.jumlah ?? 0),
          0
        ) ?? 0;

      if (orderId) {
        const noPacking = await generateUniqueCode(supabase, "packing", "no_packing", "PK-");
        await supabase.from("packing").insert({
          no_packing: noPacking,
          order_id: orderId,
          jumlah: totalQty,
          status: "Diproses",
        });

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
    showToast(
      hasil === "Lolos" ? "QC lolos, otomatis lanjut ke Packing." : "Hasil QC tersimpan, dikembalikan ke Produksi.",
      "success"
    );

    if (hasil === "Lolos") {
      setTimeout(() => {
        router.push("/dashboard/packing");
        router.refresh();
      }, 900);
    }
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
        <div className="card overflow-hidden p-0" style={{ border: "none" }}>
          <h2 className="px-5 pt-5 pb-3 text-base font-semibold text-black dark:text-white">Menunggu Pemeriksaan</h2>
          <div className="overflow-x-auto">
            <table className="table-djoker w-full">
              <thead>
                <tr>
                  <TableIconCell icon={ShieldCheck} />
                  <SortableTh label="No. Produksi" icon={Factory} active={pendingSortField === "no_produksi"} direction={pendingSortDir} onClick={() => togglePendingSort("no_produksi")} center />
                  <SortableTh label="No. Pesanan" icon={ClipboardList} active={pendingSortField === "no_pesanan"} direction={pendingSortDir} onClick={() => togglePendingSort("no_pesanan")} center />
                  <SortableTh label="Pelanggan" icon={User} active={pendingSortField === "pelanggan"} direction={pendingSortDir} onClick={() => togglePendingSort("pelanggan")} center />
                  <SortableTh label="Aksi" icon={MoreHorizontal} sortable={false} center />
                </tr>
              </thead>
              <tbody>
                {sortedPending.map((p, idx) => (
                  <tr key={p.id}>
                    <td>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#171717]/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="text-black dark:text-white text-center">{p.no_produksi}</td>
                    <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{p.orders?.no_pesanan ?? "-"}</td>
                    <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{p.orders?.customers?.nama ?? "-"}</td>
                    <td className="td-center">
                      <button
                        onClick={() => openCheck(p)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                      >
                        <ClipboardCheck size={13} />
                        Periksa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Riwayat QC */}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Cari no. QC / no. produksi..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="input-field rounded-full pl-10 max-w-md"
        />
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "none" }}>
        <h2 className="px-5 pt-5 pb-3 text-base font-semibold text-black dark:text-white">Riwayat Pemeriksaan</h2>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <TableIconCell icon={ClipboardCheck} />
                <SortableTh label="No. QC" icon={ClipboardCheck} active={recordSortField === "no_qc"} direction={recordSortDir} onClick={() => toggleRecordSort("no_qc")} center />
                <SortableTh label="No. Produksi" icon={Factory} active={recordSortField === "no_produksi"} direction={recordSortDir} onClick={() => toggleRecordSort("no_produksi")} center />
                <SortableTh label="Tanggal" icon={Calendar} active={recordSortField === "tanggal"} direction={recordSortDir} onClick={() => toggleRecordSort("tanggal")} center />
                <SortableTh label="Hasil" icon={CheckCircle2} active={recordSortField === "hasil"} direction={recordSortDir} onClick={() => toggleRecordSort("hasil")} center />
                <SortableTh label="Catatan" icon={FileText} active={recordSortField === "catatan"} direction={recordSortDir} onClick={() => toggleRecordSort("catatan")} center />
              </tr>
            </thead>
            <tbody>
              {paginated.map((r, idx) => (
                <tr key={r.id}>
                  <td>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#171717]/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </span>
                  </td>
                  <td className="text-black dark:text-white text-center">{r.no_qc}</td>
                  <td className="text-sm text-gray-700 dark:text-gray-300 text-center">{r.production?.no_produksi ?? "-"}</td>
                  <td className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    {new Date(r.tanggal).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="text-center">
                    <span className={`badge ${HASIL_COLORS[r.hasil]}`}>
                      <span className="status-dot" />
                      {r.hasil}
                    </span>
                  </td>
                  <td className="td-center text-sm text-gray-600 dark:text-gray-400">{r.catatan || "-"}</td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex min-h-[100px] items-center justify-center text-gray-500 dark:text-gray-400">
                      Belum ada riwayat QC.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredRecords.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-[#262626] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {paginated.length} dari {filteredRecords.length} riwayat
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-[#262626] text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-[#171717]"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white">
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-[#262626] text-gray-500 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-[#171717]"
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
                className="rounded-lg border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#0a0a0a] px-2 py-1 text-xs text-gray-600 dark:text-gray-300"
              >
                <option value={10}>10 / halaman</option>
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="card p-0 overflow-hidden" style={{ border: "none" }}>
        <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-700 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/40">
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalLolos}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Lolos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-50 dark:bg-yellow-900/40">
              <ShieldCheck size={20} className="text-yellow-600 dark:text-yellow-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalPerbaikan}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Perbaikan</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/40">
              <XCircle size={20} className="text-red-600 dark:text-red-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{totalGagal}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gagal</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && activeProduction && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-0" style={{ border: "none" }}>
            <div className="rounded-t-2xl bg-blue-50 dark:bg-blue-900/30 px-6 py-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/30">
                <ClipboardCheck size={18} className="text-white" />
              </span>
              <div>
                <h2 className="font-display font-bold text-base text-black dark:text-white">
                  Periksa {activeProduction.no_produksi}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activeProduction.orders?.no_pesanan} — {activeProduction.orders?.customers?.nama}
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 px-6 py-5">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Hasil Pemeriksaan</label>
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
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {hasil === "Lolos"
                  ? "Produksi akan otomatis lanjut ke tahap Packing."
                  : "Produksi akan dikembalikan ke tahap Produksi untuk perbaikan."}
              </p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {saving ? "Menyimpan..." : "Simpan Hasil"}
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
