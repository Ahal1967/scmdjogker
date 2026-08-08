import { createClient } from "@/lib/supabase/server";
import QcTable from "./QcTable";

export default async function QCPage() {
  const supabase = createClient();

  const [{ data: pendingProduction }, { data: qcRecords }, { count: qcCount }, { count: packingCount }] =
    await Promise.all([
      supabase
        .from("production")
        .select("id, no_produksi, orders(no_pesanan, customers(nama))")
        .eq("status", "QC")
        .order("updated_at", { ascending: false }),
      supabase
        .from("quality_control")
        .select("*, production(no_produksi, orders(no_pesanan))")
        .order("created_at", { ascending: false }),
      supabase.from("quality_control").select("*", { count: "exact", head: true }),
      supabase.from("packing").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">QC</h1>
        <p className="mt-1 text-sm text-gray-600">
          Quality Control – periksa hasil produksi sebelum packing.
        </p>
      </div>

      <QcTable
        pendingProduction={pendingProduction ?? []}
        initialRecords={qcRecords ?? []}
        nextQcNumber={(qcCount ?? 0) + 1}
        nextPackingNumber={(packingCount ?? 0) + 1}
      />
    </div>
  );
}
