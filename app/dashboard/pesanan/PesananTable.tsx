"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Plus, FileText, ShoppingBag, CheckCircle2, TrendingUp, ChevronLeft, ChevronRight, Eye, Trash2, User, Loader2, PackageOpen } from "lucide-react";
import { useConfirm } from "@/components/useConfirm";
import { useToast } from "@/components/useToast";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  nama: string | null;
  no_telepon: string | null;
  alamat: string | null;
};

type OrderItem = {
  id?: string;
  nama_produk: string;
  jumlah: number;
  harga: number;
};

type Order = {
  id: string;
  no_pesanan: string;
  tanggal: string | null;
  total: number | null;
  dp: number | null;
  sisa_pembayaran: number | null;
  status: string | null;
  alamat_pengiriman: string | null;
  desain_url: string | null;
  customers: { nama: string | null } | null;
  order_items: OrderItem[] | null;
};

const STATUS_OPTIONS = ["Pesanan", "Produksi", "QC", "Packing", "Dikirim", "Selesai"];

const STATUS_COLORS: Record<string, string> = {
  Pesanan: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Produksi: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  QC: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Packing: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Dikirim: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Selesai: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function PesananTable() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/dashboard/produksi");
  }, []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orderSeq, setOrderSeq] = useState(1);
  const [productionSeq, setProductionSeq] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastBanner } = useToast();
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [pelunasanInput, setPelunasanInput] = useState("");
  const [payingOff, setPayingOff] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ nama: "", no_telepon: "", alamat: "" });
  const [alamatPengiriman, setAlamatPengiriman] = useState("");
  const [dp, setDp] = useState(0);
  const [items, setItems] = useState<OrderItem[]>([{ nama_produk: "", jumlah: 1, harga: 0 }]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (showModal) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [showModal]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*, customers(nama), order_items(id, nama_produk, jumlah, harga)")
        .order("created_at", { ascending: false });

      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .order("nama", { ascending: true });

      if (ordersError) console.error(ordersError);
      if (customersError) console.error(customersError);

      if (ordersData) setOrders(ordersData as Order[]);
      if (customersData) setCustomers(customersData as Customer[]);

      if (ordersData && ordersData.length > 0) {
        const maxNo = ordersData.reduce((max, o) => {
          const match = o.no_pesanan?.match(/DJ(\d+)/);
          if (!match) return max;
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }, 0);
        setOrderSeq(maxNo + 1);
      }

      const { data: prodData } = await supabase
        .from("production")
        .select("no_produksi")
        .order("created_at", { ascending: false })
        .limit(1);

      if (prodData && prodData.length > 0) {
        const match = prodData[0].no_produksi?.match(/PRO-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          setProductionSeq(num + 1);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.no_pesanan ?? "").toLowerCase().includes(q) ||
      (o.customers?.nama ?? "").toLowerCase().includes(q) ||
      (o.status ?? "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const summaryTotalPesanan = orders.length;
  const summarySelesai = orders.filter((o) => o.status === "Selesai").length;
  const summaryPersenSelesai = summaryTotalPesanan > 0 ? Math.round((summarySelesai / summaryTotalPesanan) * 100) : 0;
  const summaryPendapatan = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const total = items.reduce((sum, it) => sum + Number(it.jumlah || 0) * Number(it.harga || 0), 0);

  function openAdd() {
    setIsNewCustomer(customers.length === 0);
    setCustomerId(customers[0]?.id ?? "");
    setNewCustomer({ nama: "", no_telepon: "", alamat: "" });
    setAlamatPengiriman("");
    setDp(0);
    setItems([{ nama_produk: "", jumlah: 1, harga: 0 }]);
    setShowModal(true);
  }

  function addItemRow() {
    setItems((prev) => [...prev, { nama_produk: "", jumlah: 1, harga: 0 }]);
  }

  function removeItemRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof OrderItem, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    let finalCustomerId = customerId;

    if (isNewCustomer) {
      if (!newCustomer.nama.trim()) {
        showToast("Nama pelanggan wajib diisi.");
        setSaving(false);
        return;
      }
      const { data: custData, error: custError } = await supabase
        .from("customers")
        .insert(newCustomer)
        .select()
        .single();
      if (custError || !custData) {
        showToast("Gagal menyimpan pelanggan baru: " + custError?.message);
        setSaving(false);
        return;
      }
      finalCustomerId = custData.id;
      setCustomers((prev) => [...prev, custData]);
    }

    if (!finalCustomerId) {
      showToast("Pilih pelanggan terlebih dahulu.");
      setSaving(false);
      return;
    }

    const validItems = items.filter((it) => it.nama_produk.trim() && it.jumlah > 0);
    if (validItems.length === 0) {
      showToast("Tambahkan minimal 1 produk pesanan.");
      setSaving(false);
      return;
    }

    const noPesanan = "DJ" + String(orderSeq).padStart(5, "0");

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        no_pesanan: noPesanan,
        customer_id: finalCustomerId,
        total,
        dp,
        sisa_pembayaran: total - dp,
        status: "Pesanan",
        alamat_pengiriman: alamatPengiriman,
      })
      .select("*, customers(nama)")
      .single();

    if (orderError || !orderData) {
      showToast("Gagal menyimpan pesanan: " + orderError?.message);
      setSaving(false);
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .insert(validItems.map((it) => ({ ...it, order_id: orderData.id })))
      .select();

    if (itemsError) {
      showToast("Pesanan tersimpan, tapi item produk gagal disimpan: " + itemsError.message);
    }

    await supabase.from("order_tracking").insert({
      order_id: orderData.id,
      tahap: "Pesanan Diterima",
      selesai: true,
    });

    const noProduksi = "PRO-" + String(productionSeq).padStart(4, "0");
    const { error: prodError } = await supabase.from("production").insert({
      no_produksi: noProduksi,
      order_id: orderData.id,
      status: "Produksi",
      progress: 0,
    });

    if (prodError) {
      showToast("Pesanan tersimpan, tapi gagal membuat entri produksi otomatis: " + prodError.message);
    } else {
      setProductionSeq((n) => n + 1);
    }

    setOrders((prev) => [
      { ...(orderData as Order), order_items: (itemsData as OrderItem[]) ?? validItems },
      ...prev,
    ]);
    setOrderSeq((n) => n + 1);
    setShowModal(false);
    setSaving(false);
    showToast("Pesanan berhasil ditambahkan.", "success");
  }

  async function handleCatatPembayaran(order: Order) {
    const jumlah = Number(pelunasanInput);
    if (!jumlah || jumlah <= 0) {
      showToast("Isi jumlah pembayaran terlebih dahulu.");
      return;
    }

    const sisaSekarang = Number(order.sisa_pembayaran) || 0;
    const sisaBaru = Math.max(0, sisaSekarang - jumlah);

    setPayingOff(true);
    const { data, error } = await supabase
      .from("orders")
      .update({ sisa_pembayaran: sisaBaru })
      .eq("id", order.id)
      .select("*, customers(nama), order_items(id, nama_produk, jumlah, harga)")
      .single();
    setPayingOff(false);

    if (error || !data) {
      showToast("Gagal mencatat pembayaran: " + error?.message);
      return;
    }

    setOrders((prev) => prev.map((o) => (o.id === order.id ? (data as Order) : o)));
    setDetailOrder(data as Order);
    setPelunasanInput("");

    await supabase.from("order_tracking").insert({
      order_id: order.id,
      tahap: sisaBaru === 0 ? "Pembayaran Lunas" : `Pembayaran Rp ${jumlah.toLocaleString("id-ID")} diterima`,
      selesai: true,
    });

    showToast(
      sisaBaru === 0 ? "Pesanan sudah lunas!" : `Pembayaran tercatat, sisa Rp ${sisaBaru.toLocaleString("id-ID")}.`,
      "success"
    );
  }

  async function updateStatus(order: Order, status: string) {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order.id)
      .select("*, customers(nama), order_items(id, nama_produk, jumlah, harga)")
      .single();

    if (!error && data) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? (data as Order) : o)));
      await supabase.from("order_tracking").insert({
        order_id: order.id,
        tahap: status,
        selesai: true,
      });

      if (status === "Produksi") {
        showToast("Status diubah ke Produksi, otomatis lanjut ke halaman Produksi.", "success");
        setTimeout(() => router.push("/dashboard/produksi"), 900);
      }
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ message: "Pesanan ini beserta seluruh itemnya akan dihapus permanen.", danger: true });
    if (!ok) return;

    try {
      const { error: itemsError } = await supabase.from("order_items").delete().eq("order_id", id);
      if (itemsError) {
        showToast("Gagal menghapus item pesanan: " + itemsError.message);
        return;
      }

      const { error: orderError } = await supabase.from("orders").delete().eq("id", id);
      if (orderError) {
        showToast("Gagal menghapus pesanan: " + orderError.message);
        return;
      }

      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch {
      showToast("Terjadi kesalahan saat menghapus pesanan");
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-gray-500 dark:text-gray-400">Memuat data pesanan...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Cari no. pesanan / pelanggan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field rounded-full pl-10"
          />
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 whitespace-nowrap"
        >
          <Plus size={16} />
          Pesanan Baru
        </button>
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "1px solid #e5e7eb" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>No. Pesanan</th>
                <th>Pelanggan</th>
                <th>Tanggal</th>
                <th>Total</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/40">
                      <FileText size={15} className="text-blue-600 dark:text-blue-400" />
                    </span>
                  </td>
                  <td className="font-semibold text-black dark:text-white">{o.no_pesanan}</td>
                  <td className="text-sm text-gray-800 dark:text-gray-200">{o.customers?.nama ?? "-"}</td>
                  <td className="text-sm text-gray-600 dark:text-gray-400">
                    {o.tanggal
                      ? new Date(o.tanggal).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </td>
                  <td>
                    <p className="text-sm font-medium text-black dark:text-white">{formatRupiah(Number(o.total) || 0)}</p>
                    <select
                      value={o.status ?? "Pesanan"}
                      onChange={(e) => updateStatus(o, e.target.value)}
                      className={`badge cursor-pointer mt-1 ${STATUS_COLORS[o.status ?? ""] ?? ""}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setDetailOrder(o);
                          setPelunasanInput("");
                        }}
                        title="Lihat Detail"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(o.id)}
                        title="Hapus Pesanan"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <div className="flex flex-col items-center justify-center min-h-[220px] gap-3 py-8">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/40">
                        <PackageOpen size={26} className="text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
                      </div>
                      <p className="text-sm font-medium text-black dark:text-white">
                        {search ? "Tidak ditemukan" : "Belum ada pesanan"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs text-center">
                        {search ? "Coba kata kunci pencarian lain." : "Mulai catat pesanan pertama kamu."}
                      </p>
                      {!search && (
                        <button
                          onClick={openAdd}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                        >
                          <Plus size={14} />
                          Pesanan Baru
                        </button>
                      )}
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
              Menampilkan {paginated.length} dari {filtered.length} pesanan
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

      {/* Ringkasan bawah, digabung jadi 1 card seperti referensi */}
      <div className="card p-0 overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-700 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/40">
              <ShoppingBag size={20} className="text-blue-600 dark:text-blue-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{summaryTotalPesanan}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Pesanan</p>
              <p className="text-[11px] text-gray-400">Semua waktu</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/40">
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{summarySelesai}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pesanan Selesai</p>
              <p className="text-[11px] text-gray-400">{summaryPersenSelesai}% dari total</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/40">
              <TrendingUp size={20} className="text-orange-600 dark:text-orange-400" />
            </span>
            <div>
              <p className="font-display text-xl font-bold text-black dark:text-white">{formatRupiah(summaryPendapatan)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Pendapatan</p>
              <p className="text-[11px] text-gray-400">Semua waktu</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="card card-modal w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto" style={{ border: "1px solid #e5e7eb" }}>
            <h2 className="font-display text-base font-semibold text-black dark:text-white">
              Pesanan Baru — DJ{String(orderSeq).padStart(5, "0")}
            </h2>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Pelanggan</label>
                  <button
                    type="button"
                    onClick={() => setIsNewCustomer((v) => !v)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {isNewCustomer ? "Pilih pelanggan lama" : "+ Pelanggan baru"}
                  </button>
                </div>

                {isNewCustomer ? (
                  <div className="mt-2 space-y-2">
                    <input
                      required
                      placeholder="Nama Pelanggan"
                      value={newCustomer.nama}
                      onChange={(e) => setNewCustomer({ ...newCustomer, nama: e.target.value })}
                      className="input-field"
                    />
                    <input
                      placeholder="No. Telepon"
                      value={newCustomer.no_telepon}
                      onChange={(e) => setNewCustomer({ ...newCustomer, no_telepon: e.target.value })}
                      className="input-field"
                    />
                    <input
                      placeholder="Alamat"
                      value={newCustomer.alamat}
                      onChange={(e) => setNewCustomer({ ...newCustomer, alamat: e.target.value })}
                      className="input-field"
                    />
                  </div>
                ) : (
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="mt-2 input-field"
                  >
                    <option value="">- Pilih Pelanggan -</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Produk Pesanan</label>
                <div className="mt-2 hidden items-center gap-2 px-0.5 sm:flex">
                  <span className="flex-1"></span>
                  <span className="w-20 text-[11px] text-gray-400">Jumlah</span>
                  <span className="w-28 text-[11px] text-gray-400">Harga Satuan</span>
                </div>
                <div className="mt-1 space-y-3 sm:space-y-2">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 rounded-lg border border-gray-100 dark:border-gray-700 p-2.5 sm:flex-row sm:items-start sm:border-0 sm:p-0"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          placeholder="Nama produk (mis. Kaos Hitam - L)"
                          value={it.nama_produk}
                          onChange={(e) => updateItem(idx, "nama_produk", e.target.value)}
                          className="input-field flex-1"
                        />
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="shrink-0 px-2 py-2.5 text-xs text-red-600 hover:text-red-700 dark:text-red-300 sm:hidden"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1 sm:w-20 sm:flex-none">
                          <span className="mb-1 block text-[11px] text-gray-400 sm:hidden">Jumlah</span>
                          <input
                            type="number"
                            min={1}
                            placeholder="Qty"
                            value={it.jumlah || ""}
                            onChange={(e) => updateItem(idx, "jumlah", e.target.value === "" ? 0 : Number(e.target.value))}
                            className="input-field w-full"
                          />
                        </div>
                        <div className="flex-1 sm:w-28 sm:flex-none">
                          <span className="mb-1 block text-[11px] text-gray-400 sm:hidden">Harga Satuan</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Harga"
                            value={it.harga === 0 ? "" : it.harga.toLocaleString("id-ID")}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, "");
                              updateItem(idx, "harga", raw === "" ? 0 : Number(raw));
                            }}
                            className="input-field w-full"
                          />
                        </div>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="hidden shrink-0 px-2 py-2.5 text-xs text-red-600 hover:text-red-700 dark:text-red-300 sm:block"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  + Tambah produk
                </button>
              </div>

              <textarea
                placeholder="Alamat pengiriman"
                value={alamatPengiriman}
                onChange={(e) => setAlamatPengiriman(e.target.value)}
                className="input-field"
                rows={2}
              />

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">DP (Uang Muka)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={dp === 0 ? "" : dp.toLocaleString("id-ID")}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setDp(raw === "" ? 0 : Number(raw));
                  }}
                  className="mt-2 input-field"
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Pesanan</span>
                  <span className="font-display text-xl font-bold text-black dark:text-white">
                    {formatRupiah(total)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Sisa Pembayaran</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {formatRupiah(total - dp)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {saving ? "Menyimpan..." : "Simpan Pesanan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-0" style={{ border: "1px solid #e5e7eb" }}>
            {/* Header biru muda */}
            <div className="rounded-t-2xl bg-blue-50 dark:bg-blue-900/30 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/30">
                    <FileText size={18} className="text-white" />
                  </span>
                  <div>
                    <h2 className="font-display text-base font-bold text-black dark:text-white">
                      {detailOrder.no_pesanan}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Detail Pesanan</p>
                  </div>
                </div>
                <span className={`badge ${STATUS_COLORS[detailOrder.status ?? ""] ?? ""}`}>
                  {detailOrder.status}
                </span>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-center gap-2 text-sm">
                <User size={14} className="text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">Pelanggan:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{detailOrder.customers?.nama ?? "-"}</span>
              </div>

              <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Item Pesanan</p>
              <div className="space-y-2 rounded-xl bg-gray-50 dark:bg-gray-900/50 p-3">
                {(detailOrder.order_items ?? []).map((it, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {it.nama_produk} <span className="text-gray-400">× {it.jumlah}</span>
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatRupiah(it.jumlah * it.harga)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 rounded-xl border border-gray-100 dark:border-gray-700 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total</span>
                  <span className="font-semibold text-black dark:text-white">
                    {formatRupiah(Number(detailOrder.total) || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">DP</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {formatRupiah(Number(detailOrder.dp) || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-2">
                  <span className="text-gray-500 dark:text-gray-400">Sisa Pembayaran</span>
                  <span className="font-semibold text-orange-600">
                    {formatRupiah(Number(detailOrder.sisa_pembayaran) || 0)}
                  </span>
                </div>
              </div>

              {Number(detailOrder.sisa_pembayaran) > 0 && (
                <div className="mt-4 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-900/20 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    Catat Pembayaran
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Jumlah dibayar"
                      value={pelunasanInput === "" ? "" : Number(pelunasanInput).toLocaleString("id-ID")}
                      onChange={(e) => setPelunasanInput(e.target.value.replace(/\D/g, ""))}
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleCatatPembayaran(detailOrder)}
                      disabled={payingOff}
                      className="btn-primary whitespace-nowrap px-4"
                    >
                      {payingOff ? "..." : "Simpan"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPelunasanInput(String(Number(detailOrder.sisa_pembayaran) || 0))}
                    className="mt-2 text-xs text-blue-600 dark:text-blue-300 hover:underline"
                  >
                    Isi otomatis sisa penuh ({formatRupiah(Number(detailOrder.sisa_pembayaran) || 0)})
                  </button>
                </div>
              )}

              {detailOrder.desain_url && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Desain Diupload Pelanggan
                  </p>
                  {detailOrder.desain_url.toLowerCase().endsWith(".pdf") ? (
                    <a
                      href={detailOrder.desain_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline w-full text-center block"
                    >
                      Buka File PDF
                    </a>
                  ) : (
                    <>
                      <a
                        href={detailOrder.desain_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                      >
                        <Image
                          src={detailOrder.desain_url}
                          alt="Desain dari pelanggan"
                          fill
                          className="object-contain"
                        />
                      </a>
                      <p className="text-xs text-gray-400 mt-1">Klik gambar untuk buka ukuran penuh.</p>
                    </>
                  )}
                </div>
              )}

              <button onClick={() => setDetailOrder(null)} className="btn-outline mt-5 w-full">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {ConfirmDialog}
      {ToastBanner}
    </div>
  );
}
