"use client";

import { useState, useRef } from "react";
import Image from "next/image";

export const dynamic = "force-dynamic";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 px-4 py-10 md:py-16">
      <div className="mx-auto max-w-xl">
        <div className="rounded-xl border border-blue-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg md:p-8">
          <div className="mb-6 text-center">
            <p className="font-display text-xs font-bold tracking-widest text-blue-600">DJOKER SABLON KAOS</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-black dark:text-white">Upload Desain</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Kirim file desain kaos untuk pesanan kamu. Format PNG, JPG, WEBP, atau PDF (maks 10MB).
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/40">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p className="font-semibold text-black dark:text-white">Desain berhasil diupload!</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Tim kami akan meninjau desain untuk pesanan {noPesanan}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Nomor Pesanan</label>
              <input
                value={noPesanan}
                onChange={(e) => setNoPesanan(e.target.value)}
                placeholder="Contoh: DJ00125"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">File Desain</label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  dragging ? "border-blue-600 bg-blue-50" : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
                }`}
              >
                {preview ? (
                  <div className="relative w-32 h-32 mx-auto rounded-lg overflow-hidden">
                    <Image src={preview} alt="Preview" fill className="object-contain" />
                  </div>
                ) : file ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300">{file.name}</p>
                ) : (
                  <>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                      <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Klik atau drag file desain di sini</p>
                    <p className="text-xs text-gray-400 mt-1">Format: PNG, JPG, WEBP, PDF (Max 10MB)</p>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Mengupload..." : "Pilih File"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs">
          <a href="/tracking" className="text-blue-600 hover:underline font-medium">
            Lacak Status Pesanan Kamu →
          </a>
        </p>
        </div>
      </div>
    </div>
  );
}
