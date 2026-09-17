import { NextRequest, NextResponse } from "next/server";
import { buildImageQuery } from "@/lib/product-etl";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crypto from "crypto";
import {
  searchProductImageWithGoogle,
  findAndDownloadProductImage,
} from "@/lib/google-image-search";

const BUCKET = "product-images";
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return { supabase, ok: profile?.role === "admin" };
}

async function downloadAndStoreImage(
  supabase: any,
  imageUrl: string,
  productSku: string
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!res.ok) {
      console.warn(`⚠️ No se pudo descargar: ${imageUrl} (${res.status})`);
      return null;
    }

    const contentType = (res.headers.get("content-type") || "")
      .split(";")[0]
      .trim();
    const validTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!validTypes.includes(contentType)) {
      console.warn(`⚠️ Tipo no válido: ${contentType}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const maxSize = 2 * 1024 * 1024; // 2 MB

    if (buffer.byteLength > maxSize) {
      console.warn(`⚠️ Imagen muy grande: ${buffer.byteLength} bytes`);
      return null;
    }

    const ext = EXT_BY_TYPE[contentType];
    const storagePath = `${productSku}/google-${Date.now()}-${crypto
      .randomUUID()
      .slice(0, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType });

    if (error) {
      console.error(`❌ Error guardando en Storage:`, error);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return (data as any).publicUrl;
  } catch (error) {
    console.error(`❌ Error descargando imagen:`, error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, ok } = await getAdmin();
    if (!ok)
      return NextResponse.json(
        { error: "Solo administradores" },
        { status: 403 }
      );

    const { product_ids } = await req.json();

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        { error: "Falta product_ids (array)" },
        { status: 400 }
      );
    }

    const results: {
      success: number;
      failed: number;
      details: {
        product_id: string;
        sku: string;
        name: string;
        status: string;
        imageUrl?: string;
      }[];
    } = { success: 0, failed: 0, details: [] };

    console.log(`⏳ Procesando ${product_ids.length} productos...`);

    for (const productId of product_ids) {
      try {
        const { data: product } = await supabase
          .from("products")
          .select("id, sku, name, image_urls, image_query")
          .eq("id", productId)
          .single();

        if (!product) {
          results.details.push({
            product_id: productId,
            sku: "?",
            name: "?",
            status: "Producto no encontrado",
          });
          results.failed++;
          continue;
        }

        // ¿Ya tiene imágenes?
        if (product.image_urls && product.image_urls.length > 0) {
          results.details.push({
            product_id: productId,
            sku: product.sku,
            name: product.name,
            status: "Ya tiene imágenes",
          });
          continue;
        }

        // BÚSQUEDA: SKU + Nombre
        console.log(`🔍 Buscando imagen para: ${product.sku} ${product.name}`);
                const baseQuery = product.image_query || `${product.sku} ${product.name}`;
        const imageUrls = await searchProductImageWithGoogle(baseQuery, 5);
        // ETL perezoso: persiste la consulta limpia linkeada al SKU
        if (!product.image_query) {
          await supabase
            .from("products")
            .update({ image_query: buildImageQuery(product.name, product.sku) })
            .eq("id", product.id);
        }

        if (imageUrls.length === 0) {
          results.details.push({
            product_id: productId,
            sku: product.sku,
            name: product.name,
            status: "No se encontraron imágenes",
          });
          results.failed++;
          continue;
        }

        // Intentar descargar primera imagen válida
        let downloaded = false;
        for (const imageUrl of imageUrls) {
          const publicUrl = await downloadAndStoreImage(
            supabase,
            imageUrl,
            product.sku
          );

          if (publicUrl) {
            // Guardar en BD
            const newUrls = [publicUrl];
            await supabase
              .from("products")
              .update({ image_urls: newUrls })
              .eq("id", productId);

            results.details.push({
              product_id: productId,
              sku: product.sku,
              name: product.name,
              status: "✅ Imagen descargada",
              imageUrl: publicUrl,
            });
            results.success++;
            downloaded = true;
            break;
          }
        }

        if (!downloaded) {
          results.details.push({
            product_id: productId,
            sku: product.sku,
            name: product.name,
            status: "Ninguna imagen se descargó correctamente",
          });
          results.failed++;
        }
      } catch (e) {
        results.details.push({
          product_id: productId,
          sku: "?",
          name: "?",
          status: `❌ Error: ${(e as any).message}`,
        });
        results.failed++;
      }
    }

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (e) {
    console.error("Error en search-images-google:", e);
    return NextResponse.json(
      { error: (e as any).message || "Error interno" },
      { status: 500 }
    );
  }
}
