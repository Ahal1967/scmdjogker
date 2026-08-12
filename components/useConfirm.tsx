"use client";

import { useState, useCallback } from "react";
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

  const ConfirmDialog = options ? (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div
        className="card w-full max-w-sm p-0 overflow-hidden"
        style={{ border: "none" }}
      >
        <div className="p-6 text-center">
          <div
            className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
              options.danger ? "bg-red-100 dark:bg-red-900/40" : "bg-blue-100 dark:bg-blue-900/40"
            }`}
          >
            <AlertTriangle
              size={26}
              className={options.danger ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}
            />
          </div>
          <h3 className="text-base font-semibold text-black dark:text-white mb-1">
            {options.title || "Konfirmasi"}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{options.message}</p>
        </div>
        <div className="flex border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => handleClose(false)}
            className="flex-1 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => handleClose(true)}
            className={`flex-1 py-3 text-sm font-semibold text-white transition-colors ${
              options.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {options.confirmLabel || "Ya, Lanjutkan"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
