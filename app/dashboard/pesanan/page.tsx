import { ShoppingCart } from "lucide-react";
import PesananTable from "./PesananTable";
import PageHeaderCard from "@/components/PageHeaderCard";

export default function PesananPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeaderCard
        badge="Transaksi"
        icon={ShoppingCart}
        title="Pesanan"
        subtitle="Kelola daftar pesanan pelanggan."
      />

      <PesananTable />
    </div>
  );
}
