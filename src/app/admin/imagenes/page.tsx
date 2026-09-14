"use client";
import { useEffect, useState } from "react";
import { Image as ImageIcon, Search, Trash2, Upload, Loader2, Link2, Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface P { id: string; sku: string; name: string; image_urls: string[] | null; }
interface C { id: string; name: string; slug: string; default_image_url: string | null; }

export default function AdminImagenesPage() {
  const supabase = createClient();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<P[]>([]);
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [cats, setCats] = useState<C[]>([]);
  const [catUrls, setCatUrls] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const [fillMsg, setFillMsg] = useState<string | null>(null);

  const loadCats = async () => {
    const { data } = await supabase.from("categories").select("id, name, slug, default_image_url").order("name");
    setCats((data as C[]) || []);
  };
  useEffect(() => { loadCats(); }, []);

  const search = async () => {
    if (term.trim().length < 2) return;
    setSearching(true);
    const { data } = await supabase
      .from("products")
      .select("id, sku, name, image_urls")
      .or(`sku.ilike.%${term.trim()}%,name.ilike.%${term.trim()}%`)
      .order("name")
      .limit(12);
    setResults((data as P[]) || []);
    setSearching(false);
  };

  const send = async (fd: FormData, key: string) => {
    setBusy(key);
    try {
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al procesar");
      return json;
    } catch (e: any) {
      alert(e.message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const uploadProductFile = async (p: P, file: File) => {
    const fd = new FormData();
    fd.append("mode", "file"); fd.append("target", "product"); fd.append("product_id", p.id); fd.append("file", file);
    const json = await send(fd, p.id);
    if (json) setResults((rs) => rs.map((r) => (r.id === p.id ? { ...r, image_urls: json.image_urls } : r)));
  };

  const addProductUrl = async (p: P) => {
    const url = (urlInputs[p.id] || "").trim();
    if (!url) return;
    const fd = new FormData();
    fd.append("mode", "url"); fd.append("target", "product"); fd.append("product_id", p.id); fd.append("url", url);
    const json = await send(fd, p.id);
    if (json) {
      setResults((rs) => rs.map((r) => (r.id === p.id ? { ...r, image_urls: json.image_urls } : r)));
      setUrlInputs((ui) => ({ ...ui, [p.id]: "" }));
    }
  };

  const removeImage = async (p: P, url: string) => {
    if (!confirm("¿Eliminar esta imagen?")) return;
    setBusy(p.id);
    const res = await fetch("/api/admin/upload-image", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: p.id, url }),
    });
    const json = await res.json();
    if (res.ok) setResults((rs) => rs.map((r) => (r.id === p.id ? { ...r, image_urls: json.image_urls } : r)));
    setBusy(null);
  };

  const setCatFromUrl = async (c: C) => {
    const url = (catUrls[c.id] || "").trim();
    if (!url) return;
    const fd = new FormData();
    fd.append("mode", "url"); fd.append("target", "category"); fd.append("category_id", c.id); fd.append("url", url);
    const json = await send(fd, `cat-${c.id}`);
    if (json) {
      setCats((cs) => cs.map((x) => (x.id === c.id ? { ...x, default_image_url: json.url } : x)));
      setCatUrls((ui) => ({ ...ui, [c.id]: "" }));
    }
  };

  const setCatFromFile = async (c: C, file: File) => {
    const fd = new FormData();
    fd.append("mode", "file"); fd.append("target", "category"); fd.append("category_id", c.id); fd.append("file", file);
    const json = await send(fd, `cat-${c.id}`);
    if (json) setCats((cs) => cs.map((x) => (x.id === c.id ? { ...x, default_image_url: json.url } : x)));
  };

  const fillDefaults = async () => {
    setFilling(true); setFillMsg(null);
    try {
      const res = await fetch("/api/admin/assign-category-defaults", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      setFillMsg(`✅ ${json.updated} productos recibieron la imagen de su categoría.`);
    } catch (e: any) {
      setFillMsg(`❌ ${e.message}`);
    } finally {
      setFilling(false);
    }
  };

  const input = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Imágenes de Productos</h1>
        <p className="text-sm text-gray-600">
          Estrategia rápida: 1) pon una imagen por categoría, 2) rellena masivo, 3) refina con URLs o subidas los productos estrella.
        </p>
      </div>

      {/* ===== Relleno masivo por categoría ===== */}
      <section className="border border-gray-200 rounded-xl bg-white p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-gray-900 flex items-center space-x-2"><Wand2 className="h-5 w-5 text-blue-600" /><span>1. Imagen por categoría + relleno masivo</span></h2>
          <button onClick={fillDefaults} disabled={filling}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium">
            {filling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            <span>2. Rellenar productos sin imagen</span>
          </button>
        </div>
        {fillMsg && <p className="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-lg p-3">{fillMsg}</p>}
        <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-auto pr-1">
          {cats.map((c) => (
            <div key={c.id} className="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
              <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                {c.default_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.default_image_url} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                <div className="flex gap-1">
                  <input value={catUrls[c.id] || ""} onChange={(e) => setCatUrls({ ...catUrls, [c.id]: e.target.value })}
                    placeholder="https://... imagen desde la web" className={input} />
                  <button onClick={() => setCatFromUrl(c)} disabled={busy === `cat-${c.id}`}
                    className="px-2 py-1 border border-blue-600 text-blue-600 rounded-lg text-xs hover:bg-blue-50 shrink-0" title="Usar URL">
                    <Link2 className="h-4 w-4" />
                  </button>
                  <label className="px-2 py-1 border border-gray-300 rounded-lg text-xs cursor-pointer hover:bg-gray-50 shrink-0" title="Subir archivo">
                    <Upload className="h-4 w-4" />
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) setCatFromFile(c, f); e.target.value = ""; }} />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Productos individuales ===== */}
      <section className="border border-gray-200 rounded-xl bg-white p-6 space-y-4">
        <h2 className="font-bold text-gray-900">3. Refinar productos específicos</h2>
        <div className="flex gap-2">
          <input value={term} onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Ej: APPCELIPH17 o 'Monitor Lenovo'" className={input} />
          <button onClick={search} disabled={searching}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-5 py-2 rounded-lg">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span>Buscar</span>
          </button>
        </div>

        <div className="space-y-4">
          {results.map((p) => (
            <div key={p.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400 font-mono">{p.sku}</p>
                </div>
                <div className="flex gap-1 flex-1 max-w-md">
                  <input value={urlInputs[p.id] || ""} onChange={(e) => setUrlInputs({ ...urlInputs, [p.id]: e.target.value })}
                    placeholder="Pegar URL de imagen (https://...)" className={input} />
                  <button onClick={() => addProductUrl(p)} disabled={busy === p.id}
                    className="px-3 py-1 border border-blue-600 text-blue-600 rounded-lg text-xs hover:bg-blue-50 shrink-0" title="Agregar desde URL">
                    {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  </button>
                  <label className={`px-3 py-1 border border-gray-300 rounded-lg text-xs cursor-pointer hover:bg-gray-50 shrink-0 ${busy === p.id ? "opacity-60 pointer-events-none" : ""}`} title="Subir archivo">
                    <Upload className="h-4 w-4" />
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProductFile(p, f); e.target.value = ""; }} />
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {(p.image_urls || []).length === 0 && (
                  <p className="text-sm text-gray-400 flex items-center space-x-2"><ImageIcon className="h-4 w-4" /><span>Sin imágenes aún</span></p>
                )}
                {(p.image_urls || []).map((u) => (
                  <div key={u} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={p.name} className="h-24 w-24 object-cover rounded-lg border border-gray-200" />
                    <button onClick={() => removeImage(p, u)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700" title="Eliminar">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
