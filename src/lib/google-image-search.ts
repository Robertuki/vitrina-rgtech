/**
 * Búsqueda de imágenes de productos específicos usando Google Custom Search API
 * Busca en Amazon, eBay, Mercado Libre y AliExpress
 */

interface GoogleImageResult {
  title: string;
  link: string;
  image: {
    contextLink: string;
    height: number;
    width: number;
    byteSize: number;
  };
}

interface GoogleSearchResponse {
  queries: {
    request: Array<{
      totalResults: string;
    }>;
  };
  items: GoogleImageResult[];
}

/**
 * Buscar imagen específica de un producto usando Google CSE
 * @param query - Búsqueda: "SKU Nombre del producto" o "Nombre Modelo"
 * @param limit - Cuántas imágenes retornar
 * @returns Array de URLs de imágenes
 */
export async function searchProductImageWithGoogle(
  query: string,
  limit: number = 5
): Promise<string[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    throw new Error(
      "Falta GOOGLE_SEARCH_API_KEY o GOOGLE_SEARCH_ENGINE_ID en .env.local"
    );
  }

  try {
    // Agregar "amazon" a la búsqueda para mejorar precisión
    const searchQuery = `${query} amazon OR ebay`;

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.append("q", searchQuery);
    url.searchParams.append("cx", searchEngineId);
    url.searchParams.append("key", apiKey);
    url.searchParams.append("searchType", "image"); // BUSCAR IMÁGENES
    url.searchParams.append("num", Math.min(limit * 2, 10).toString()); // Google retorna máx 10
    url.searchParams.append("start", "1");

    console.log(`🔍 Buscando imagen para: "${query}"`);

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(
        errorData.error?.message || `Google API error: ${res.status}`
      );
    }

    const data = (await res.json()) as GoogleSearchResponse;

    if (!data.items || data.items.length === 0) {
      console.warn(`⚠️ No se encontraron imágenes para: "${query}"`);
      return [];
    }

    // Filtrar URLs válidas y de buena calidad
    const imageUrls = data.items
      .filter((item) => {
        // Evitar imágenes muy pequeñas
        return item.image.width >= 300 && item.image.height >= 300;
      })
      .map((item) => item.link)
      .slice(0, limit);

    console.log(
      `✅ Encontradas ${imageUrls.length} imágenes para: "${query}"`
    );
    return imageUrls;
  } catch (error) {
    console.error(`❌ Error buscando imagen para "${query}":`, error);
    throw error;
  }
}

/**
 * Buscar imagen y descargar automáticamente
 */
export async function findAndDownloadProductImage(
  productName: string,
  productSku: string
): Promise<string | null> {
  try {
    // Búsqueda específica: SKU + nombre
    const searchQuery = `${productSku} ${productName}`;
    const imageUrls = await searchProductImageWithGoogle(searchQuery, 3);

    if (imageUrls.length === 0) {
      console.warn(`⚠️ No hay imágenes disponibles para: ${productName}`);
      return null;
    }

    // Retornar la primera URL (mejor resultado)
    return imageUrls[0];
  } catch (error) {
    console.error(
      `❌ Error en findAndDownloadProductImage para ${productName}:`,
      error
    );
    return null;
  }
}
