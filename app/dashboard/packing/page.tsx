import { createClient } from "@/lib/supabase/server";
import PackingTable from "./PackingTable";

export default async function PackingPage() {
  const supabase = createClient();

  const { data: packingList } = await supabase
    .from("packing")
    .select("*, orders(no_pesanan, customers(nama))")
    .order("created_at", { ascending: false });

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
