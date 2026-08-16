"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Hash, UploadCloud, ImageIcon, X, CheckCircle2, Shirt } from "lucide-react";

export const dynamic = "force-dynamic";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function UploadDesainPage() {
  const [noPesanan, setNoPesanan] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    setFile(f);
    setError(null);
    if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  function handleRemoveFile(e: React.MouseEvent) {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function resetForm() {
    setSuccess(false);
    setFile(null);
    setPreview(null);
    setNoPesanan("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!noPesanan.trim() || !file) {
      setError("Nomor pesanan dan file wajib diisi.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("no_pesanan", noPesanan.trim());
    formData.append("file", file);

    const res = await fetch("/api/public/upload-desain", {
      method: "POST",
      body: formData,
    });

    const result = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(result?.error ?? "Gagal upload desain.");
      return;
    }

    setSuccess(true);
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-[#0f1420] px-4 py-8 md:py-12">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, rgba(147,197,253,0.5) 0%, transparent 45%), radial-gradient(circle at 0% 100%, rgba(165,180,252,0.35) 0%, transparent 45%)",
        }}
      />

      <div className="mx-auto max-w-lg">
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            Login
          </Link>

          <div className="flex gap-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-1 shadow-sm">
            <Link
              href="/tracking"
              className="rounded-full px-3.5 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              Lacak Pesanan
            </Link>
            <span className="rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm">
              Upload Desain
            </span>
          </div>
        </div>

        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              boxShadow: "0 10px 24px -6px rgba(37,99,235,0.5)",
            }}
          >
            <Shirt size={26} className="text-white" />
          </div>
          <span className="mb-3 inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/40 px-3 py-1 text-[10.5px] font-extrabold tracking-widest text-blue-600 dark:text-blue-300">
            DJOGKER SABLON KAOS
          </span>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-black dark:text-white">
            Upload Desain Kaos
          </h1>
          <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] text-gray-500 dark:text-gray-400">
            Kirim file desain untuk pesanan kamu. Format PNG, JPG, WEBP, atau PDF (maks 10MB).
          </p>
        </div>

        <div className="bg-white dark:bg-[#161d2e] rounded-[20px] border border-gray-200 dark:border-gray-700 p-5 shadow-lg">
          {success ? (
            <div className="py-2 text-center">
              <div
                className="mx-auto mb-4 flex h-[74px] w-[74px] items-center justify-center rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(220,252,231,1) 0%, rgba(240,253,244,1) 70%)",
                  boxShadow: "0 0 0 8px rgba(240,253,244,1)",
                }}
              >
                <CheckCircle2 size={34} className="text-green-600" strokeWidth={2.2} />
              </div>
              <p className="text-[17px] font-extrabold text-black dark:text-white">Desain Berhasil Diupload!</p>
              <p className="mx-auto mt-1.5 mb-6 max-w-xs text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                Tim kami akan meninjau desain untuk pesanan{" "}
                <b className="text-gray-800 dark:text-gray-200">{noPesanan}</b>.
              </p>
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/tracking"
                  className="btn-primary block rounded-[13px] py-3 text-center text-[13.5px]"
                >
                  Lacak Status Pesanan
                </Link>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-outline rounded-[13px] py-2.5 text-[13px]"
                >
                  Upload Desain Lain
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Nomor Pesanan
                </label>
                <div className="relative">
                  <Hash size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={noPesanan}
                    onChange={(e) => setNoPesanan(e.target.value)}
                    placeholder="Contoh: DJ00125"
                    className="input-field pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  File Desain
                </label>

                {file ? (
                  <div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50 dark:bg-blue-900/40">
                      {preview ? (
                        <div className="relative h-full w-full">
                          <Image src={preview} alt="Preview" fill className="object-cover" />
                        </div>
                      ) : (
                        <ImageIcon size={22} className="text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-black dark:text-white">{file.name}</p>
                      <p className="mt-0.5 text-[11.5px] text-gray-400 dark:text-gray-500">{formatSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <X size={14} className="text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition-colors ${
                      dragging
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-blue-200 dark:border-gray-600 bg-gradient-to-b from-blue-50/60 to-blue-50/20 dark:from-gray-800/40 dark:to-gray-800/10 hover:border-blue-400"
                    }`}
                  >
                    <div
                      className="mx-auto mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl"
                      style={{
                        background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                        boxShadow: "0 8px 18px -6px rgba(37,99,235,0.45)",
                      }}
                    >
                      <UploadCloud size={24} className="text-white" />
                    </div>
                    <p className="text-sm font-bold text-black dark:text-white">Klik atau tarik file ke sini</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Ukuran maksimal 10MB</p>
                    <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
                      {["PNG", "JPG", "WEBP", "PDF"].map((f) => (
                        <span
                          key={f}
                          className="rounded-full border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 px-2.5 py-1 text-[10.5px] font-bold text-blue-600 dark:text-blue-400"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full rounded-[13px]">
                {loading ? "Mengupload..." : "Upload Desain"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
