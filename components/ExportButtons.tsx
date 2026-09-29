"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";

export type ExportColumn<T> = { header: string; value: (row: T) => string | number };

/* Tombol export generik -- dipakai ulang di semua modul yang punya tabel
   data, menggantikan kode yang sebelumnya duplikat sendiri-sendiri per
   modul.

   REVISI: awalnya (v1) ini 2 tombol berdampingan (Excel + PDF sekaligus
   kelihatan), tapi itu salah paham dari maksud user -- yang diminta cuma
   1 tombol "Export", baru kalau DIKLIK muncul pilihan format (Excel/PDF)
   dalam panel dropdown, senada pola trigger+panel yang sudah ada di
   SelectDropdown.tsx/StatusDropdown.tsx (portal + hitung posisi manual
   biar tidak kepotong overflow-hidden milik .card, dismiss on outside
   click/Escape/scroll). Panelnya reuse class CSS .status-dd-panel/
   -option/-icon/-label yang sudah ada, sengaja tidak bikin class baru.

   "columns" nentuin urutan & isi kolom buat DUA format sekaligus dari 1
   definisi -- value() dipanggil per baris data MENTAH (row asli dari
   state tabel, sebelum diformat ke tampilan), jadi bebas ambil field
   nested (mis. row.orders?.customers?.nama). */
export default function ExportButtons<T>({
  data,
  filename,
  sheetName,
  pdfTitle,
  columns,
  orientation = "portrait",
}: {
  data: T[];
  filename: string;
  sheetName: string;
  pdfTitle: string;
  columns: ExportColumn<T>[];
  orientation?: "portrait" | "landscape";
}) {
  const disabled = data.length === 0;
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function computePosition() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estPanelHeight = 100;

    const spaceBelow = window.innerHeight - rect.bottom;
    let openUp = false;
    let top = rect.bottom + 6;
    if (spaceBelow < estPanelHeight && rect.top > estPanelHeight) {
      openUp = true;
      top = rect.top - 6;
    }

    setPos({ top, left: rect.right - 180, openUp });
  }

  function toggleOpen() {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    computePosition();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleDismiss() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
    };
  }, [open]);

  async function handleExportExcel() {
    setOpen(false);
    const XLSX = await import("xlsx");

    const rows = data.map((row) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((c) => {
        obj[c.header] = c.value(row);
      });
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const tanggalFile = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${filename}-${tanggalFile}.xlsx`);
  }

  async function handleExportPdf() {
    setOpen(false);
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation });

    doc.setFontSize(14);
    doc.text(`${pdfTitle} — DJOGKER Sablon Kaos`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Dicetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [columns.map((c) => c.header)],
      body: data.map((row) => columns.map((c) => String(c.value(row)))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    const tanggalFile = new Date().toISOString().slice(0, 10);
    doc.save(`${filename}-${tanggalFile}.pdf`);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-[#21262d] disabled:cursor-not-allowed disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        <Download size={13} />
        Export
        <ChevronDown size={14} className={`status-chevron${open ? " status-chevron-open" : ""}`} />
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            aria-label="Pilih format export"
            className={`status-dd-panel${pos.openUp ? " status-dd-panel-openup" : ""}`}
            style={{
              position: "fixed",
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
              left: pos.left,
              width: 180,
            }}
          >
            <button type="button" role="menuitem" onClick={handleExportExcel} className="status-dd-option">
              <span className="status-dd-icon">
                <FileSpreadsheet size={14} />
              </span>
              <span className="status-dd-label">Excel</span>
            </button>
            <button type="button" role="menuitem" onClick={handleExportPdf} className="status-dd-option">
              <span className="status-dd-icon">
                <FileText size={14} />
              </span>
              <span className="status-dd-label">PDF</span>
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
