import { createClient } from "@/lib/supabase/server";
import { Truck } from "lucide-react";
import SupplierTable from "./SupplierTable";
import PageHeaderCard from "@/components/PageHeaderCard";

export default async function SupplierPage() {
  const supabase = createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="MASTER DATA"
        icon={Truck}
        title="Supplier"
        subtitle="Kelola daftar pemasok bahan baku."
      />

      <SupplierTable initialSuppliers={suppliers ?? []} />
    </div>
  );
}
