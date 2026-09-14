import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Package, CheckCircle2, XCircle, MessageCircle } from "lucide-react";
import { formatPrice } from "@/lib/format";
import AddToCartButton from "@/components/products/add-to-cart-button";

export const revalidate = 3600;

async function getProduct(slug: string) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await sb
    .from("products")
    .select("*, categories(name, slug)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Producto no encontrado | RG Tech Solutions" };
  const description =
    product.short_description ||
    `${product.name} disponible en RG Tech Solutions con garantía oficial y envío a todo Ecuador.`;
  return {
    title: `${product.name} | RG Tech Solutions`,
    description,
    openGraph: { title: product.name, description },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const specs = (product.specifications || {}) as Record<string, any>;
  const price = Number(product.price);
  const whatsappUrl = `https://wa.me/${process.env.WHATSAPP_PHONE}?text=${encodeURIComponent(
    `Hola RG Tech Solutions, me interesa este producto:\n• ${product.name} (SKU: ${product.sku})\n• Precio: ${formatPrice(price)}\n¿Está disponible?`
  )}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.short_description || product.name,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "USD",
      availability: product.stock_status === "in_stock" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-sm text-gray-500 mb-6 flex items-center space-x-2 flex-wrap">
        <Link href="/" className="hover:text-blue-600">Inicio</Link>
        <span>/</span>
        <Link href="/productos" className="hover:text-blue-600">Catálogo</Link>
        {product.categories && (
          <>
            <span>/</span>
            <Link href={`/productos?cat=${product.categories.slug}`} className="hover:text-blue-600">
              {product.categories.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="bg-gray-100 rounded-xl aspect-square flex items-center justify-center text-gray-300">
          <Package className="h-32 w-32" />
        </div>

        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-sm text-gray-400 font-mono mb-4">SKU: {product.sku}</p>

          <div className="mb-6">
            {product.stock_status === "in_stock" ? (
              <span className="inline-flex items-center space-x-1 text-green-700 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" /><span>Disponible</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-red-700 bg-red-50 px-3 py-1 rounded-full text-sm font-medium">
                <XCircle className="h-4 w-4" /><span>Agotado</span>
              </span>
            )}
          </div>

          <p className="text-4xl font-bold text-gray-900 mb-6">{formatPrice(price)}</p>

          <div className="space-y-3">
            <AddToCartButton variant="detail" product={{ product_id: product.id, sku: product.sku, name: product.name, price }} />
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium bg-green-500 hover:bg-green-600 text-white transition"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Cotizar por WhatsApp</span>
            </a>
            <button disabled className="w-full py-3 rounded-lg font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
              Pagar Online <span className="ml-2 text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Próximamente</span>
            </button>
          </div>

          {product.financing_available && (
            <p className="mt-4 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-3">
              💳 Este producto aplica para financiamiento sujeto a aprobación.
            </p>
          )}
        </div>
      </div>

      <section className="mt-12 max-w-3xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Información del producto</h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 text-sm">
          <div className="flex justify-between p-4">
            <span className="text-gray-500">Categoría</span>
            <span className="font-medium">{product.categories?.name ?? "General"}</span>
          </div>
          <div className="flex justify-between p-4">
            <span className="text-gray-500">Condición</span>
            <span className="font-medium">Nuevo, con garantía oficial</span>
          </div>
          {specs.brand_line && (
            <div className="flex justify-between p-4">
              <span className="text-gray-500">Línea / Marca</span>
              <span className="font-medium">{specs.brand_line}</span>
            </div>
          )}
          {specs.promo_channel && (
            <div className="flex justify-between p-4">
              <span className="text-gray-500">Canal de promoción</span>
              <span className="font-medium">{specs.promo_channel}</span>
            </div>
          )}
          {specs.promo_comment && <div className="p-4 text-gray-600">{specs.promo_comment}</div>}
        </div>
      </section>
    </div>
  );
}
