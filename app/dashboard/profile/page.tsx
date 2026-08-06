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
    return <div className="p-6 text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 md:space-y-6">
      <h1 className="font-display text-xl font-bold text-black md:text-2xl">Profile</h1>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600">Email</label>
            <div className="mt-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black md:text-base">
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