import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import crypto from "crypto";
import { mapWorkbook, MappedProduct } from "@/lib/excel-mapper";

export const maxDuration = 60;

const PUBLISH_BASE = true;
const PUBLISH_PROMO_WEB = true;
const PUBLISH_PROMO_ASESOR = false;
const MIN_PUBLISH_COST = 1;

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const prettyName = (slug: string) =>
  slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

function decidePublished(p: MappedProduct): boolean {
  if (p.supplier_cost < MIN_PUBLISH_COST) return false;
  if (p.role === "promo") {
    const ch = (p.promo_channel || "").toLowerCase();
    return ch.includes("web") ? PUBLISH_PROMO_WEB : PUBLISH_PROMO_ASESOR;
  }
  return PUBLISH_BASE;
}

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

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file || !file.name.endsWith(".xlsx")) return NextResponse.json({ error: "Solo archivos .xlsx" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const { data: dup } = await supabase.from("stock_imports").select("id, created_at").eq("file_hash", fileHash).maybeSingle();
    if (dup) return NextResponse.json({ error: `Este archivo ya se importó el ${new Date(dup.created_at).toLocaleDateString()}` }, { status: 409 });

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const { products, reports } = mapWorkbook(workbook);
    if (products.length === 0) return NextResponse.json({ error: "No se encontraron filas válidas en ninguna hoja" }, { status: 400 });

    const { data: importRecord, error: impErr } = await supabase
      .from("stock_imports")
      .insert({ file_hash: fileHash, file_name: file.name, total_items_processed: products.length, imported_by: user.id })
      .select("id").single();
    if (impErr) throw new Error(impErr.message);

    const slugs = Array.from(new Set(products.map((p) => p.category_slug)));
    await supabase.from("categories").upsert(slugs.map((s) => ({ slug: s, name: prettyName(s) })), { onConflict: "slug" });
    const { data: cats } = await supabase.from("categories").select("id, slug").in("slug", slugs);
    const catMap = new Map((cats || []).map((c) => [c.slug, c.id]));

    const { data: existing } = await supabase.from("products").select("sku").in("sku", products.map((p) => p.sku));
    const existingSet = new Set((existing || []).map((e) => e.sku));

    const payload = products.map((p) => ({
      sku: p.sku,
      name: p.name,
      slug: `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 200)}-${p.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      supplier_cost: p.supplier_cost,
      category_id: catMap.get(p.category_slug) || null,
      stock_status: "in_stock",
      is_published: decidePublished(p),
      specifications: {
        source_sheet: p.source_sheet, role: p.role,
        promo_channel: p.promo_channel || null, promo_comment: p.promo_comment || null,
        brand_line: p.brand_line || null, imported_at: new Date().toISOString(),
      },
      last_import_id: importRecord.id,
    }));

    const errors: { row: number; reason: string }[] = [];
    for (const batch of chunk(payload, 200)) {
      const { error } = await supabase.from("products").upsert(batch, { onConflict: "sku" });
      if (error) errors.push({ row: 0, reason: error.message });
    }

    const published = payload.filter((p) => p.is_published).length;
    await supabase.from("stock_imports").update({
      total_items_created: payload.length - existingSet.size,
      total_items_updated: existingSet.size,
      import_status: errors.length ? "partial_error" : "success",
      error_log: errors,
    }).eq("id", importRecord.id);

    return NextResponse.json({
      success: true, importId: importRecord.id,
      summary: { mapped: payload.length, published, hidden: payload.length - published, created: payload.length - existingSet.size, updated: existingSet.size },
      reports,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}