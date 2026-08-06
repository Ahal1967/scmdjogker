"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [name, setName] = useState("Administrator");

  return (
    <div className="mx-auto max-w-xl space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-black md:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Atur preferensi dan konfigurasi sistem.
        </p>
      </div>

      {/* Card Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
        <div className="space-y-4">
          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none focus:border-blue-600 md:text-base"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 md:w-auto">
              Save changes
            </button>
            <button className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 md:w-auto">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Card: Profile & Role (opsional, kalau kamu tampilkan di sini) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
        <h2 className="text-base font-semibold text-black md:text-lg">Account</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">Profile Anda</p>
              <p className="text-xs text-gray-600">Lihat dan edit informasi profil</p>
            </div>
            <button className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-blue-700">
              Lihat Profil
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">Role</p>
              <p className="text-xs text-gray-600">Admin</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              Administrator
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}