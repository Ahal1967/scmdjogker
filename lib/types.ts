export type OrderWithDetails = {
  id: string;
  customer_id: string | null;
  no_pesanan: string | null;
  tgl_transaksi: string | null;
  estimasi_selesai: string | null;
  catatan: string | null;
  total_harga: number | null;
  created_at: string | null;
  updated_at: string | null;

  // Relasi (opsional, sesuai kebutuhan)
  customers?: {
    id: string;
    nama_pelanggan: string | null;
    no_hp: string | null;
    alamat: string | null;
  } | null;

  order_items?: {
    id: string;
    order_id: string;
    product_id: string | null;
    jumlah: number | null;
    harga_satuan: number | null;
    subtotal: number | null;

    products?: {
      id: string;
      nama_produk: string | null;
      harga: number | null;
      stok: number | null;
    } | null;
  }[];
};