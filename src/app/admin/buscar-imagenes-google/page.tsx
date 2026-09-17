"use client";

import { useState } from "react";
import { Search, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  image_urls: string[] | null;
  image_query: string | null;
}

interface Result {
  success: number;
  failed: number;
  details: {
    product_id: string;
    sku: string;
    name: string;
    status: string;
    imageUrl?: string;
  }[];
}

export default function BuscarImagenesGooglePage() {
  const supabase = createClient();
  const [term, setTerm] = useState("");
  const [onlyWithout, setOnlyWithout] = useState(true);
  const [searchingList, setSearchingList] = useState(false);
  const [foundProducts, setFoundProducts] = useState<ProductRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<Result | null>(null);

  const searchProducts = async () => {
    setSearchingList(true);
    setMessage("");
    try {
      const t = term.trim();

      // ✅ CORREGIDO: los filtros van ANTES de .order/.limit
      // (dos .or() separados se combinan con AND automáticamente)
      let query = supabase
        .from("products")
        .select("id, sku, name, image_urls, image_query");

      if (t.length >= 2) {
        query = query.or(`name.ilike.%${t}%,sku.ilike.%${t}%`);
      }
      if (onlyWithout) {
        query = query.or("image_urls.is.null,image_urls.eq.{}");
      }

      const { data, error } = await query
        .order("name", { ascending: true })
        .limit(100);

      if (error) throw error;
      const rows = (data as ProductRow[]) || [];
      setFoundProducts(rows);
      setSelectedIds(rows.map((r) => r.id));
      setMessage(
        rows.length
          ? `✅ ${rows.length} productos encontrados (todos seleccionados por defecto).`
          : "⚠️ Sin resultados con esos criterios."
      );
    } catch (e: any) {
      setMessage(`❌ Error: ${e.message}`);
    } finally {
      setSearchingList(false);
    }
  };

  const launchSearch = async () => {
    if (selectedIds.length === 0) {
      setMessage("❌ Selecciona al menos un producto");
      return;
    }
    setLoading(true);
    setMessage("");
    setResults(null);
    try {
      const res = await fetch("/api/admin/search-images-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: selectedIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(`❌ ${json.error || "Error en la búsqueda"}`);
        return;
      }
      setResults(json.results);
      setMessage(`✅ Completado: ${json.results.success} exitosos, ${json.results.failed} fallidos`);
      await searchProducts(); // refresca la lista para ver las fotos nuevas
    } catch (e: any) {
      setMessage(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🔍 Búsqueda de Imágenes de Productos</h1>
        <p className="text-sm text-gray-600 mt-2">
          Busca por nombre o SKU, elige a mano qué productos procesar y lanza la búsqueda.
          La consulta limpia (ETL) queda guardada en cada producto para siempre.
        </p>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="font-bold text-lg">1️⃣ Buscar productos</h2>
        <div className="flex gap-2">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchProducts()}
            placeholder="Ej: BUDS, XIAAUDWIRB8LTEBLANCO, monitor..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={searchProducts}
            disabled={searchingList}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
          >
            {searchingList ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyWithout}
            onChange={(e) => setOnlyWithout(e.target.checked)}
            className="w-4 h-4"
          />
          Mostrar solo productos SIN imagen
        </label>
      </div>

      {/* Lista seleccionable */}
      {foundProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-bold text-lg">2️⃣ Elegir productos ({foundProducts.length})</h2>
          <div className="space-y-2 max-h-96 overflow-auto">
            {foundProducts.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds([...selectedIds, p.id]);
                    else setSelectedIds(selectedIds.filter((id) => id !== p.id));
                  }}
                  className="w-4 h-4"
                />
                <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                  {p.image_urls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_urls[0]} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{p.sku}</p>
                  {p.image_query && (
                    <p className="text-xs text-blue-600 truncate">ETL: {p.image_query}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-4 border-t">
            <button
              onClick={() => setSelectedIds(foundProducts.map((p) => p.id))}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Seleccionar todos
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Deseleccionar todos
            </button>
          </div>
        </div>
      )}

      {/* Lanzar */}
      {foundProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="font-bold text-lg">3️⃣ Buscar y descargar imágenes</h2>
          <p className="text-sm text-gray-600">
            Consejo: en local puedes lanzar hasta ~50 de una vez; en producción usa lotes de 20–25
            (Vercel corta funciones largas).
          </p>
          <button
            onClick={launchSearch}
            disabled={loading || selectedIds.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Procesando {selectedIds.length} productos...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Iniciar Búsqueda ({selectedIds.length} productos)
              </>
            )}
          </button>
        </div>
      )}

      {/* Mensajes */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.startsWith("✅")
              ? "bg-green-50 border border-green-300 text-green-800"
              : message.startsWith("❌")
              ? "bg-red-50 border border-red-300 text-red-800"
              : "bg-blue-50 border border-blue-300 text-blue-800"
          }`}
        >
          {message}
        </div>
      )}

      {/* Resultados */}
      {results && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Resultados Detallados</h2>
            <button onClick={searchProducts} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
              <RefreshCw className="h-4 w-4" /> Refrescar lista
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600">Exitosos</p>
              <p className="text-4xl font-bold text-green-700">{results.success}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-600">Fallidos</p>
              <p className="text-4xl font-bold text-red-700">{results.failed}</p>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-auto">
            {results.details.map((detail) => (
              <div key={detail.product_id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                {detail.status.includes("✅") ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{detail.name}</p>
                  <p className="text-xs text-gray-500 font-mono mb-1">SKU: {detail.sku}</p>
                  <p className="text-sm text-gray-700">{detail.status}</p>
                  {detail.imageUrl && (
                    <a
                      href={detail.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    >
                      Ver imagen
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
