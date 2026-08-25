import { createClient } from "@/lib/supabase/server";
import { Send } from "lucide-react";
import PengirimanTable from "./PengirimanTable";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";

export default async function PengirimanPage() {
  const supabase = createClient();

  const { data: shipmentsRaw, error: shipmentsError } = await supabase
    .from("shipments")
    .select("*, orders(no_pesanan, alamat_pengiriman, customers(nama))")
    .order("created_at", { ascending: false });

  if (shipmentsError) console.error("Pengiriman fetch error:", shipmentsError.message);

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
      <PageHeaderCard
        badge="LOGISTIK"
        icon={Send}
        title="Pengiriman"
        subtitle="Pantau dan kelola pesanan yang sedang dikirim ke pelanggan."
      />

      <FetchErrorBanner message={shipmentsError?.message} />

      <PengirimanTable initialShipments={shipments ?? []} />
    </div>
  );
}
