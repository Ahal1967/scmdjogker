"use client";

import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
};

export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string) => {
    const normalized: ConfirmOptions = typeof opts === "string" ? { message: opts } : opts;
    setOptions(normalized);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  function handleClose(result: boolean) {
    resolver?.(result);
    setOptions(null);
    setResolver(null);
  }

  /* createPortal ke document.body -- SEBELUMNYA dialog ini di-render biasa
     di tempat ConfirmDialog dipanggil (ikut posisi ancestor DOM manapun),
     dan itu bikin dialog ini kurungan kalau kepanggil di halaman yang
     Table-nya dibungkus div ".card" (Pengaturan, Laporan, Pelanggan) --
     .card punya backdrop-filter, yang menurut spesifikasi CSS bikin
     ancestor itu jadi "containing block" baru buat descendant
     position:fixed. Akibatnya dialog "fixed inset-0" ini bukan lagi
     fixed ke seluruh layar, tapi ke kotak .card itu doang, lalu kepotong
     overflow-hidden-nya -- user lapor ini di halaman Pengaturan (garis
     biru + form edit yang pecah jadi 3 panel, bukan modal utuh).
     Dengan portal, dialog ini SELALU nempel langsung ke <body>, jadi
     kebal dari ancestor manapun (.card sekarang atau nanti). */
  const ConfirmDialog =
    options &&
    createPortal(
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div
          className="modal-fade-in card card-modal w-full max-w-sm p-0 overflow-hidden shadow-2xl"
          style={{ border: "none" }}
        >
          <div className="p-6 text-center">
            {/* Sebelumnya lingkaran flat (bg-red-100/bg-blue-100) -- diganti
                gradient + glow shadow biar senada sama gaya avatar/ikon
                lain di app ini (mis. avatar bulat di kartu profil
                Pengaturan), bukan warna solid datar. */}
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-white"
              style={{
                background: options.danger
                  ? "linear-gradient(135deg, #f87171, #dc2626)"
                  : "linear-gradient(135deg, #3b82f6, #2563eb)",
                boxShadow: options.danger
                  ? "0 4px 14px rgba(220,38,38,0.35)"
                  : "0 4px 14px rgba(37,99,235,0.35)",
              }}
            >
              <AlertTriangle size={26} />
            </div>
            <h3 className="font-display text-base font-semibold text-black dark:text-white mb-1">
              {options.title || "Konfirmasi"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{options.message}</p>
          </div>
          {/* Sebelumnya 2 tombol rata penuh nempel tanpa jarak (gaya action
              sheet iOS, satu-satunya modal di app ini yang begini) --
              diganti pakai class tombol standar yang sudah dipakai di
              SEMUA modal lain (btn-outline/btn-primary/btn-danger),
              supaya dialog ini akhirnya konsisten, bukan kelihatan beda
              sendiri. */}
          <div className="flex gap-3 border-t border-gray-100 dark:border-[#30363d] p-4">
            <button type="button" onClick={() => handleClose(false)} className="btn-outline flex-1">
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleClose(true)}
              className={options.danger ? "btn-danger flex-1" : "btn-primary flex-1"}
            >
              {options.confirmLabel || "Ya, Lanjutkan"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  return { confirm, ConfirmDialog };
}
