"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Check,
  ClipboardList,
  Factory,
  ShieldCheck,
  Package,
  Truck,
  CheckCircle2,
  Tag,
  type LucideIcon,
} from "lucide-react";

/* Dropdown status custom -- pengganti trik "<select> native transparan
   ditumpuk di atas badge" yang dipakai sebelumnya di PesananTable.tsx dan
   ProduksiTable.tsx. Trik lama itu TIDAK BISA dikasih ikon/checkmark/panel
   kartu (keterbatasan elemen <select> browser, bukan soal CSS), makanya
   diganti komponen ini supaya bisa persis seperti desain referensi user.

   CUMA dipakai di 2 tabel itu -- keduanya memang SUDAH bisa diklik-ubah
   statusnya sebelum ini. Tabel lain (Laporan, Pengiriman, Packing, Gudang,
   Supplier, QC) statusnya tetap badge read-only seperti sekarang, TIDAK
   disentuh komponen ini, supaya alur/validasi yang sudah ada di sana
   (misal cascade Packing -> Orders, gate "Diproses" di Pengiriman, status
   Gudang yang terikat ke perbandingan stok) tidak ikut berubah.

   Logika update status (updateStatus di tiap tabel) SAMA SEKALI TIDAK
   diubah -- komponen ini cuma ganti cara MENAMPILKAN & MEMILIH status,
   pemanggil tetap yang menentukan apa yang terjadi lewat prop onChange. */

const STATUS_ICONS: Record<string, LucideIcon> = {
  Pesanan: ClipboardList,
  Produksi: Factory,
  QC: ShieldCheck,
  Packing: Package,
  Dikirim: Truck,
  Selesai: CheckCircle2,
};

export default function StatusDropdown({
  value,
  options,
  colorClasses,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: readonly string[];
  // Sama persis dengan STATUS_COLORS yang sudah ada di tiap tabel --
  // dikirim dari pemanggil supaya warna per status TIDAK berubah/tidak
  // perlu didefinisikan dobel di sini.
  colorClasses: Record<string, string>;
  onChange: (status: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function computePosition() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelWidth = 208;
    const estPanelHeight = Math.min(options.length * 44 + 16, 320);

    // Panel disejajarkan ke TITIK TENGAH trigger-nya, bukan ke sisi kiri
    // trigger -- sebelum ini "left = rect.left" bikin sisi kiri panel
    // nempel pas di sisi kiri pill, sementara panel jauh lebih lebar
    // (208px) daripada pill-nya sendiri (~120px), jadi keliatan nyorong
    // ke kanan/tidak center. Sekarang titik tengah panel disamakan sama
    // titik tengah pill, baru diclamp ke tepi layar kalau kepotong.
    let left = rect.left + rect.width / 2 - panelWidth / 2;
    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - panelWidth - 8;
    }
    if (left < 8) left = 8;

    const spaceBelow = window.innerHeight - rect.bottom;
    let openUp = false;
    let top = rect.bottom + 6;
    if (spaceBelow < estPanelHeight && rect.top > estPanelHeight) {
      openUp = true;
      top = rect.top - 6;
    }

    setPos({ top, left, openUp });
  }

  function toggleOpen() {
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
    // Scroll/resize bisa bikin posisi panel tidak sinkron lagi sama
    // trigger-nya -- daripada recompute terus-menerus (mahal + rawan
    // jitter), lebih aman ditutup saja, sama seperti perilaku dropdown
    // native browser waktu halaman di-scroll.
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
    };
  }, [open]);

  function handleSelect(status: string) {
    setOpen(false);
    if (status !== value) onChange(status);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={`badge relative ${colorClasses[value] ?? ""}`}
        aria-label={ariaLabel ?? `Ubah status: ${value}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="status-dot" />
        {value}
        <ChevronDown size={12} className={`status-chevron${open ? " status-chevron-open" : ""}`} />
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-label={ariaLabel ?? "Pilih status"}
            className="status-dd-panel"
            style={{
              position: "fixed",
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
              left: pos.left,
            }}
          >
            {options.map((s) => {
              const Icon = STATUS_ICONS[s] ?? Tag;
              const active = s === value;
              return (
                <button
                  key={s}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(s)}
                  className={`status-dd-option${active ? " status-dd-option-active" : ""}`}
                >
                  <span className="status-dd-icon">
                    <Icon size={14} />
                  </span>
                  <span className="status-dd-label">{s}</span>
                  {active && <Check size={15} className="status-dd-check" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
