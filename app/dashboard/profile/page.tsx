"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setEmail(data.user.email ?? null);
      setLoading(false);
    }
    getUser();
  }, [router, supabase.auth]);

  if (loading) {
    return <div className="p-6 text-gray-500 dark:text-gray-400">Loading profile...</div>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 md:space-y-6">
      <div>
        <span className="mb-2 inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
          AKUN SAYA
        </span>
        <h1 className="font-display text-2xl font-bold text-black dark:text-white">Profile</h1>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6" style={{ borderLeft: "1px solid #3b82f6" }}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400">Email</label>
            <div className="mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-black dark:text-white md:text-base">
              {email ?? "-"}
            </div>
          </div>

          <div className="pt-2">
            <button
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 md:w-auto"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
