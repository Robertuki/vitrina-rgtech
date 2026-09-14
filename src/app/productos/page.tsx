import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import ProductCard from "@/components/products/product-card";
import SearchBar from "@/components/products/search-bar";

export const revalidate = 3600;
const PAGE_SIZE = 24;

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; page?: string }>;
}) {
  const { q = "", cat = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  let listQuery = sb
    .from("products")
    .select("id, sku, name, slug, price, stock_status, categories(name, slug)", { count: "exact" })
    .eq("is_published", true);

  if (cat) listQuery = listQuery.eq("categories.slug", cat);
  if (q) listQuery = listQuery.ilike("name", `%${q}%`);

  const { data, count, error } = await listQuery
    .order("name", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  const { data: categories } = await sb.from("categories").select("name, slug").order("name");

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat) params.set("cat", cat);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/productos?${s}` : "/productos";
  };

  const catUrl = (slug: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("cat", slug);
    return `/productos?${params.toString()}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Catálogo de Productos</h1>
        <p className="text-gray-600">{count ?? 0} productos con precio y stock actualizado.</p>
      </div>

      <SearchBar initialQ={q} currentCat={cat} />

      <div className="flex flex-wrap gap-2 mt-4 mb-8">
        <Link
          href={q ? `/productos?q=${encodeURIComponent(q)}` : "/productos"}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${!cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          Todos
        </Link>
        {(categories || []).map((c) => (
          <Link
            key={c.slug}
            href={catUrl(c.slug)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${cat === c.slug ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="text-red-600 py-20 text-center">Error al cargar productos. Intenta nuevamente.</p>
      ) : (data || []).length === 0 ? (
        <div className="text-center py-20 text-gray-500">No se encontraron productos para tu búsqueda.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {data.map((p: any) => (
            <ProductCard
              key={p.id}
              product={{
                id: p.id,
                sku: p.sku,
                name: p.name,
                slug: p.slug,
                price: Number(p.price),
                stock_status: p.stock_status,
                category_name: p.categories?.name ?? null,
              }}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          {pageNum > 1 && (
            <Link href={buildUrl(pageNum - 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-gray-600">Página {pageNum} de {totalPages}</span>
          {pageNum < totalPages && (
            <Link href={buildUrl(pageNum + 1)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
