import { createClient } from "@/lib/supabase/server";
import SupplierTable from "./SupplierTable";

export default async function SupplierPage() {
  const supabase = createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          MASTER DATA
        </span>
        <h1 className="font-display text-2xl font-bold text-black dark:text-white">Supplier</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Kelola daftar pemasok bahan baku.</p>
      </div>

      <SupplierTable initialSuppliers={suppliers ?? []} />
    </div>
  );
}
