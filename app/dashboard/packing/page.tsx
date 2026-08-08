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
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Packing</h1>
        <p className="mt-1 text-sm text-gray-600">
          Packing – siapkan pesanan untuk dikirim ke pelanggan.
        </p>
      </div>

      <PackingTable initialPacking={packingList ?? []} />
    </div>
  );
}
