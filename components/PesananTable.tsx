"use client";

type OrderItem = {
  id: string;
  nama_produk: string;
  jumlah: number;
  harga: number;
};

type Customer = {
  id: string;
  nama: string;
  no_telepon?: string | null;
  alamat?: string | null;
};

type Order = {
  id: string;
  nomor_order?: string | null;
  created_at?: string | null;
  status?: string | null;
  customers?: Customer | null;
  order_items?: OrderItem[] | null;
};

type PesananTableProps = {
  initialOrders: Order[];
  customers: Customer[];
  nextOrderNumber: number;
  nextProductionNumber: number;
};

export default function PesananTable({
  initialOrders,
  customers,
  nextOrderNumber,
  nextProductionNumber,
}: PesananTableProps) {
  const orders = initialOrders;

  return (
    <div className="w-full overflow-x-auto">
      <table className="table-djoker w-full">
        <thead>
          <tr>
            <th>No Order</th>
            <th>Pelanggan</th>
            <th>Produk</th>
            <th>Jumlah</th>
            <th>Harga</th>
            <th>Status</th>
            <th>Tanggal</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center text-sm text-gray-500">
                Belum ada pesanan.
              </td>
            </tr>
          )}

          {orders.map((order) => {
            const customer = order.customers;
            const items = order.order_items ?? [];
            const totalJumlah = items.reduce((sum, it) => sum + (Number(it.jumlah) || 0), 0);
            const totalHarga = items.reduce(
              (sum, it) => sum + (Number(it.jumlah) || 0) * (Number(it.harga) || 0),
              0
            );

            return (
              <tr key={order.id}>
                <td className="font-medium text-black">
                  {order.nomor_order ?? `ORD-${nextOrderNumber}`}
                </td>
                <td>
                  <div className="text-sm text-black">{customer?.nama ?? "-"}</div>
                  {customer?.no_telepon && (
                    <div className="text-xs text-gray-500">{customer.no_telepon}</div>
                  )}
                </td>
                <td className="text-sm text-gray-700">
                  {items.length > 0
                    ? items.map((it) => it.nama_produk).join(", ")
                    : "-"}
                </td>
                <td className="text-right text-sm text-black">{totalJumlah}</td>
                <td className="text-right text-sm text-black">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                  }).format(totalHarga)}
                </td>
                <td>
                  <span
                    className={`badge ${
                      order.status === "Produksi"
                        ? "text-blue-600"
                        : order.status === "Selesai"
                        ? "text-green-600"
                        : order.status === "Dikirim"
                        ? "text-orange-600"
                        : "text-gray-600"
                    }`}
                  >
                    {order.status ?? "-"}
                  </span>
                </td>
                <td className="text-right text-sm text-gray-600">
                  {order.created_at
                    ? new Date(order.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}