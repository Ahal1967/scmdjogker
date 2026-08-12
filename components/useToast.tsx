"use client";

import { useState, useCallback, useRef } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type ToastType = "error" | "success";
type ToastState = { message: string; type: ToastType } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), 6000);
  }, []);

  function close() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }

  const ToastBanner = toast ? (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4">
      <div
        className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur ${
          toast.type === "error"
            ? "bg-red-50/95 dark:bg-red-900/90 border-red-200 dark:border-red-800"
            : "bg-green-50/95 dark:bg-green-900/90 border-green-200 dark:border-green-800"
        }`}
      >
        {toast.type === "error" ? (
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600 dark:text-red-300" />
        ) : (
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600 dark:text-green-300" />
        )}
        <p
          className={`flex-1 text-sm ${
            toast.type === "error" ? "text-red-700 dark:text-red-200" : "text-green-700 dark:text-green-200"
          }`}
        >
          {toast.message}
        </p>
        <button
          onClick={close}
          className={toast.type === "error" ? "text-red-400 hover:text-red-600" : "text-green-400 hover:text-green-600"}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  ) : null;

  return { showToast, ToastBanner };
}
