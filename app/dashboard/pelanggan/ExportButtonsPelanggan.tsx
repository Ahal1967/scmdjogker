"use client";

import { FileSpreadsheet, FileText } from "lucide-react";

type Pelanggan = {
  id: string;
  nama: string;
  no_telepon: string | null;
  totalPesanan: number;
  totalBelanja: number;
};

export default function ExportButtonsPelanggan({ dataPelanggan }: { dataPelanggan: Pelanggan[] }) {
  async function handleExportExcel() {
    const XLSX = await import("xlsx");

    const rows = dataPelanggan.map((c) => ({
      "Nama Pelanggan": c.nama,
      "No. Telepon": c.no_telepon || "-",
      "Total Pesanan": c.totalPesanan,
      "Total Belanja Diterima": c.totalBelanja,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 20 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Pelanggan");

    const tanggalFile = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `daftar-pelanggan-${tanggalFile}.xlsx`);
  }

  async function handleExportPdf() {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("Daftar Pelanggan — DJOGKER Sablon Kaos", 14, 15);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [["Nama Pelanggan", "No. Telepon", "Total Pesanan", "Total Belanja Diterima"]],
      body: dataPelanggan.map((c) => [
        c.nama,
        c.no_telepon || "-",
        `${c.totalPesanan} pesanan`,
        `Rp ${c.totalBelanja.toLocaleString("id-ID")}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    const tanggalFile = new Date().toISOString().slice(0, 10);
    doc.save(`daftar-pelanggan-${tanggalFile}.pdf`);
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
