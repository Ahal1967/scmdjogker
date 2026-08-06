import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient();

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "ID produksi wajib diisi" }, { status: 400 });
  }

  const { error } = await supabase.from("production").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}