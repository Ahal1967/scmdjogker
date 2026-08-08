import { createClient } from "@/lib/supabase/server";
import PengirimanTable from "./PengirimanTable";

export default async function PengirimanPage() {
  const supabase = createClient();

  const { data: shipmentsRaw } = await supabase
    .from("shipments")
    .select("*, orders(no_pesanan, alamat_pengiriman, customers(nama))")
    .order("created_at", { ascending: false });

  const shipments = (shipmentsRaw ?? []).map((s: any) => {
    const orderRaw = Array.isArray(s.orders) ? s.orders[0] ?? null : s.orders;
    return {
      ...s,
      orders: orderRaw
        ? {
            no_pesanan: orderRaw.no_pesanan,
            alamat_pengiriman: orderRaw.alamat_pengiriman,
            customers: Array.isArray(orderRaw.customers)
              ? orderRaw.customers[0] ?? null
              : orderRaw.customers,
          }
        : null,
    };
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">LOGISTIK</span>
        <h1 className="font-display text-2xl font-bold text-black">Pengiriman</h1>
        <p className="mt-1 text-sm text-gray-600">
          Pantau dan kelola pesanan yang sedang dikirim ke pelanggan.
        </p>
      </div>

      <PengirimanTable initialShipments={shipments ?? []} />
    </div>
  );
}
