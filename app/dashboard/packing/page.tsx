import { createClient } from "@/lib/supabase/server";
import { PackageCheck } from "lucide-react";
import PackingTable from "./PackingTable";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";

export default async function PackingPage() {
  const supabase = createClient();

  const { data: packingRaw, error: packingError } = await supabase
    .from("packing")
    .select("*, orders(no_pesanan, customers(nama))")
    .order("created_at", { ascending: false });

  if (packingError) console.error("Packing fetch error:", packingError.message);

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
      <PageHeaderCard
        badge="Logistik"
        icon={PackageCheck}
        title="Packing"
        subtitle="Packing – siapkan pesanan untuk dikirim ke pelanggan."
      />

      <FetchErrorBanner message={packingError?.message} />

      <PackingTable initialPacking={packingList ?? []} />
    </div>
  );
}
