import { createClient } from "@/lib/supabase/server";
import ProduksiTable, { type ProductionRow } from "./ProduksiTable";

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
      <div>
        <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">PROSES PRODUKSI</span>
        <h1 className="font-display text-2xl font-bold text-black">Produksi</h1>
        <p className="mt-1 text-sm text-gray-600">
          Kelola dan pantau proses produksi pesanan.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Produksi</p>
          <p className="mt-1 font-display text-3xl font-bold text-black">{totalProduksi}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Sedang Diproses
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-black">{sedangDiproses}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Selesai</p>
          <p className="mt-1 font-display text-3xl font-bold text-black">{selesai}</p>
        </div>
      </div>

      <ProduksiTable initialProductions={dataProduksi} />
    </div>
  );
}
