"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = { id: string; nama: string; no_telepon: string | null; alamat: string | null };

type OrderItem = { id?: string; nama_produk: string; jumlah: number; harga: number };

type Order = {
  id: string;
  no_pesanan: string;
  tanggal: string;
  total: number;
  dp: number;
  sisa_pembayaran: number;
  status: string;
  alamat_pengiriman: string | null;
  customers: { nama: string } | null;
  order_items: OrderItem[];
};

const STATUS_OPTIONS = ["Pesanan", "Produksi", "QC", "Packing", "Dikirim", "Selesai"];

const STATUS_COLORS: Record<string, string> = {
  Pesanan: "text-blue-600",
  Produksi: "text-yellow-600",
  QC: "text-purple-600",
  Packing: "text-orange-600",
  Dikirim: "text-cyan-600",
  Selesai: "text-green-600",
};

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function PesananTable() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orderSeq, setOrderSeq] = useState(1);
  const [productionSeq, setProductionSeq] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [alamatPengiriman, setAlamatPengiriman] = useState("");
  const [dp, setDp] = useState(0);
  const [items, setItems] = useState<OrderItem[]>([{ nama_produk: "", jumlah: 1, harga: 0 }]);

  // Fetch data saat pertama kali render
  useEffect(() => {
    const fetchData = async () => {
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*, customers(nama), order_items(id, nama_produk, jumlah, harga)")
        .order("created_at", { ascending: false });

      const { data: customersData } = await supabase
        .from("customers")
        .select("*")
        .order("nama", { ascending: true });

      if (ordersData) setOrders(ordersData);
      if (customersData) setCustomers(customersData);

      // Hitung next order number dari orders yang ada
      if (ordersData && ordersData.length > 0) {
        const maxNo = ordersData.reduce((max, o) => {
          const match = o.no_pesanan?.match(/DJ(\d+)/);
          if (!match) return max;
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }, 0);
        setOrderSeq(maxNo + 1);
      }

      // Hitung next production number dari production
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
  }, []);

  const filtered = orders.filter(
    (o) =>
      o.no_pesanan.toLowerCase().includes(search.toLowerCase()) ||
      (o.customers?.nama ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const total = items.reduce((sum, it) => sum + Number(it.jumlah || 0) * Number(it.harga || 0), 0);

  function openAdd() {
    setCustomerId(customers[0]?.id ?? "");
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
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let finalCustomerId = customerId;

    if (!finalCustomerId) {
      alert("Pilih pelanggan terlebih dahulu.");
      setSaving(false);
      return;
    }

    const validItems = items.filter((it) => it.nama_produk.trim() && it.jumlah > 0);
    if (validItems.length === 0) {
      alert("Tambahkan minimal 1 produk pesanan.");
      setSaving(false);
      return;
    }

    // 1. Generate nomor pesanan
    const noPesanan = "DJ" + String(orderSeq).padStart(5, "0");

    // 2. Insert order
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
      alert("Gagal menyimpan pesanan: " + orderError?.message);
      setSaving(false);
      return;
    }

    // 3. Insert order_items
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .insert(validItems.map((it) => ({ ...it, order_id: orderData.id })))
      .select();

    if (itemsError) {
      alert("Pesanan tersimpan, tapi item produk gagal disimpan: " + itemsError.message);
    }

    // 4. Insert tracking awal
    await supabase.from("order_tracking").insert({
      order_id: orderData.id,
      tahap: "Pesanan Diterima",
      selesai: true,
    });

    // 5. Otomatis buat entri Produksi
    const noProduksi = "PRO-" + String(productionSeq).padStart(4, "0");
    const { error: prodError } = await supabase.from("production").insert({
      no_produksi: noProduksi,
      order_id: orderData.id,
      status: "Produksi",
      progress: 0,
    });
    if (prodError) {
      alert("Pesanan tersimpan, tapi gagal membuat entri produksi otomatis: " + prodError.message);
    } else {
      setProductionSeq((n) => n + 1);
    }

    setOrders((prev) => [{ ...orderData, order_items: itemsData ?? validItems }, ...prev]);
    setOrderSeq((n) => n + 1);
    setShowModal(false);
    setSaving(false);
  }

  async function updateStatus(order: Order, status: string) {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order.id)
      .select("*, customers(nama), order_items(id, nama_produk, jumlah, harga)")
      .single();
    if (!error && data) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? data : o)));
      await supabase.from("order_tracking").insert({
        order_id: order.id,
        tahap: status,
        selesai: true,
      });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus pesanan ini beserta seluruh itemnya?")) return;

    try {
      // 1. Hapus order_items dulu
      const { error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", id);

      if (itemsError) {
        console.error("Error deleting order_items:", itemsError);
        alert("Gagal menghapus item pesanan: " + itemsError.message);
        return;
      }

      // 2. Hapus order
      const { error: orderError } = await supabase
        .from("orders")
        .delete()
        .eq("id", id);

      if (orderError) {
        console.error("Error deleting order:", orderError);
        alert("Gagal menghapus pesanan: " + orderError.message);
        return;
      }

      // 3. Update state
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Terjadi kesalahan saat menghapus pesanan");
    }
  }

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Memuat data pesanan...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search & Add */}
      <div className="flex items-center justify-between gap-3">
        <input
          placeholder="Cari no. pesanan / pelanggan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-xs"
        />
        <button onClick={openAdd} className="btn-primary whitespace-nowrap">
          + Pesanan Baru
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table-djoker w-full">
          <thead>
            <tr>
              <th>No. Pesanan</th>
              <th>Pelanggan</th>
              <th>Tanggal</th>
              <th>Total</th>
              <th>Status</th>
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id}>
                <td className="font-semibold text-black">{o.no_pesanan}</td>
                <td className="text-sm text-gray-800">{o.customers?.nama ?? "-"}</td>
                <td className="text-sm text-gray-600">
                  {new Date(o.tanggal).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="text-sm font-medium text-black">{formatRupiah(o.total)}</td>
                <td>
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o, e.target.value)}
                    className={`badge cursor-pointer ${STATUS_COLORS[o.status] ?? ""}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-3 text-xs">
                    <button
                      onClick={() => setDetailOrder(o)}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => handleDelete(o.id)}
                      className="text-red-600 hover:text-red-700 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-8">
                  Belum ada pesanan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal tambah pesanan */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-lg">
            <h2 className="font-display text-lg font-semibold text-black">
              Pesanan Baru — DJ{String(orderSeq).padStart(5, "0")}
            </h2>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* Pelanggan */}
              <div>
                <label className="text-xs font-medium text-gray-600">Pelanggan</label>
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
              </div>

              {/* Item produk */}
              <div>
                <label className="text-xs font-medium text-gray-600">Produk Pesanan</label>
                <div className="mt-2 space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <input
                        placeholder="Nama produk (mis. Kaos Hitam - L)"
                        value={it.nama_produk}
                        onChange={(e) => updateItem(idx, "nama_produk", e.target.value)}
                        className="input-field flex-1"
                      />
                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={it.jumlah}
                        onChange={(e) => updateItem(idx, "jumlah", Number(e.target.value))}
                        className="input-field w-20"
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Harga"
                        value={it.harga}
                        onChange={(e) => updateItem(idx, "harga", Number(e.target.value))}
                        className="input-field w-28"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="px-2 py-2.5 text-xs text-red-600 hover:text-red-700"
                        >
                          ✕
                        </button>
                      )}
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
                <label className="text-xs font-medium text-gray-600">DP (Uang Muka)</label>
                <input
                  type="number"
                  min={0}
                  value={dp}
                  onChange={(e) => setDp(Number(e.target.value))}
                  className="mt-2 input-field"
                />
              </div>

              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Pesanan</span>
                  <span className="font-display text-lg font-bold text-black">
                    {formatRupiah(total)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Sisa Pembayaran</span>
                  <span className="font-medium text-gray-800">
                    {formatRupiah(total - dp)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? "Menyimpan..." : "Simpan Pesanan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detail pesanan */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-black">
                {detailOrder.no_pesanan}
              </h2>
              <span className={`badge ${STATUS_COLORS[detailOrder.status] ?? ""}`}>
                {detailOrder.status}
              </span>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-600">Pelanggan</p>
            <p className="text-sm text-gray-800">{detailOrder.customers?.nama ?? "-"}</p>

            <p className="mt-4 text-sm font-medium text-gray-600">Item Pesanan</p>
            <div className="mt-2 space-y-1.5">
              {detailOrder.order_items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-800">
                    {it.nama_produk} × {it.jumlah}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatRupiah(it.jumlah * it.harga)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-gray-200 pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-medium text-black">{formatRupiah(detailOrder.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">DP</span>
                <span className="text-gray-800">{formatRupiah(detailOrder.dp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sisa Pembayaran</span>
                <span className="text-gray-800">{formatRupiah(detailOrder.sisa_pembayaran)}</span>
              </div>
            </div>

            <button onClick={() => setDetailOrder(null)} className="btn-outline mt-4 w-full">
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}