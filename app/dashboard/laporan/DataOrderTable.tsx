import { createClient } from "@/lib/supabase/server";

type Order = {
  id: string;
  no_pesanan: string;
  customer_id: string;
  tanggal: string;
  total: number;
  dp: number;
  sisa_pembayaran: number;
  status: string;
  alamat_pengiriman: string | null;
  desain_url: string | null;
  created_at: string;
};

export default async function OrdersPage() {
  const supabase = createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  function formatRupiah(n: number) {
    return "Rp " + n.toLocaleString("id-ID");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-black">Daftar Pesanan</h1>
        <p className="mt-1 text-sm text-gray-600">Manajemen pesanan pelanggan.</p>
      </div>

      {/* Tabel */}
      <div className="card overflow-x-auto">
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
            </tr>
          </thead>
          <tbody>
            {orders?.map((order: Order) => (
              <tr key={order.id}>
                <td className="font-semibold text-black">{order.no_pesanan}</td>
                <td className="text-sm text-gray-600">
                  {new Date(order.tanggal).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="text-sm font-medium text-black">
                  {formatRupiah(order.total)}
                </td>
                <td className="text-sm text-gray-700">{formatRupiah(order.dp)}</td>
                <td
                  className={`text-sm font-medium ${
                    order.sisa_pembayaran > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatRupiah(order.sisa_pembayaran)}
                </td>
                <td>
                  <span className="badge text-blue-600">{order.status}</span>
                </td>
                <td className="max-w-xs truncate text-sm text-gray-700">
                  {order.alamat_pengiriman || "-"}
                </td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-8">
                  Belum ada pesanan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}