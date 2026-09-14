import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

    const { data: cats } = await supabase
      .from("categories")
      .select("id, default_image_url")
      .not("default_image_url", "is", null);

    let updated = 0;
    for (const c of cats || []) {
      const { data, error } = await supabase
        .from("products")
        .update({ image_urls: [c.default_image_url] })
        .eq("category_id", c.id)
        .or("image_urls.is.null,image_urls.eq.{}")
        .select("id");
      if (!error && data) updated += data.length;
    }

    return NextResponse.json({ success: true, updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}
