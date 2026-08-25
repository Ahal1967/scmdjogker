"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Plus, FileText, ShoppingBag, CheckCircle2, TrendingUp, ChevronLeft, ChevronRight, Eye, Trash2, User, Loader2, PackageOpen, ClipboardList, Calendar, Tag, MoreHorizontal, MessageCircle, Download } from "lucide-react";
import { useConfirm } from "@/components/useConfirm";
import { useToast } from "@/components/useToast";
import { createClient } from "@/lib/supabase/client";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import StatusDropdown from "@/components/StatusDropdown";
import { compareValues } from "@/lib/sortUtils";
import { generateUniqueCode } from "@/lib/generateCode";
import { exportToExcel } from "@/lib/exportData";

type Customer = {
  id: string;
  nama: string | null;
  no_telepon: string | null;
  alamat: string | null;
};

type OrderItem = {
  id?: string;
  nama_produk: string;
  ukuran: string;
  jumlah: number;
  harga: number;
  // Tautan ke katalog produk (lib resep/BOM) -- null berarti "ketik
  // manual", produk tidak ada di katalog, jadi tidak ikut memotong stok
  // bahan baku otomatis waktu pesanan disimpan.
  product_id?: string | null;
};

type Product = {
  id: string;
  nama_produk: string;
  harga_default: number;
};

type RawMaterial = {
  id: string;
  nama_bahan: string;
  satuan: string | null;
};

type BomRow = { raw_material_id: string; qty_per_unit: number };

// Sama seperti di halaman Produk (ProdukTable.tsx) -- angka umum industri
// sablon yang dikasih langsung oleh Ahal, dipakai sebagai titik awal isi
// cepat qty_per_unit, bukan angka final yang dikunci. Staf tetap bisa
// timpa manual kalau desain/teknik sablonnya beda dari rata-rata.
const ESTIMASI_BAHAN = [
  {
    key: "tinta",
    label: "Tinta rubber/waterbase -- ±85 kaos per liter/kg (rentang umum 70-100)",
    qtyPerUnit: 1 / 85,
  },
  {
    key: "kain30s",
    label: "Kain Cotton Combed 30s (tipis/sedang) -- ±122 kaos per roll ±25kg (rentang 120-125)",
    qtyPerUnit: 1 / 122.5,
  },
  {
    key: "kain24s",
    label: "Kain Cotton Combed 24s (lebih tebal) -- ±105 kaos per roll ±25kg (rentang 100-110)",
    qtyPerUnit: 1 / 105,
  },
];

const UKURAN_OPTIONS = ["S", "M", "L", "XL", "XXL", "3XL", "All Size"];

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
  customers: { nama: string | null; no_telepon: string | null } | null;
  order_items: OrderItem[] | null;
};

const STATUS_OPTIONS = ["Pesanan", "Produksi", "QC", "Packing", "Dikirim", "Selesai"];

// Sama persis dengan mapping progress di halaman Produksi (ProduksiTable.tsx)
// -- "Pesanan" dan "Dikirim" sengaja tidak dipetakan karena tidak ada
// tahap production yang berkaitan (Pesanan = sebelum produksi mulai,
// Dikirim = sesudah production selesai, ditangani halaman Pengiriman).
const PRODUCTION_PROGRESS_MAP: Record<string, number> = {
  Produksi: 20,
  QC: 75,
  Packing: 90,
  Selesai: 100,
};

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

// Belum ada integrasi WhatsApp Business API (butuh nomor terverifikasi +
// biaya berlangganan) -- ini jalan pintas praktis yang bisa jalan hari
// ini: admin tinggal klik, WhatsApp Web/App kebuka dengan pesan status
// terkini sudah terisi otomatis, tinggal kirim manual. Bukan notifikasi
// otomatis penuh, tapi menghapus kerja ketik ulang pesan tiap kali status
// berubah.
const TRACKING_URL = "https://scmdjogker.vercel.app/tracking";

function buildWaLink(noTelepon: string | null | undefined, order: Order) {
  if (!noTelepon) return null;
  const digits = noTelepon.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("0") ? "62" + digits.slice(1) : digits.startsWith("62") ? digits : "62" + digits;
  const pesan = `Halo ${order.customers?.nama ?? "Kak"}, update status pesanan kamu:\n\nNo. Pesanan: *${
    order.no_pesanan
  }*\nStatus: *${
    order.status ?? "-"
  }*\n\nKamu bisa cek status pesanan ini kapan saja secara real-time lewat halaman Lacak Pesanan di ${TRACKING_URL} -- tinggal masukkan nomor pesanan di atas.\n\nTerima kasih sudah berbelanja di DJOGKER Sablon Kaos!`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(pesan)}`;
}

// generateUniqueCode (buat no_pesanan/no_produksi) ditarik ke
// @/lib/generateCode supaya bisa dipakai bareng sama QcTable.tsx
// (no_qc/no_packing) -- lihat komentar di file itu buat penjelasan lengkap
// kenapa kode acak, bukan nomor urut.

// Kotak input produk pesanan: gabungan "cari & pilih dari katalog" dan
// "ketik manual" jadi satu field, supaya staf tidak perlu pindah-pindah
// antara dropdown dan input teks (keluhan sebelumnya). Ngetik sambil
// difilter (search-as-you-type), dan kalau nama yang diketik belum ada
// di katalog, muncul pilihan "+ Tambah sebagai produk baru" biar staf
// bisa daftarin produk baru tanpa pindah ke halaman Produk.
function ProductCombobox({
  value,
  productId,
  products,
  onChangeText,
  onSelectProduct,
  onQuickAdd,
}: {
  value: string;
  productId: string | null;
  products: Product[];
  onChangeText: (text: string) => void;
  onSelectProduct: (p: Product) => void;
  onQuickAdd: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const filtered = q ? products.filter((p) => p.nama_produk.toLowerCase().includes(q)) : products;
  const exactMatch = products.some((p) => p.nama_produk.toLowerCase() === q);

  return (
    <div className="relative">
      <input
        placeholder="Ketik atau pilih produk..."
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="input-field w-full"
      />
      {productId ? (
        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400">
          <CheckCircle2 size={11} /> Terhubung katalog -- stok bahan otomatis kepotong
        </span>
      ) : value.trim() ? (
        <span className="mt-1 inline-block text-[10px] text-gray-400 dark:text-gray-500">
          Teks manual -- stok bahan tidak otomatis kepotong
        </span>
      ) : null}
      {open && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-lg">
          {filtered.length > 0 ? (
            filtered.map((p) => (
              <button
                type="button"
                key={p.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelectProduct(p);
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#21262d]"
              >
                {p.nama_produk}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-gray-400">Tidak ada produk katalog yang cocok.</div>
          )}
          {value.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onQuickAdd(value.trim());
                setOpen(false);
              }}
              className="flex w-full items-center gap-1.5 border-t border-gray-100 dark:border-[#30363d] px-3 py-2 text-left text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Plus size={13} /> Tambah &quot;{value.trim()}&quot; sebagai produk baru
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PesananTable() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/dashboard/produksi");
  }, []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal "Tambah Produk Baru" versi cepat, dipicu langsung dari dalam
  // form Pesanan (lihat ProductCombobox) -- staf tidak perlu pindah ke
  // halaman Produk cuma buat daftarin 1 produk baru.
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddIdx, setQuickAddIdx] = useState<number | null>(null);
  const [quickAddForm, setQuickAddForm] = useState({ nama_produk: "", kategori: "", harga_default: 0 });
  const [quickAddRecipeRows, setQuickAddRecipeRows] = useState<BomRow[]>([{ raw_material_id: "", qty_per_unit: 0 }]);
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, ToastBanner } = useToast();
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [pelunasanInput, setPelunasanInput] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<
    { id: string; jumlah: number; catatan: string | null; created_at: string }[]
  >([]);

  // Ambil ulang riwayat pembayaran tiap kali modal detail pesanan dibuka /
  // gonta-ganti pesanan -- dipisah dari handleCatatPembayaran supaya juga
  // kepanggil waktu detail dibuka dari tombol "Lihat" (bukan cuma sesudah
  // bayar).
  useEffect(() => {
    if (!detailOrder) {
      setPaymentHistory([]);
      return;
    }
    supabase
      .from("payments")
      .select("id, jumlah, catatan, created_at")
      .eq("order_id", detailOrder.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setPaymentHistory(data);
        // Tabel "payments" baru ada setelah migrasi dijalankan -- kalau
        // belum, diamkan saja (riwayat tampil kosong, tidak mem-block
        // modal detail buat dibuka).
      });
  }, [detailOrder?.id]);
  const [payingOff, setPayingOff] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ nama: "", no_telepon: "", alamat: "" });
  const [alamatPengiriman, setAlamatPengiriman] = useState("");
  const [dp, setDp] = useState(0);
  const [items, setItems] = useState<OrderItem[]>([{ nama_produk: "", ukuran: "", jumlah: 1, harga: 0 }]);

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

      // Kedua query ini independen (tidak saling butuh hasil satu sama
      // lain), jadi ditembak bareng lewat Promise.all -- sebelumnya jalan
      // berurutan (nunggu satu-satu) yang bikin halaman Pesanan kerasa lama.
      // (Query ke tabel "production" buat ngitung nomor urut berikutnya
      // SUDAH DIHAPUS -- no_pesanan/no_produksi sekarang kode acak yang
      // dicek unik langsung ke DB pas disimpan, lihat generateUniqueCode
      // di atas, jadi tidak perlu lagi tahu nomor urut terakhir.)
      const [
        { data: ordersData, error: ordersError },
        { data: customersData, error: customersError },
        { data: productsData, error: productsError },
        { data: rawMaterialsData, error: rawMaterialsError },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*, customers(nama, no_telepon), order_items(id, nama_produk, ukuran, jumlah, harga, product_id)")
          .order("created_at", { ascending: false }),
        supabase.from("customers").select("*").order("nama", { ascending: true }),
        supabase.from("products").select("id, nama_produk, harga_default").order("nama_produk", { ascending: true }),
        supabase.from("raw_materials").select("id, nama_bahan, satuan").order("nama_bahan", { ascending: true }),
      ]);

      if (ordersError) console.error(ordersError);
      if (customersError) console.error(customersError);
      // Tabel "products"/"raw_materials" baru relevan setelah migrasi
      // katalog produk/resep dijalankan -- kalau belum, biarkan saja
      // kosong (mode manual tetap jalan seperti biasa), jangan sampai
      // error ini mem-block seluruh halaman Pesanan.
      if (productsError) console.error(productsError);
      if (rawMaterialsError) console.error(rawMaterialsError);

      if (ordersData) setOrders(ordersData as Order[]);
      if (customersData) setCustomers(customersData as Customer[]);
      if (productsData) setProducts(productsData as Product[]);
      if (rawMaterialsData) setRawMaterials(rawMaterialsData as RawMaterial[]);

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

  type SortField = "no_pesanan" | "pelanggan" | "tanggal" | "status";
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

  function sortValue(o: Order, field: SortField) {
    switch (field) {
      case "no_pesanan":
        return o.no_pesanan ?? "";
      case "pelanggan":
        return o.customers?.nama ?? "";
      case "tanggal":
        return o.tanggal ?? "";
      case "status":
        return o.status ?? "";
    }
  }

  const sorted = sortField
    ? [...filtered].sort((a, b) => compareValues(sortValue(a, sortField), sortValue(b, sortField), sortDir))
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
    setItems([{ nama_produk: "", ukuran: "", jumlah: 1, harga: 0, product_id: null }]);
    setShowModal(true);
  }

  function addItemRow() {
    setItems((prev) => [...prev, { nama_produk: "", ukuran: "", jumlah: 1, harga: 0, product_id: null }]);
  }

  function removeItemRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof OrderItem, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  // Dipanggil waktu staf klik salah satu saran produk di ProductCombobox
  // -- otomatis isi nama produk & harga default (kalau harga masih
  // kosong), dan mengunci product_id supaya resep BOM-nya ikut kepakai.
  // Kalau staf terus ngetik teks bebas tanpa milih saran, product_id
  // tetap null (lihat onChangeText di ProductCombobox) -- itu bukan
  // error, produk itu cuma tidak ikut potong stok bahan otomatis karena
  // tidak tertaut ke resep apa pun.
  function selectProduct(idx: number, productId: string) {
    if (!productId) {
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, product_id: null } : it)));
      return;
    }
    const p = products.find((pr) => pr.id === productId);
    if (!p) return;
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              product_id: p.id,
              nama_produk: p.nama_produk,
              harga: it.harga || Number(p.harga_default) || 0,
            }
          : it
      )
    );
  }

  function addQuickAddRecipeRow() {
    setQuickAddRecipeRows((prev) => [...prev, { raw_material_id: rawMaterials[0]?.id ?? "", qty_per_unit: 0 }]);
  }

  function removeQuickAddRecipeRow(i: number) {
    setQuickAddRecipeRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateQuickAddRecipeRow(i: number, field: keyof BomRow, value: string | number) {
    setQuickAddRecipeRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  // Daftarin produk baru langsung dari dalam form Pesanan (dipicu dari
  // ProductCombobox), lalu langsung pakai produk itu di baris item yang
  // memicunya -- staf tidak perlu pindah ke halaman Produk & balik lagi.
  async function handleSaveQuickAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (quickAddIdx === null) return;
    setSavingQuickAdd(true);

    const { data: newProduct, error: prodError } = await supabase
      .from("products")
      .insert({
        nama_produk: quickAddForm.nama_produk.trim(),
        kategori: quickAddForm.kategori.trim() || null,
        harga_default: quickAddForm.harga_default,
      })
      .select()
      .single();

    if (prodError || !newProduct) {
      showToast("Gagal menambah produk baru: " + (prodError?.message ?? "tidak diketahui"));
      setSavingQuickAdd(false);
      return;
    }

    const validRecipeRows = quickAddRecipeRows.filter((r) => r.raw_material_id && Number(r.qty_per_unit) > 0);
    if (validRecipeRows.length > 0) {
      const { error: recipeError } = await supabase.from("product_materials").insert(
        validRecipeRows.map((r) => ({
          product_id: newProduct.id,
          raw_material_id: r.raw_material_id,
          qty_per_unit: Number(r.qty_per_unit),
        }))
      );
      if (recipeError) {
        showToast("Produk tersimpan, tapi resep bahan gagal disimpan: " + recipeError.message);
      }
    }

    // Tambahkan ke daftar produk lokal supaya langsung muncul di combobox
    // manapun tanpa perlu reload halaman. Dipakai objek newProduct
    // langsung (bukan lewat selectProduct/state products) karena state
    // "products" hasil setProducts di bawah ini belum ke-update saat
    // baris berikutnya jalan (closure lama) -- jadi lebih aman isi
    // item-nya langsung dari newProduct.
    setProducts((prev) =>
      [...prev, { id: newProduct.id, nama_produk: newProduct.nama_produk, harga_default: newProduct.harga_default }].sort(
        (a, b) => a.nama_produk.localeCompare(b.nama_produk)
      )
    );

    const targetIdx = quickAddIdx;
    setItems((prev) =>
      prev.map((it, i) =>
        i === targetIdx
          ? {
              ...it,
              product_id: newProduct.id,
              nama_produk: newProduct.nama_produk,
              harga: it.harga || Number(newProduct.harga_default) || 0,
            }
          : it
      )
    );

    showToast(`Produk "${newProduct.nama_produk}" ditambahkan ke katalog & dipakai di pesanan ini.`);
    setShowQuickAdd(false);
    setSavingQuickAdd(false);
    setQuickAddIdx(null);
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

    const noPesanan = await generateUniqueCode(supabase, "orders", "no_pesanan", "DJ");

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
      .select("*, customers(nama, no_telepon)")
      .single();

    if (orderError || !orderData) {
      showToast("Gagal menyimpan pesanan: " + orderError?.message);
      setSaving(false);
      return;
    }

    // Semua peringatan non-fatal (pesanan TETAP tersimpan) dikumpulkan di
    // sini dan digabung jadi SATU toast di akhir fungsi -- sebelumnya
    // masing-masing showToast dipanggil langsung di tempat kejadian, tapi
    // toast "Pesanan berhasil ditambahkan." di baris paling akhir selalu
    // jalan tanpa syarat sesudahnya dan LANGSUNG MENIMPA peringatan-
    // peringatan ini (showToast cuma bisa nampilkan 1 toast dalam satu
    // waktu) -- jadi peringatan seperti "resep gagal disimpan" praktis
    // tidak pernah kelihatan oleh user sama sekali.
    const warnings: string[] = [];

    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .insert(validItems.map((it) => ({ ...it, order_id: orderData.id })))
      .select();

    if (itemsError) {
      console.error("Gagal menyimpan item produk:", itemsError.message);
      warnings.push("item produk gagal disimpan: " + itemsError.message);
    }

    const { error: trackingError } = await supabase.from("order_tracking").insert({
      order_id: orderData.id,
      tahap: "Pesanan Diterima",
      selesai: true,
    });
    if (trackingError) {
      console.error("Gagal mencatat riwayat 'Pesanan Diterima':", trackingError.message);
    }

    const noProduksi = await generateUniqueCode(supabase, "production", "no_produksi", "PRO-");
    const { data: prodData, error: prodError } = await supabase
      .from("production")
      .insert({
        no_produksi: noProduksi,
        order_id: orderData.id,
        status: "Produksi",
        progress: 0,
      })
      .select()
      .single();

    if (prodError) {
      console.error("Gagal membuat entri produksi otomatis:", prodError.message);
      warnings.push("entri produksi gagal dibuat otomatis: " + prodError.message);
    }

    // Item yang nama produknya diketik manual / tidak diklik dari saran
    // katalog (product_id kosong) SENGAJA dilewati dari pemotongan stok
    // otomatis di bawah -- bukan error, tapi user perlu tahu, supaya tidak
    // bingung kenapa stok gudang tidak berkurang untuk item itu (ini
    // penyebab paling umum kenapa stok "tidak berkurang sedikit pun").
    const itemManual = validItems.filter((it) => !it.product_id);
    if (itemManual.length > 0) {
      warnings.push(
        `${itemManual.length} item (${itemManual.map((it) => it.nama_produk).join(", ")}) tidak terhubung ke produk katalog -- stok bahan baku TIDAK dipotong otomatis untuk item itu`
      );
    }

    // Potong stok bahan baku otomatis sesuai resep (BOM) dari produk katalog
    // yang dipesan (item manual di atas sudah tidak ikut di sini).
    const productIdsDipesan = Array.from(
      new Set(validItems.map((it) => it.product_id).filter((id): id is string => !!id))
    );

    if (productIdsDipesan.length > 0) {
      const { data: bomRows, error: bomError } = await supabase
        .from("product_materials")
        .select("product_id, raw_material_id, qty_per_unit")
        .in("product_id", productIdsDipesan);

      if (bomError) {
        console.error("Gagal mengambil resep produk:", bomError.message);
        warnings.push("gagal mengambil data resep produk: " + bomError.message);
      } else if (bomRows && bomRows.length > 0) {
        // Jumlahkan total pemakaian per bahan (1 bahan bisa dipakai lebih
        // dari 1 produk yang dipesan sekaligus).
        const pemakaian = new Map<string, number>();
        for (const it of validItems) {
          if (!it.product_id) continue;
          for (const b of bomRows.filter((r) => r.product_id === it.product_id)) {
            const kebutuhan = Number(b.qty_per_unit) * Number(it.jumlah || 0);
            pemakaian.set(b.raw_material_id, (pemakaian.get(b.raw_material_id) ?? 0) + kebutuhan);
          }
        }

        // Dipotong lewat SATU panggilan RPC (decrement_stok_batch), bukan
        // Promise.all satu-per-bahan seperti sebelumnya -- supaya kalau ada
        // satu bahan saja yang stoknya tidak cukup, SEMUA potongan di
        // pesanan ini gagal bersama (rollback otomatis di sisi database),
        // bukan sebagian bahan terpotong sebagian tidak. Fungsi ini juga
        // sudah tidak lagi meng-clamp diam-diam ke 0 kalau stok kurang --
        // lihat supabase/migration_fix_stok_race.sql.
        const { error: potongStokError } = await supabase.rpc("decrement_stok_batch", {
          items: Array.from(pemakaian.entries()).map(([rawMaterialId, qty]) => ({
            raw_material_id: rawMaterialId,
            qty,
          })),
        });

        if (potongStokError) {
          // Karena batch ini all-or-nothing, di titik ini stok belum
          // berubah SAMA SEKALI -- aman untuk cuma memberi tahu, tidak
          // perlu langkah reversal apa pun.
          console.error("Gagal memotong stok bahan baku:", potongStokError.message);
          warnings.push("stok bahan baku TIDAK dipotong (kemungkinan stok kurang): " + potongStokError.message);
        } else {
          // Catat PERSIS berapa yang barusan dipotong per bahan, supaya
          // kalau pesanan ini dihapus nanti (lihat handleDelete), stoknya
          // bisa dibalikin akurat -- tidak dihitung ulang dari resep
          // TERKINI, karena resepnya bisa saja sudah berubah sejak
          // pesanan ini dibuat.
          const { error: ledgerError } = await supabase.from("order_material_usage").insert(
            Array.from(pemakaian.entries()).map(([rawMaterialId, qty]) => ({
              order_id: orderData.id,
              raw_material_id: rawMaterialId,
              qty,
            }))
          );
          if (ledgerError) {
            // Stok SUDAH terpotong di titik ini, tapi catatan buat
            // reversal-nya gagal disimpan -- ini yang bikin pengembalian
            // stok saat pesanan dihapus jadi tidak akurat, jadi tetap
            // diberi tahu (bukan cuma console.error seperti sebelumnya).
            console.error("Gagal mencatat ledger pemakaian bahan:", ledgerError.message);
            warnings.push(
              "catatan riwayat pemakaian bahan gagal disimpan, stok sudah terpotong -- kalau pesanan ini dihapus nanti, cek stok manual"
            );
          }
          if (prodData?.id) {
            const { error: prodFlagError } = await supabase
              .from("production")
              .update({ stok_dipotong: true })
              .eq("id", prodData.id);
            if (prodFlagError) {
              console.error("Gagal menandai stok_dipotong:", prodFlagError.message);
            }
          }
        }
      } else {
        // productIdsDipesan ada isinya, tapi query product_materials pulang
        // kosong -- berarti produk katalog yang dipesan belum diatur resep
        // bahannya sama sekali (beda kasus dari item manual di atas: ini
        // produk yang SUDAH ada di katalog, tapi resepnya belum diisi lewat
        // "Kelola Resep Bahan" di modul Produk).
        warnings.push("produk yang dipesan belum punya resep bahan (BOM) tersimpan -- stok tidak dipotong otomatis");
      }
    }

    setOrders((prev) => [
      { ...(orderData as Order), order_items: (itemsData as OrderItem[]) ?? validItems },
      ...prev,
    ]);
    setShowModal(false);
    setSaving(false);

    if (warnings.length > 0) {
      showToast("Pesanan tersimpan, tapi ada yang perlu dicek: " + warnings.join(" | "));
    } else {
      showToast("Pesanan berhasil ditambahkan.", "success");
    }
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
      .select("*, customers(nama, no_telepon), order_items(id, nama_produk, ukuran, jumlah, harga)")
      .single();
    setPayingOff(false);

    if (error || !data) {
      showToast("Gagal mencatat pembayaran: " + error?.message);
      return;
    }

    setOrders((prev) => prev.map((o) => (o.id === order.id ? (data as Order) : o)));
    setDetailOrder(data as Order);
    setPelunasanInput("");

    const { data: paymentRow, error: paymentError } = await supabase
      .from("payments")
      .insert({ order_id: order.id, jumlah })
      .select()
      .single();
    if (paymentError) {
      console.error("Gagal mencatat riwayat pembayaran:", paymentError.message);
    } else if (paymentRow) {
      setPaymentHistory((prev) => [paymentRow, ...prev]);
    }

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
      .select("*, customers(nama, no_telepon), order_items(id, nama_produk, ukuran, jumlah, harga)")
      .single();

    if (!error && data) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? (data as Order) : o)));

      // Sinkronkan ke tabel production supaya progress di halaman Produksi
      // ikut berubah. Sebelumnya ini TIDAK ADA -- ubah status di sini cuma
      // menulis ke orders.status, sama sekali tidak menyentuh
      // production.progress, jadi progress di halaman Produksi selalu diam
      // di 0% walau status pesanan sudah diubah ke Produksi. Nilai persen
      // disamakan dengan mapping yang sudah dipakai di halaman Produksi
      // (PRODUCTION_PROGRESS_MAP) supaya kedua halaman konsisten.
      const mappedProgress = PRODUCTION_PROGRESS_MAP[status];
      if (mappedProgress !== undefined) {
        await supabase
          .from("production")
          .update({ status, progress: mappedProgress })
          .eq("order_id", order.id);
      }

      await supabase.from("order_tracking").insert({
        order_id: order.id,
        tahap: status,
        selesai: true,
      });

      if (status === "Produksi") {
        showToast("Status diubah ke Produksi, otomatis lanjut ke halaman Produksi.", "success");
        setTimeout(() => {
          router.push("/dashboard/produksi");
          router.refresh();
        }, 900);
      }
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ message: "Pesanan ini beserta seluruh itemnya akan dihapus permanen.", danger: true });
    if (!ok) return;

    try {
      // Balikin stok bahan baku SEBELUM pesanan dihapus -- baca dulu
      // ledger persis apa yang kepotong buat pesanan ini (order_id-nya
      // masih valid), baru hapus. Kalau ini dilakukan SETELAH hapus
      // pesanan, baris order_material_usage-nya sudah ikut kehapus
      // duluan (on delete cascade dari orders), jadi tidak akan tahu
      // lagi berapa yang harus dibalikin.
      const { data: usageRows, error: usageError } = await supabase
        .from("order_material_usage")
        .select("raw_material_id, qty")
        .eq("order_id", id);

      if (usageError) {
        console.error("Gagal membaca ledger pemakaian bahan:", usageError.message);
      } else if (usageRows && usageRows.length > 0) {
        const hasilBalikStok = await Promise.all(
          usageRows.map((u) => supabase.rpc("increment_stok", { p_raw_material_id: u.raw_material_id, p_qty: Number(u.qty) }))
        );
        const gagalBalikStok = hasilBalikStok.some((r) => r.error);
        if (gagalBalikStok) {
          const pesanError = hasilBalikStok.find((r) => r.error)?.error?.message;
          showToast(
            "Pesanan dihapus, tapi stok bahan baku gagal dikembalikan otomatis: " +
              (pesanError ?? "cek migrasi database (increment_stok belum ada?).")
          );
        }
      }

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

  // Export yang lagi kelihatan (kena filter pencarian & sort), bukan cuma
  // 1 halaman pagination.
  function handleExport() {
    exportToExcel(
      "pesanan",
      "Pesanan",
      sorted.map((o) => ({
        "No. Pesanan": o.no_pesanan,
        Pelanggan: o.customers?.nama ?? "-",
        Tanggal: o.tanggal ? new Date(o.tanggal).toLocaleDateString("id-ID") : "-",
        Total: Number(o.total) || 0,
        DP: Number(o.dp) || 0,
        "Sisa Pembayaran": Number(o.sisa_pembayaran) || 0,
        Status: o.status ?? "-",
        "Alamat Pengiriman": o.alamat_pengiriman ?? "-",
      }))
    );
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
          type="button"
          onClick={handleExport}
          disabled={sorted.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-[#21262d] disabled:cursor-not-allowed disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <Download size={15} />
          Export
        </button>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 whitespace-nowrap"
        >
          <Plus size={16} />
          Pesanan Baru
        </button>
      </div>

      <div className="card overflow-hidden p-0" style={{ border: "none" }}>
        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <TableIconCell icon={FileText} />
                <SortableTh label="No. Pesanan" icon={ClipboardList} active={sortField === "no_pesanan"} direction={sortDir} onClick={() => toggleSort("no_pesanan")} center />
                <SortableTh label="Pelanggan" icon={User} active={sortField === "pelanggan"} direction={sortDir} onClick={() => toggleSort("pelanggan")} center />
                <SortableTh label="Tanggal" icon={Calendar} active={sortField === "tanggal"} direction={sortDir} onClick={() => toggleSort("tanggal")} center />
                <SortableTh label="Status" icon={Tag} active={sortField === "status"} direction={sortDir} onClick={() => toggleSort("status")} center />
                <SortableTh label="Aksi" icon={MoreHorizontal} sortable={false} center />
              </tr>
            </thead>
            <tbody>
              {paginated.map((o, idx) => (
                <tr key={o.id}>
                  <td>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-[#21262d]/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </span>
                  </td>
                  <td className="text-black dark:text-white text-center">{o.no_pesanan}</td>
                  <td className="text-sm text-gray-800 dark:text-gray-200 text-center">{o.customers?.nama ?? "-"}</td>
                  <td className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    {o.tanggal
                      ? new Date(o.tanggal).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "-"}
                  </td>
                  <td className="text-center">
                    <StatusDropdown
                      value={o.status ?? "Pesanan"}
                      options={STATUS_OPTIONS}
                      colorClasses={STATUS_COLORS}
                      onChange={(status) => updateStatus(o, status)}
                      ariaLabel="Ubah status pesanan"
                    />
                  </td>
                  <td className="td-center">
                    <div className="flex justify-center gap-1.5">
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
                      {buildWaLink(o.customers?.no_telepon, o) && (
                        <a
                          href={buildWaLink(o.customers?.no_telepon, o) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Kabari status via WhatsApp"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/40 transition-colors"
                        >
                          <MessageCircle size={15} />
                        </a>
                      )}
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
          <div className="flex flex-col gap-3 border-t border-gray-100 dark:border-[#30363d] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {paginated.length} dari {filtered.length} pesanan
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

      {/* Ringkasan bawah, digabung jadi 1 card seperti referensi */}
      <div className="card p-0 overflow-hidden" style={{ border: "none" }}>
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
          <div className="card card-modal w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto" style={{ border: "none" }}>
            {/* Nomor pesanan TIDAK ditampilkan di sini lagi -- dulu bisa
                "ditebak" sebelum disimpan karena nomor urut (DJ + counter),
                sekarang kodenya acak dan baru ditentukan pas disimpan ke
                database (lihat generateUniqueCode), jadi tidak ada lagi
                nomor yang bisa diprediksi di sini. */}
            <h2 className="font-display text-base font-semibold text-black dark:text-white">
              Pesanan Baru
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
                  <span className="w-24 text-[11px] text-gray-400">Ukuran</span>
                  <span className="w-20 text-[11px] text-gray-400">Jumlah</span>
                  <span className="w-28 text-[11px] text-gray-400">Harga Satuan</span>
                </div>
                <div className="mt-1 space-y-3 sm:space-y-2">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col gap-2 rounded-lg border border-gray-100 dark:border-[#30363d] p-2.5 sm:flex-row sm:items-start sm:border-0 sm:p-0"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 space-y-1.5">
                          <ProductCombobox
                            value={it.nama_produk}
                            productId={it.product_id ?? null}
                            products={products}
                            onChangeText={(text) =>
                              setItems((prev) =>
                                prev.map((row, i) => (i === idx ? { ...row, nama_produk: text, product_id: null } : row))
                              )
                            }
                            onSelectProduct={(p) => selectProduct(idx, p.id)}
                            onQuickAdd={(text) => {
                              setQuickAddIdx(idx);
                              setQuickAddForm({ nama_produk: text, kategori: "", harga_default: 0 });
                              setQuickAddRecipeRows([{ raw_material_id: rawMaterials[0]?.id ?? "", qty_per_unit: 0 }]);
                              setShowQuickAdd(true);
                            }}
                          />
                        </div>
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
                        <div className="flex-1 sm:w-24 sm:flex-none">
                          <span className="mb-1 block text-[11px] text-gray-400 sm:hidden">Ukuran</span>
                          <select
                            value={it.ukuran}
                            onChange={(e) => updateItem(idx, "ukuran", e.target.value)}
                            className="input-field w-full"
                          >
                            <option value="">Ukuran</option>
                            {UKURAN_OPTIONS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
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

              <div className="border-t border-gray-200 dark:border-[#30363d] pt-3">
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

      {showQuickAdd && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto" style={{ border: "none" }}>
            <h2 className="font-display text-base font-semibold text-black dark:text-white">Tambah Produk Baru</h2>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Produk ini langsung masuk katalog & dipakai di pesanan yang sedang kamu buat. Isi resep bahan
              (opsional) supaya stok Gudang otomatis kepotong tiap kali produk ini dipesan lagi nanti.
            </p>
            <form onSubmit={handleSaveQuickAdd} className="mt-4 space-y-3">
              <input
                required
                autoFocus
                placeholder="Nama Produk"
                value={quickAddForm.nama_produk}
                onChange={(e) => setQuickAddForm((f) => ({ ...f, nama_produk: e.target.value }))}
                className="input-field w-full"
              />
              <input
                placeholder="Kategori (opsional, mis. Kaos, Hoodie)"
                value={quickAddForm.kategori}
                onChange={(e) => setQuickAddForm((f) => ({ ...f, kategori: e.target.value }))}
                className="input-field w-full"
              />
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Harga Default
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={quickAddForm.harga_default === 0 ? "" : quickAddForm.harga_default.toLocaleString("id-ID")}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setQuickAddForm((f) => ({ ...f, harga_default: raw === "" ? 0 : Number(raw) }));
                  }}
                  className="input-field w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Resep Bahan (opsional)</label>
                  {rawMaterials.length > 0 && (
                    <button type="button" onClick={addQuickAddRecipeRow} className="text-xs text-blue-600 hover:underline">
                      + Bahan
                    </button>
                  )}
                </div>
                {rawMaterials.length === 0 ? (
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Belum ada bahan baku di Gudang -- lewati bagian ini dulu, atau tambah bahan di halaman Gudang lalu
                    lengkapi resepnya lewat halaman Produk.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {quickAddRecipeRows.map((r, i) => {
                      const material = rawMaterials.find((m) => m.id === r.raw_material_id);
                      return (
                        <div key={i} className="space-y-1 rounded-lg border border-gray-100 dark:border-[#30363d] p-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={r.raw_material_id}
                              onChange={(e) => updateQuickAddRecipeRow(i, "raw_material_id", e.target.value)}
                              className="input-field flex-1"
                            >
                              <option value="">-- Pilih bahan --</option>
                              {rawMaterials.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.nama_bahan}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              placeholder="Jumlah"
                              value={r.qty_per_unit || ""}
                              onChange={(e) =>
                                updateQuickAddRecipeRow(i, "qty_per_unit", e.target.value === "" ? 0 : Number(e.target.value))
                              }
                              className="input-field w-24"
                            />
                            <span className="w-12 shrink-0 text-xs text-gray-400 dark:text-gray-500">
                              {material?.satuan ?? ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeQuickAddRecipeRow(i)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <select
                            value=""
                            onChange={(e) => {
                              const preset = ESTIMASI_BAHAN.find((p) => p.key === e.target.value);
                              if (preset) updateQuickAddRecipeRow(i, "qty_per_unit", Number(preset.qtyPerUnit.toFixed(5)));
                            }}
                            className="w-full rounded-lg border border-dashed border-gray-200 dark:border-[#3d444d] bg-transparent px-2 py-1 text-[10.5px] text-gray-400 dark:text-gray-500"
                          >
                            <option value="">Isi cepat: pakai estimasi umum industri...</option>
                            {ESTIMASI_BAHAN.map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAdd(false);
                    setQuickAddIdx(null);
                  }}
                  className="btn-outline flex-1"
                >
                  Batal
                </button>
                <button type="submit" disabled={savingQuickAdd} className="btn-primary flex-1">
                  {savingQuickAdd ? "Menyimpan..." : "Simpan & Pakai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm">
          <div className="card card-modal w-full max-w-md my-8 max-h-[90vh] overflow-y-auto p-0" style={{ border: "none" }}>
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
                  <span className="status-dot" />
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
              <div className="space-y-2 rounded-xl bg-gray-50 dark:bg-[#0d1117]/50 p-3">
                {(detailOrder.order_items ?? []).map((it, i) => (
                  <div key={i} className="text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {it.nama_produk}
                      {it.ukuran && <span className="text-gray-400"> ({it.ukuran})</span>}{" "}
                      <span className="text-gray-400">× {it.jumlah}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 rounded-xl border border-gray-100 dark:border-[#30363d] p-3 text-sm">
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
                <div className="flex justify-between border-t border-gray-100 dark:border-[#30363d] pt-2">
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

              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Riwayat Pembayaran
                </p>
                {paymentHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Belum ada pembayaran tercatat.</p>
                ) : (
                  <div className="space-y-1.5 rounded-xl bg-gray-50 dark:bg-[#0d1117]/50 p-3">
                    {paymentHistory.map((pmt) => (
                      <div key={pmt.id} className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {new Date(pmt.created_at).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {formatRupiah(Number(pmt.jumlah) || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                        className="block relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 dark:border-[#30363d] bg-gray-50 dark:bg-[#0d1117]"
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
