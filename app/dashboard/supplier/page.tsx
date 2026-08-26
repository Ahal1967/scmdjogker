import { createClient } from "@/lib/supabase/server";
import { Truck } from "lucide-react";
import SupplierTable from "./SupplierTable";
import PageHeaderCard from "@/components/PageHeaderCard";
import FetchErrorBanner from "@/components/FetchErrorBanner";

export default async function SupplierPage() {
  const supabase = createClient();
  const { data: suppliers, error: suppliersError } = await supabase
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false });

  if (suppliersError) console.error("Supplier fetch error:", suppliersError.message);

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="Master Data"
        icon={Truck}
        title="Supplier"
        subtitle="Kelola daftar pemasok bahan baku."
      />

      <FetchErrorBanner message={suppliersError?.message} />

      <SupplierTable initialSuppliers={suppliers ?? []} />
    </div>
  );
}
