import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type Order = {
  id: string;
  no_pesanan: string | null;
  tanggal: string | null;
  total: number | null;
  dp: number | null;
  sisa_pembayaran: number | null;
  status: string | null;
  alamat_pengiriman: string | null;
  created_at: string | null;
};

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

function formatTanggal(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function LaporanPage() {
  const supabase = createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  const dataOrders = (orders || []) as Order[];

  const totalOrders = dataOrders.length;
  const totalRevenue = dataOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalDP = dataOrders.reduce((sum, o) => sum + (Number(o.dp) || 0), 0);
  const totalSisa = dataOrders.reduce((sum, o) => sum + (Number(o.sisa_pembayaran) || 0), 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Laporan Pesanan</h1>
        <p className="mt-1 text-sm text-gray-600">Ringkasan dan daftar semua pesanan pelanggan.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-4">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Pesanan</p>
          <p className="mt-1 font-display text-3xl font-bold text-black">{totalOrders}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Pendapatan</p>
          <p className="mt-1 font-display text-2xl font-bold text-black">{formatRupiah(totalRevenue)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total DP Diterima</p>
          <p className="mt-1 font-display text-2xl font-bold text-black">{formatRupiah(totalDP)}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Sisa Belum Dibayar</p>
          <p className="mt-1 font-display text-2xl font-bold text-black">{formatRupiah(totalSisa)}</p>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <div>
            <h2 className="text-base font-semibold text-black md:text-lg">Daftar Pesanan</h2>
            <p className="text-xs text-gray-500">{dataOrders.length} pesanan ditemukan</p>
          </div>
          <Link href="/dashboard/laporan/tambah" className="btn-primary text-xs md:text-sm">
            + Pesanan Baru
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="table-djoker w-full">
            <thead>
              <tr>
                <th>No. Pesanan</th>
                <th>Tanggal</th>
                <th>Total</th>
                <th>DP</th>
                <th>Sisa</th>
                <th>Status</th>
                <th>Alamat</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {dataOrders.map((order) => (
                <tr key={order.id}>
                  <td className="font-semibold text-black">{order.no_pesanan || "-"}</td>
                  <td className="text-sm text-gray-600">{formatTanggal(order.tanggal || order.created_at)}</td>
                  <td className="text-sm font-medium text-black">{formatRupiah(Number(order.total) || 0)}</td>
                  <td className="text-sm text-gray-700">{formatRupiah(Number(order.dp) || 0)}</td>
                  <td
                    className={`text-sm font-medium ${
                      (Number(order.sisa_pembayaran) || 0) > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatRupiah(Number(order.sisa_pembayaran) || 0)}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[order.status || ""] ?? "text-gray-600"}`}>
                      {order.status || "-"}
                    </span>
                  </td>
                  <td className="max-w-[10rem] truncate text-sm text-gray-700 md:max-w-xs">
                    {order.alamat_pengiriman || "-"}
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2 text-xs md:gap-3">
                      <Link
                        href={`/dashboard/laporan/edit/${order.id}`}
                        className="text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/dashboard/laporan/hapus/${order.id}`}
                        className="text-red-600 hover:text-red-700 hover:underline"
                      >
                        Hapus
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {dataOrders.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="flex min-h-[140px] items-center justify-center py-8 text-gray-500">
                      Belum ada pesanan.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
