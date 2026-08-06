import { createClient } from "@/lib/supabase/server";
import ProduksiTable from "./ProduksiTable";

export default async function ProduksiPage() {
  const supabase = createClient();

  const { data: produksis } = await supabase
    .from("production")
    .select("*, orders(no_pesanan, customers(nama))")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Produksi</h1>
        <p className="mt-1 text-sm text-gray-600">Kelola dan pantau proses produksi pesanan.</p>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Produksi</p>
          <p className="mt-1 font-display text-3xl font-bold text-black">{produksis?.length ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Sedang Diproses</p>
          <p className="mt-1 font-display text-3xl font-bold text-black">
            {produksis?.filter((p: any) => p.status === "Produksi" || p.status === "Sablon").length ?? 0}
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Selesai</p>
          <p className="mt-1 font-display text-3xl font-bold text-black">
            {produksis?.filter((p: any) => p.status === "Selesai").length ?? 0}
          </p>
        </div>
      </div>

      {/* Tabel */}
      <ProduksiTable initialProductions={produksis || []} />
    </div>
  );
}