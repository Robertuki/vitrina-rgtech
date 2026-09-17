/**
 * Búsqueda de imágenes: DuckDuckGo directo (con auto-pausa anti-ban)
 * + Google CSE como respaldo opcional.
 */
import { buildImageQueries } from "./product-etl";

interface GoogleImageResult {
  title: string;
  link: string;
  image: { contextLink: string; height: number; width: number; byteSize: number };
}

interface GoogleSearchResponse {
  queries: { request: Array<{ totalResults: string }> };
  items: GoogleImageResult[];
}

interface DdgImageItem {
  image?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
}

const MIN_SIZE = 300;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// 🧊 Anti-ban: si DDG responde 403, nos pausamos solos 10 minutos
let ddgBlockedUntil = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function absoluteUrl(u: string): string {
  if (!u) return "";
  if (u.startsWith("/")) return `https://duckduckgo.com${u}`;
  return u;
}

async function searchDuckDuckGo(
  query: string,
  limit: number
): Promise<{ image: string; thumb: string }[]> {
  const init = await fetch("https://duckduckgo.com/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: new URLSearchParams({ q: query, iax: "images", ia: "images" }),
    signal: AbortSignal.timeout(10000),
  });
  if (!init.ok) throw new Error(`DDG home respondió ${init.status}`);

  const html = await init.text();
  const m = html.match(/vqd=["']?([\d-]+)["']?/);
  if (!m) throw new Error("DDG: sin token vqd (posible bloqueo de IP)");

  const url = new URL("https://duckduckgo.com/i.js");
  url.searchParams.set("l", "us-en");
  url.searchParams.set("o", "json");
  url.searchParams.set("q", query);
  url.searchParams.set("vqd", m[1]);
  url.searchParams.set("f", ",,,,");
  url.searchParams.set("p", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": UA, Referer: "https://duckduckgo.com/" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`DDG i.js respondió ${res.status}`);

  const data = (await res.json()) as { results?: DdgImageItem[] };
  const results: DdgImageItem[] = Array.isArray(data.results) ? data.results : [];

  return results
    .filter((item: DdgImageItem) => {
      const w = Number(item.width || 0);
      const h = Number(item.height || 0);
      return (w === 0 && h === 0) || (w >= MIN_SIZE && h >= MIN_SIZE);
    })
    .map((item: DdgImageItem) => ({
      image: item.image || "",
      thumb: absoluteUrl(item.thumbnail || ""),
    }))
    .filter((pair) => pair.image.startsWith("http"))
    .slice(0, limit);
}

async function searchGoogleCse(query: string, limit: number): Promise<string[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!apiKey || !searchEngineId) return [];

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.append("q", query);
  url.searchParams.append("cx", searchEngineId);
  url.searchParams.append("key", apiKey);
  url.searchParams.append("searchType", "image");
  url.searchParams.append("num", Math.min(limit * 2, 10).toString());
  url.searchParams.append("start", "1");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    const errorData = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(errorData?.error?.message || `Google API error: ${res.status}`);
  }
  const data = (await res.json()) as GoogleSearchResponse;
  return (data.items || [])
    .filter((item: GoogleImageResult) => item.image.width >= MIN_SIZE && item.image.height >= MIN_SIZE)
    .map((item: GoogleImageResult) => item.link)
    .slice(0, limit);
}

export async function searchProductImageWithGoogle(
  query: string,
  limit: number = 5
): Promise<string[]> {
  const queries = buildImageQueries(query, "");
  let ddgHardFail = false;

  for (const q of queries) {
    if (Date.now() < ddgBlockedUntil) {
      console.warn("⏸️ DDG en pausa temporal por ban reciente; pruebo Google CSE");
      break;
    }
    try {
      await sleep(1500); // pausa educada anti-ban
      const pairs = await searchDuckDuckGo(q, limit);
      if (pairs.length > 0) {
        const urls: string[] = [];
        for (const p of pairs) {
          urls.push(p.image);
          if (p.thumb && p.thumb !== p.image) urls.push(p.thumb);
        }
        console.log(`✅ DDG: ${pairs.length} resultados para "${q}" (${urls.length} URLs candidatas)`);
        return urls;
      }
      console.warn(`⚠️ DDG sin resultados para "${q}"`);
    } catch (e) {
      const msg = (e as any)?.message || "";
      if (msg.includes("403")) {
        ddgBlockedUntil = Date.now() + 10 * 60 * 1000;
        console.warn("🧊 DDG respondió 403: auto-pausa de 10 minutos activada");
      }
      ddgHardFail = true;
      console.warn(`⚠️ DDG falló: ${msg}`);
      break;
    }
  }

  if (ddgHardFail) {
    try {
      const urls = await searchGoogleCse(queries[0] || query, limit);
      if (urls.length > 0) {
        console.log(`✅ Google CSE: ${urls.length} imágenes`);
        return urls;
      }
    } catch (e) {
      console.warn(`⚠️ Google CSE falló: ${(e as any)?.message}`);
    }
  }

  return [];
}

export async function findAndDownloadProductImage(
  productName: string,
  productSku: string
): Promise<string | null> {
  try {
    const imageUrls = await searchProductImageWithGoogle(`${productSku} ${productName}`, 3);
    if (imageUrls.length === 0) return null;
    return imageUrls[0];
  } catch (error) {
    console.error(`❌ Error en findAndDownloadProductImage para ${productName}:`, error);
    return null;
  }
}
