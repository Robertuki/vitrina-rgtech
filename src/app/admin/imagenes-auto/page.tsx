"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Sparkles } from "lucide-react";

export default function AutoImagesPage() {
  const supabase = createClient();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const loadCount = async () => {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .or("image_urls.is.null,image_urls.eq.{}");
    setRemaining(count ?? 0);
  };
  useEffect(() => { loadCount(); }, []);

  const run = async (maxBatches: number) => {
    setRunning(true);
    setLog([]);
    for (let i = 0; i < maxBatches; i++) {
      const res = await fetch("/api/admin/auto-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: 25 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLog((l) => [...l, `❌ ${json.error}`]);
        break;
      }
      setLog((l) => [...l, `Lote ${i + 1}: ✅ ${json.saved} guardadas · 🔎 ${json.notFound} sin resultado · ⚠️ ${json.failed} errores · Quedan ${json.remaining}`]);
      setRemaining(json.remaining);
      if (json.quotaExceeded) {
        setLog((l) => [...l, "⚠️ Cuota diaria de Google alcanzada (100 gratis/día). Continúa mañana o activa facturación en Google Cloud."]);
        break;
      }
      if (json.remaining === 0) {
        setLog((l) => [...l, "🎉 Todos los productos publicables ya tienen imagen."]);
        break;
      }
      if (json.processed === 0) break;
    }
    setRunning(false);
    loadCount();
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Sparkles className="h-6 w-6 text-blue-600" /><span>Imágenes automáticas por producto</span>
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Busca en Google la foto de cada producto (marca + modelo), la descarga y la guarda en tu Storage.
          Productos sin foto actualmente: <strong>{remaining ?? "..."}</strong>
        </p>
      </div>

      <div className="flex gap-3">
        <button onClick={() => run(1)} disabled={running}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium">
          {running ? "Procesando..." : "Procesar lote de 25"}
        </button>
        <button onClick={() => run(4)} disabled={running}
          className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium">
          {running ? "Procesando..." : "Procesar 100 (cuota diaria)"}
        </button>
      </div>

      {log.length > 0 && (
        <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-auto max-h-64 whitespace-pre-wrap">
          {log.join("\n")}
        </pre>
      )}

      <p className="text-xs text-gray-500">
        Nota: las imágenes descargadas son fotos oficiales de fabricante/distribuidor, uso estándar en catálogos de
        reventa de productos originales. Se guardan en tu propio Storage para que nunca dependas de sitios externos.
      </p>
    </div>
  );
}
