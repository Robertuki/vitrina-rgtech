"use client";
import { useState } from "react";

export default function ImportarStockPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/import-stock", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Fallo en la importación");
      setResult(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importación Semanal de Stock</h1>
        <p className="text-sm text-gray-600">Sube el .xlsx del proveedor. Se procesan todas las hojas (stock, promos, listas) automáticamente.</p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
        <label className="cursor-pointer text-blue-600 hover:underline font-medium">
          Seleccionar archivo .xlsx
          <input type="file" accept=".xlsx" className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        {file && <p className="mt-2 text-sm font-semibold text-gray-800">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
      </div>

      <button onClick={upload} disabled={!file || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2.5 rounded-lg transition">
        {loading ? "Procesando por lotes..." : "Iniciar Carga de Stock"}
      </button>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {result && (
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg space-y-4">
          <p className="font-bold text-green-800">✅ Stock procesado exitosamente</p>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="bg-white p-3 rounded shadow-sm"><span className="block text-gray-500">Mapeados</span><span className="text-xl font-bold">{result.summary.mapped}</span></div>
            <div className="bg-white p-3 rounded shadow-sm"><span className="block text-gray-500">Publicados</span><span className="text-xl font-bold text-green-600">{result.summary.published}</span></div>
            <div className="bg-white p-3 rounded shadow-sm"><span className="block text-gray-500">Ocultos</span><span className="text-xl font-bold text-amber-600">{result.summary.hidden}</span></div>
            <div className="bg-white p-3 rounded shadow-sm"><span className="block text-gray-500">Creados</span><span className="text-xl font-bold text-blue-600">{result.summary.created}</span></div>
          </div>
          <table className="w-full text-xs bg-white rounded overflow-hidden">
            <thead className="bg-gray-100"><tr><th className="p-2 text-left">Hoja</th><th className="p-2">Rol</th><th className="p-2">Mapeadas</th><th className="p-2">Omitidas</th></tr></thead>
            <tbody>
              {result.reports?.map((r: any) => (
                <tr key={r.sheet} className="border-t">
                  <td className="p-2 font-mono">{r.sheet}</td><td className="p-2 text-center">{r.role}</td>
                  <td className="p-2 text-center">{r.mapped}</td><td className="p-2 text-center">{r.skippedHeaderRows + r.skippedInvalidRows}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}