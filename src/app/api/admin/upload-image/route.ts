import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";

const BUCKET = "product-images";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
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

async function storeBuffer(supabase: any, path: string, buf: Buffer, contentType: string) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl as string;
}

async function downloadImage(url: string): Promise<{ buf: Buffer; contentType: string }> {
  if (!/^https:\/\//i.test(url)) throw new Error("La URL debe empezar con https://");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RGTechBot/1.0)" },
    });
    if (!res.ok) throw new Error(`El sitio respondió ${res.status} (puede bloquear descargas automáticas)`);
    const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) throw new Error("La imagen supera 2 MB");
    if (!EXT_BY_TYPE[contentType]) throw new Error("Formato no soportado (solo JPG, PNG o WEBP)");
    return { buf, contentType };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, ok } = await getAdmin();
    if (!ok) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

    const fd = await req.formData();
    const mode = (fd.get("mode") as string) || "file";
    const target = (fd.get("target") as string) || "product";

    let buf: Buffer;
    let contentType: string;
    if (mode === "url") {
      const dl = await downloadImage(String(fd.get("url") || ""));
      buf = dl.buf;
      contentType = dl.contentType;
    } else {
      const file = fd.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
      if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Solo JPG, PNG o WEBP" }, { status: 400 });
      if (file.size > MAX_BYTES) return NextResponse.json({ error: "Máximo 2 MB" }, { status: 400 });
      buf = Buffer.from(await file.arrayBuffer());
      contentType = file.type;
    }
    const ext = EXT_BY_TYPE[contentType];

    if (target === "category") {
      const categoryId = String(fd.get("category_id") || "");
      const { data: cat } = await supabase.from("categories").select("id, slug").eq("id", categoryId).single();
      if (!cat) return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
      const path = `categories/${cat.slug}-${Date.now()}.${ext}`;
      const publicUrl = await storeBuffer(supabase, path, buf, contentType);
      await supabase.from("categories").update({ default_image_url: publicUrl }).eq("id", categoryId);
      return NextResponse.json({ success: true, url: publicUrl });
    }

    const productId = String(fd.get("product_id") || "");
    const { data: product } = await supabase.from("products").select("id, sku, image_urls").eq("id", productId).single();
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    const path = `${product.sku}/${mode === "url" ? "web-" : ""}${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const publicUrl = await storeBuffer(supabase, path, buf, contentType);
    const newUrls = [...(product.image_urls || []), publicUrl];
    await supabase.from("products").update({ image_urls: newUrls }).eq("id", productId);
    return NextResponse.json({ success: true, url: publicUrl, image_urls: newUrls });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, ok } = await getAdmin();
    if (!ok) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

    const { product_id, url } = await req.json();
    if (!product_id || !url) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    const path = url.split(`/object/public/${BUCKET}/`)[1];
    if (path) await supabase.storage.from(BUCKET).remove([path]);

    const { data: product } = await supabase.from("products").select("image_urls").eq("id", product_id).single();
    const newUrls = (product?.image_urls || []).filter((u: string) => u !== url);
    await supabase.from("products").update({ image_urls: newUrls }).eq("id", product_id);

    return NextResponse.json({ success: true, image_urls: newUrls });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}
