import { createClient } from "@/lib/supabase/server";
import QcTable from "./QcTable";

export default async function QCPage() {
  const supabase = createClient();

  const [
    { data: pendingRaw, error: pendingError },
    { data: qcRaw, error: qcError },
    { count: qcCount },
    { count: packingCount },
  ] = await Promise.all([
    supabase
      .from("production")
      .select("id, no_produksi, orders(no_pesanan, customers(nama))")
      .eq("status", "QC")
      .order("created_at", { ascending: false }),
    supabase
      .from("quality_control")
      .select("*, production(no_produksi, orders(no_pesanan))")
      .order("created_at", { ascending: false }),
    supabase.from("quality_control").select("*", { count: "exact", head: true }),
    supabase.from("packing").select("*", { count: "exact", head: true }),
  ]);

  if (pendingError) console.error("QC pendingProduction fetch error:", pendingError.message);
  if (qcError) console.error("QC qcRecords fetch error:", qcError.message);

  // Supabase mengembalikan relasi nested sebagai array secara default di level
  // type-nya (walau isinya sebenarnya cuma 1 row karena foreign key one-to-one).
  // Di-flatten manual di sini supaya cocok sama tipe yang QcTable harapkan.
  const pendingProduction = (pendingRaw ?? []).map((p: any) => ({
    id: p.id,
    no_produksi: p.no_produksi,
    orders: Array.isArray(p.orders) ? p.orders[0] ?? null : p.orders,
  })).map((p: any) => ({
    ...p,
    orders: p.orders
      ? {
          no_pesanan: p.orders.no_pesanan,
          customers: Array.isArray(p.orders.customers)
            ? p.orders.customers[0] ?? null
            : p.orders.customers,
        }
      : null,
  }));

  const qcRecords = (qcRaw ?? []).map((r: any) => ({
    ...r,
    production: Array.isArray(r.production) ? r.production[0] ?? null : r.production,
  })).map((r: any) => ({
    ...r,
    production: r.production
      ? {
          no_produksi: r.production.no_produksi,
          orders: Array.isArray(r.production.orders)
            ? r.production.orders[0] ?? null
            : r.production.orders,
        }
      : null,
  }));

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">QUALITY CONTROL</span>
        <h1 className="font-display text-2xl font-bold text-black dark:text-white">QC</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Quality Control – periksa hasil produksi sebelum packing.
        </p>
      </div>

      <QcTable
        pendingProduction={pendingProduction}
        initialRecords={qcRecords}
        nextQcNumber={(qcCount ?? 0) + 1}
        nextPackingNumber={(packingCount ?? 0) + 1}
      />
    </div>
  );
}
