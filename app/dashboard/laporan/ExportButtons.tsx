"use client";

import { FileSpreadsheet, FileText } from "lucide-react";

type Order = {
  no_pesanan: string | null;
  tanggal: string | null;
  total: number | null;
  dp: number | null;
  sisa_pembayaran: number | null;
  status: string | null;
  alamat_pengiriman: string | null;
  created_at: string | null;
};

function formatTanggalExport(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ExportButtons({ orders }: { orders: Order[] }) {
  async function handleExportExcel() {
    const XLSX = await import("xlsx");

    const rows = orders.map((o) => ({
      "No. Pesanan": o.no_pesanan || "-",
      Tanggal: formatTanggalExport(o.tanggal || o.created_at),
      Total: Number(o.total) || 0,
      DP: Number(o.dp) || 0,
      Sisa: Number(o.sisa_pembayaran) || 0,
      Status: o.status || "-",
      Alamat: o.alamat_pengiriman || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 30 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pesanan");

    const tanggalFile = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `laporan-pesanan-${tanggalFile}.xlsx`);
  }

  async function handleExportPdf() {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(14);
    doc.text("Laporan Pesanan — DJOGKER Sablon Kaos", 14, 15);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [["No. Pesanan", "Tanggal", "Total", "DP", "Sisa", "Status", "Alamat"]],
      body: orders.map((o) => [
        o.no_pesanan || "-",
        formatTanggalExport(o.tanggal || o.created_at),
        `Rp ${(Number(o.total) || 0).toLocaleString("id-ID")}`,
        `Rp ${(Number(o.dp) || 0).toLocaleString("id-ID")}`,
        `Rp ${(Number(o.sisa_pembayaran) || 0).toLocaleString("id-ID")}`,
        o.status || "-",
        o.alamat_pengiriman || "-",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    const tanggalFile = new Date().toISOString().slice(0, 10);
    doc.save(`laporan-pesanan-${tanggalFile}.pdf`);
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExportExcel}
        className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 px-3 py-2 text-xs font-semibold text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
      >
        <FileSpreadsheet size={14} />
        Excel
      </button>
      <button
        onClick={handleExportPdf}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
      >
        <FileText size={14} />
        PDF
      </button>
    </div>
  );
}
