import { createClient } from "@/lib/supabase/server";
import PackingTable from "./PackingTable";

export default async function PackingPage() {
  const supabase = createClient();

  const { data: packingRaw } = await supabase
    .from("packing")
    .select("*, orders(no_pesanan, customers(nama))")
    .order("created_at", { ascending: false });

  const packingList = (packingRaw ?? []).map((p: any) => {
    const orderRaw = Array.isArray(p.orders) ? p.orders[0] ?? null : p.orders;
    return {
      ...p,
      orders: orderRaw
        ? {
            no_pesanan: orderRaw.no_pesanan,
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
        <h1 className="font-display text-2xl font-bold text-black dark:text-white">Packing</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Packing – siapkan pesanan untuk dikirim ke pelanggan.
        </p>
      </div>

      <PackingTable initialPacking={packingList ?? []} />
    </div>
  );
}
