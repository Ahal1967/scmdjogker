"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, type LucideIcon } from "lucide-react";

/* Dropdown select custom -- pengganti <select> native di form (bukan status
   badge, itu urusan StatusDropdown.tsx). Dipicu user lapor <select> role di
   modal "Tambah Pengguna"/"Edit Pengguna" (Pengaturan) muncul sebagai panel
   sistem HP (dark, gaya Android default) waktu diklik di browser mobile --
   itu keterbatasan elemen <select> browser (picker native OS, bukan bisa
   diubah lewat CSS sama sekali), sama persis alasan StatusDropdown.tsx
   dibuat dulu buat kolom status di Pesanan/Produksi.

   Komponen ini pakai mekanisme portal + hitung posisi manual YANG SAMA
   dengan StatusDropdown.tsx (supaya tidak kepotong overflow-hidden milik
   .card/.card-modal yang membungkus form), tapi TRIGGER-nya beda: bukan
   pill badge berwarna, melainkan kotak input biasa (".input-field") biar
   konsisten sama field lain di form yang sama (Nama Lengkap, Email,
   Password) -- ini yang dimaksud user "desainnya samakan seperti bagian
   lain". Panel pilihannya reuse class CSS .status-dd-panel/-option/-icon/
   -label/-check yang sudah ada (class-nya memang generik, tidak terikat
   nama status tertentu), cuma trigger .select-dd-trigger yang baru. */

export type SelectOption = {
  value: string;
  label: string;
  icon?: LucideIcon;
};

export default function SelectDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  disabled,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function computePosition() {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estPanelHeight = Math.min(options.length * 44 + 16, 320);

    const spaceBelow = window.innerHeight - rect.bottom;
    let openUp = false;
    let top = rect.bottom + 6;
    if (spaceBelow < estPanelHeight && rect.top > estPanelHeight) {
      openUp = true;
      top = rect.top - 6;
    }

    // Panel selebar trigger-nya sendiri (bukan lebar tetap 208px seperti
    // StatusDropdown) -- di sini trigger-nya "input-field w-full" yang
    // ukurannya menyesuaikan lebar form, jadi panelnya ikut menyesuaikan
    // juga supaya kelihatan menyatu, bukan lebih sempit/lebar sendiri.
    setPos({ top, left: rect.left, width: rect.width, openUp });
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

  function handleSelect(v: string) {
    setOpen(false);
    if (v !== value) onChange(v);
  }

  const current = options.find((o) => o.value === value);
  const CurrentIcon = current?.icon;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className="input-field select-dd-trigger"
        aria-label={ariaLabel ?? `Pilih: ${current?.label ?? value}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="select-dd-trigger-label">
          {CurrentIcon && <CurrentIcon size={15} className="select-dd-trigger-icon" />}
          {current?.label ?? value}
        </span>
        <ChevronDown size={14} className={`status-chevron${open ? " status-chevron-open" : ""}`} />
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-label={ariaLabel ?? "Pilih opsi"}
            className="status-dd-panel"
            style={{
              position: "fixed",
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp ? window.innerHeight - pos.top : undefined,
              left: pos.left,
              width: pos.width,
            }}
          >
            {options.map((o) => {
              const Icon = o.icon;
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(o.value)}
                  className={`status-dd-option${active ? " status-dd-option-active" : ""}`}
                >
                  {Icon && (
                    <span className="status-dd-icon">
                      <Icon size={14} />
                    </span>
                  )}
                  <span className="status-dd-label">{o.label}</span>
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
