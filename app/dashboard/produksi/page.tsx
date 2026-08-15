import { createClient } from "@/lib/supabase/server";
import { Factory } from "lucide-react";
import ProduksiTable, { type ProductionRow } from "./ProduksiTable";
import PageHeaderCard from "@/components/PageHeaderCard";

export default async function ProduksiPage() {
  const supabase = createClient();

  const { data: produksiRaw } = await supabase
    .from("production")
    .select("*, orders(no_pesanan, customers(nama))")
    .order("created_at", { ascending: false });

  // Flatten relasi nested (Supabase mengetik-kan foreign join sebagai array
  // walau sebenarnya cuma 1 row per foreign key).
  const dataProduksi: ProductionRow[] = (produksiRaw ?? []).map((p: any) => {
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

  const totalProduksi = dataProduksi.length;
  const sedangDiproses = dataProduksi.filter(
    (p) => p.status === "Produksi" || p.status === "Sablon"
  ).length;
  const selesai = dataProduksi.filter((p) => p.status === "Selesai").length;

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="PROSES PRODUKSI"
        icon={Factory}
        title="Produksi"
        subtitle="Kelola dan pantau proses produksi pesanan."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="card p-3">
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">Total Produksi</p>
          <p className="mt-1 font-display text-lg font-bold text-black dark:text-white">{totalProduksi}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">
            Sedang Diproses
          </p>
          <p className="mt-1 font-display text-lg font-bold text-black dark:text-white">{sedangDiproses}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] font-semibold tracking-wide text-gray-500 dark:text-gray-400">Selesai</p>
          <p className="mt-1 font-display text-lg font-bold text-black dark:text-white">{selesai}</p>
        </div>
      </div>

      <ProduksiTable initialProductions={dataProduksi} />
    </div>
  );
}
