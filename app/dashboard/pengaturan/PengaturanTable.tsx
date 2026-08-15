"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Pencil, Trash2, Hash, IdCard, ShieldCheck, Calendar, MoreHorizontal } from "lucide-react";
import SortableTh from "@/components/SortableTh";
import TableIconCell from "@/components/TableIconCell";
import { compareValues } from "@/lib/sortUtils";

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  staff: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  user: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

function formatRoleBadge(role: string) {
  const color = ROLE_COLORS[role] ?? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
  return `badge ${color}`;
}

/* Ditarik keluar jadi client component terpisah dari page.tsx (yang server
   component, fetch data langsung lewat await) karena header sortable perlu
   state + onClick di browser -- server component tidak bisa punya useState. */
export default function PengaturanTable({ profiles }: { profiles: Profile[] }) {
  type SortField = "id" | "full_name" | "role" | "created_at";
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sorted = sortField
    ? [...profiles].sort((a, b) => compareValues(a[sortField] ?? "", b[sortField] ?? "", sortDir))
    : profiles;

  return (
    <div className="overflow-x-auto">
      <table className="table-djoker w-full">
        <thead>
          <tr>
            <TableIconCell icon={User} />
            <SortableTh label="ID" icon={Hash} active={sortField === "id"} direction={sortDir} onClick={() => toggleSort("id")} />
            <SortableTh label="Nama Lengkap" icon={IdCard} active={sortField === "full_name"} direction={sortDir} onClick={() => toggleSort("full_name")} center />
            <SortableTh label="Role" icon={ShieldCheck} active={sortField === "role"} direction={sortDir} onClick={() => toggleSort("role")} center />
            <SortableTh label="Dibuat" icon={Calendar} active={sortField === "created_at"} direction={sortDir} onClick={() => toggleSort("created_at")} center />
            <SortableTh label="Aksi" icon={MoreHorizontal} sortable={false} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((profile) => (
            <tr key={profile.id}>
              <td>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/40">
                  <User size={15} className="text-blue-600 dark:text-blue-400" />
                </span>
              </td>
              <td className="font-mono text-xs text-gray-500 dark:text-gray-400">
                {profile.id.split("-")[0]}...
              </td>
              <td className="font-medium text-black dark:text-white text-center">{profile.full_name || "-"}</td>
              <td className="text-center">
                <span className={formatRoleBadge(profile.role)}>{profile.role}</span>
              </td>
              <td className="text-sm text-gray-600 dark:text-gray-400 text-center">
                {new Date(profile.created_at).toLocaleDateString("id-ID")}
              </td>
              <td className="text-right">
                <div className="flex justify-end gap-1.5">
                  <Link
                    href={`/dashboard/pengaturan/edit/${profile.id}`}
                    title="Edit"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Pencil size={15} />
                  </Link>
                  <Link
                    href={`/dashboard/pengaturan/hapus/${profile.id}`}
                    title="Hapus"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 size={15} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-gray-500 dark:text-gray-400 py-6 md:py-8">
                Belum ada data pengguna.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
