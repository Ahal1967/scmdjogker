"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PesananTable from "./PesananTable";

type Customer = {
  id: string;
  nama_pelanggan: string | null;
  no_hp: string | null;
  alamat: string | null;
};

type Product = {
  id: string;
  nama_produk: string | null;
  harga: number | null;
};

type Item = {
  id: number;
  product_id: string;
  jumlah: number;
  satuan: string;
  harga: number;
};

const EMPTY_ITEM: Item = {
  id: 1,
  product_id: "",
  jumlah: 1,
  satuan: "pcs",
  harga: 0,
};

export default function PesananPage() {
  const supabase = createClient();

  const [customerType, setCustomerType] = useState<"lama" | "baru">("lama");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [nama_pelanggan, setNamaPelanggan] = useState("");
  const [no_hp, setNoHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [no_pesanan, setNoPesanan] = useState("");
  const [tgl_transaksi, setTglTransaksi] = useState("");
  const [estimasi_selesai, setEstimasiSelesai] = useState("");
  const [catatan, setCatatan] = useState("");
  const [items, setItems] = useState<Item[]>([EMPTY_ITEM]);
  const [pelanggans, setPelanggans] = useState<Customer[]>([]);
  const [produks, setProduks] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const [{ data: plg, error: plgError }, { data: prd, error: prdError }] =
        await Promise.all([
          supabase.from("customers").select("*").order("nama_pelanggan", { ascending: true }),
          supabase.from("products").select("*").order("nama_produk", { ascending: true }),
        ]);

      if (plgError) console.error(plgError);
      if (prdError) console.error(prdError);

      setPelanggans((plg || []) as Customer[]);
      setProduks((prd || []) as Product[]);
      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now(), product_id: "", jumlah: 1, satuan: "pcs", harga: 0 },
    ]);
  };

  const handleRemoveItem = (id: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((i) => i.id !== id)));
  };

  const handleItemChange = (
    id: number,
    field: keyof Omit<Item, "id">,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const total = useMemo(() => {
    return items.reduce(
      (sum, i) => sum + Number(i.harga || 0) * Number(i.jumlah || 0),
      0
    );
  }, [items]);

  async function createCustomer() {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        nama_pelanggan,
        no_hp,
        alamat,
      })
      .select("id")
      .single();

    if (error || !data) return null;
    return data.id as string;
  }

  async function createOrder(customerId: string) {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        no_pesanan,
        tgl_transaksi,
        estimasi_selesai,
        catatan,
        total_harga: total,
      })
      .select("id")
      .single();

    if (error || !data) return null;
    return data.id as string;
  }

  async function createOrderItems(orderId: string) {
    const orderItems = items.map((i) => ({
      order_id: orderId,
      product_id: i.product_id,
      jumlah: Number(i.jumlah),
      harga_satuan: Number(i.harga),
      subtotal: Number(i.jumlah) * Number(i.harga),
    }));

    const { error } = await supabase.from("order_items").insert(orderItems);
    return !error;
  }

  const resetForm = () => {
    setCustomerType("lama");
    setSelectedCustomer("");
    setNamaPelanggan("");
    setNoHp("");
    setAlamat("");
    setNoPesanan("");
    setTglTransaksi("");
    setEstimasiSelesai("");
    setCatatan("");
    setItems([EMPTY_ITEM]);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (customerType === "lama" && !selectedCustomer) {
      alert("Pilih pelanggan terlebih dahulu");
      return;
    }

    if (customerType === "baru" && (!nama_pelanggan || !no_hp || !alamat)) {
      alert("Lengkapi data pelanggan baru");
      return;
    }

    if (!no_pesanan || !tgl_transaksi || !estimasi_selesai) {
      alert("Lengkapi data pesanan");
      return;
    }

    if (items.length === 0 || items.some((i) => !i.product_id)) {
      alert("Lengkapi item pesanan");
      return;
    }

    const customerId =
      customerType === "lama" ? selectedCustomer : await createCustomer();

    if (!customerId) {
      alert("Gagal menyimpan pelanggan");
      return;
    }

    const orderId = await createOrder(customerId);
    if (!orderId) {
      alert("Gagal menyimpan pesanan");
      return;
    }

    const ok = await createOrderItems(orderId);
    if (!ok) {
      alert("Gagal menyimpan item pesanan");
      return;
    }

    alert("Pesanan berhasil disimpan");
    resetForm();
    await (async () => {
      setLoading(true);
      const [{ data: plg }, { data: prd }] = await Promise.all([
        supabase.from("customers").select("*").order("nama_pelanggan", { ascending: true }),
        supabase.from("products").select("*").order("nama_produk", { ascending: true }),
      ]);
      setPelanggans((plg || []) as Customer[]);
      setProduks((prd || []) as Product[]);
      setLoading(false);
    })();
  }

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Memuat data pesanan...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Pesanan</h1>
        <p className="mt-1 text-sm text-gray-600">Buat dan kelola pesanan pelanggan.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 md:space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tipe Pelanggan</label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setCustomerType("lama")}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                customerType === "lama" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              Pelanggan Lama
            </button>
            <button
              type="button"
              onClick={() => setCustomerType("baru")}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                customerType === "baru" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              Pelanggan Baru
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-3 md:p-4">
          <h3 className="text-sm font-semibold text-gray-700">Data Pelanggan</h3>

          {customerType === "lama" ? (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">Pilih Pelanggan</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Pilih Pelanggan --</option>
                {pelanggans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_pelanggan} - {p.no_hp}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Pelanggan</label>
                <input
                  type="text"
                  value={nama_pelanggan}
                  onChange={(e) => setNamaPelanggan(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Contoh: Budi Santoso"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">No. HP</label>
                <input
                  type="text"
                  value={no_hp}
                  onChange={(e) => setNoHp(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Contoh: 081234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Alamat</label>
                <textarea
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Contoh: Jl. Mawar No. 12, Jakarta"
                />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 p-3 md:p-4">
          <h3 className="text-sm font-semibold text-gray-700">Data Pesanan</h3>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">No. Pesanan</label>
              <input
                type="text"
                value={no_pesanan}
                onChange={(e) => setNoPesanan(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Contoh: ORD-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tanggal Transaksi</label>
              <input
                type="date"
                value={tgl_transaksi}
                onChange={(e) => setTglTransaksi(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estimasi Selesai</label>
              <input
                type="date"
                value={estimasi_selesai}
                onChange={(e) => setEstimasiSelesai(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Catatan</label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Opsional"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-3 md:p-4">
          <h3 className="text-sm font-semibold text-gray-700">Item Pesanan</h3>

          <div className="mt-3 space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="rounded-md border border-gray-200 p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Item #{idx + 1}</p>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Hapus
                    </button>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Produk</label>
                    <select
                      value={item.product_id}
                      onChange={(e) => handleItemChange(item.id, "product_id", e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Pilih Produk --</option>
                      {produks.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama_produk}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600">Jumlah</label>
                    <input
                      type="number"
                      min={1}
                      value={item.jumlah}
                      onChange={(e) =>
                        handleItemChange(item.id, "jumlah", Number(e.target.value))
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600">Satuan</label>
                    <select
                      value={item.satuan}
                      onChange={(e) => handleItemChange(item.id, "satuan", e.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="pcs">Pcs</option>
                      <option value="box">Box</option>
                      <option value="kg">Kg</option>
                      <option value="liter">Liter</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600">Harga</label>
                    <input
                      type="number"
                      min={0}
                      value={item.harga}
                      onChange={(e) =>
                        handleItemChange(item.id, "harga", Number(e.target.value))
                      }
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="mt-3 rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            + Tambah Item
          </button>

          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
            <p className="text-sm font-medium text-gray-700">Total</p>
            <p className="text-base font-bold text-black">Rp {total.toLocaleString("id-ID")}</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Kirim Pesanan
          </button>
        </div>
      </form>

      <PesananTable />
    </div>
  );
}