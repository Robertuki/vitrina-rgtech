import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";
import { buildImageQuery, googleImageSearch } from "@/lib/image-search";

export const maxDuration = 60;
const BUCKET = "product-images";
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function getAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, ok: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, ok: profile?.role === "admin" };
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, ok } = await getAdmin();
    if (!ok) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

    const key = process.env.GOOGLE_CSE_API_KEY;
    const cx = process.env.GOOGLE_CSE_CX;
    if (!key || !cx) {
      return NextResponse.json({ error: "Faltan GOOGLE_CSE_API_KEY o GOOGLE_CSE_CX en las variables de entorno" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const batch = Math.min(Number(body.batch) || 25, 50);

    const { data: candidates, error } = await supabase
      .from("products")
      .select("id, sku, name, image_urls, specifications")
      .eq("is_published", true)
      .or("image_urls.is.null,image_urls.eq.{}")
      .order("name", { ascending: true })
      .limit(batch * 3);
    if (error) throw new Error(error.message);

    let processed = 0, saved = 0, notFound = 0, failed = 0;
    let quotaExceeded = false;

    for (const p of candidates || []) {
      if (processed >= batch) break;
      const specs = (p.specifications || {}) as Record<string, any>;
      if (specs.image_search === "not_found" || specs.image_search === "auto") continue;
      processed++;

      const q = buildImageQuery(p.name, p.sku);
      let results: { link: string; mime: string }[] = [];
      try {
        results = await googleImageSearch(q, key, cx);
      } catch (e: any) {
        if (e.quota) { quotaExceeded = true; processed--; break; }
        failed++;
        continue;
      }

      if (!results.length) {
        notFound++;
        await supabase.from("products")
          .update({ specifications: { ...specs, image_search: "not_found", image_query: q } })
          .eq("id", p.id);
        continue;
      }

      let stored: string | null = null;
      for (const r of results.slice(0, 3)) {
        try {
          const img = await fetch(r.link, { signal: AbortSignal.timeout(10000) });
          if (!img.ok) continue;
          const ctype = (img.headers.get("content-type") || r.mime || "").split(";")[0].trim();
          const ext = EXT[ctype];
          if (!ext) continue;
          const buf = Buffer.from(await img.arrayBuffer());
          if (buf.byteLength > 2 * 1024 * 1024 || buf.byteLength < 2000) continue;
          const path = `${p.sku}/auto-${Date.now()}-${crypto.randomUUID().slice(0, 6)}.${ext}`;
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: ctype });
          if (upErr) continue;
          stored = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
          break;
        } catch {
          continue;
        }
      }

      if (stored) {
        saved++;
        await supabase.from("products")
          .update({ image_urls: [stored], specifications: { ...specs, image_search: "auto", image_query: q } })
          .eq("id", p.id);
      } else {
        notFound++;
        await supabase.from("products")
          .update({ specifications: { ...specs, image_search: "not_found", image_query: q } })
          .eq("id", p.id);
      }

      await new Promise((r) => setTimeout(r, 250));
    }

    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .or("image_urls.is.null,image_urls.eq.{}");

    return NextResponse.json({ success: true, processed, saved, notFound, failed, quotaExceeded, remaining: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}
