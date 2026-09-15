"use client";

import { useState } from "react";
import { Search, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<Result | null>(null);
  const [findingProducts, setFindingProducts] = useState(false);
  const [foundProducts, setFoundProducts] = useState<any[]>([]);

  // Buscar productos SIN imagen
  const findProductsWithoutImages = async () => {
    setFindingProducts(true);
    try {
      const { data } = await supabase
        .from("products")
        .select("id, sku, name, image_urls")
        .or("image_urls.is.null,image_urls.eq.{}") // ✅ CORREGIDO: incluye null Y array vacío
        .limit(100);

      const products = (data || []).filter(
        (p) => !p.image_urls || p.image_urls.length === 0
      );
      setFoundProducts(products);
      setSelectedProductIds(products.map((p) => p.id));
      setMessage(`✅ Encontrados ${products.length} productos sin imagen.`);
    } catch (e: any) {
      setMessage(`❌ Error: ${e.message}`);
    } finally {
      setFindingProducts(false);
    }
  };

  // Buscar imágenes con Google CSE
  const searchImages = async () => {
    if (selectedProductIds.length === 0) {
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
        body: JSON.stringify({ product_ids: selectedProductIds }),
      });

      const json = await res.json();

      if (!res.ok) {
        setMessage(`❌ ${json.error || "Error en la búsqueda"}`);
        return;
      }

      setResults(json.results);
      setMessage(
        `✅ Completado: ${json.results.success} exitosos, ${json.results.failed} fallidos`
      );
    } catch (e: any) {
      setMessage(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          🔍 Búsqueda de Imágenes con Google CSE
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          Busca imágenes específicas de productos en Amazon, eBay, Mercado Libre
          y AliExpress usando Google Custom Search Engine.
        </p>
      </div>

      {/* Botón Principal */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="font-bold text-lg">1️⃣ Cargar productos sin imagen</h2>
        <button
          onClick={findProductsWithoutImages}
          disabled={findingProducts}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-bold"
        >
          {findingProducts ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Buscando productos...
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              Cargar productos sin imagen
            </>
          )}
        </button>
      </div>

      {/* Lista de productos */}
      {foundProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-bold text-lg">
            2️⃣ Seleccionar productos ({foundProducts.length})
          </h2>
          <p className="text-sm text-gray-600">
            Se buscarán imágenes específicas de estos productos.
          </p>

          <div className="space-y-2 max-h-96 overflow-auto">
            {foundProducts.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200"
              >
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProductIds([...selectedProductIds, p.id]);
                    } else {
                      setSelectedProductIds(
                        selectedProductIds.filter((id) => id !== p.id)
                      );
                    }
                  }}
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">{p.sku}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <button
              onClick={() => setSelectedProductIds(foundProducts.map((p) => p.id))}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Seleccionar todos
            </button>
            <button
              onClick={() => setSelectedProductIds([])}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Deseleccionar todos
            </button>
          </div>
        </div>
      )}

      {/* Acción */}
      {foundProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="font-bold text-lg">3️⃣ Buscar y descargar imágenes</h2>
          <p className="text-sm text-gray-600">
            Se buscará la imagen específica de cada producto en Amazon, eBay,
            Mercado Libre y AliExpress usando Google Custom Search.
          </p>
          <button
            onClick={searchImages}
            disabled={loading || selectedProductIds.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold text-lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Buscando {selectedProductIds.length} imágenes...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Iniciar Búsqueda ({selectedProductIds.length} productos)
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
          <h2 className="font-bold text-lg">Resultados Detallados</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600">Exitosos</p>
              <p className="text-4xl font-bold text-green-700">
                {results.success}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-600">Fallidos</p>
              <p className="text-4xl font-bold text-red-700">
                {results.failed}
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-auto">
            {results.details.map((detail) => (
              <div
                key={detail.product_id}
                className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg"
              >
                {detail.status.includes("✅") ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{detail.name}</p>
                  <p className="text-xs text-gray-500 font-mono mb-1">
                    SKU: {detail.sku}
                  </p>
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

      {/* Info */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800 space-y-2">
        <p className="font-bold">ℹ️ Cómo funciona:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Busca cada producto específicamente: "SKU + Nombre" en Google CSE
          </li>
          <li>
            Google CSE busca SOLO en Amazon, eBay, Mercado Libre y AliExpress
          </li>
          <li>Obtiene la imagen EXACTA del producto (no genérica)</li>
          <li>Descarga y guarda en Supabase Storage</li>
          <li>Asigna automáticamente al producto</li>
        </ul>
      </div>
    </div>
  );
}