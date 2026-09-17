"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface PricingConfig {
  iva_percentage: number;
  profit_margin_percentage: number;
  updated_at: string | null;
}

export default function ConfiguracionPreciosPage() {
  const [config, setConfig] = useState<PricingConfig>({
    iva_percentage: 15.0,
    profit_margin_percentage: 30.0,
    updated_at: null,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Cargar datos al entrar a la página
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/admin/pricing");
        if (!res.ok) throw new Error("Error al cargar configuración");
        const data = await res.json();
        setConfig({
          iva_percentage: data.iva_percentage ?? 15.0,
          profit_margin_percentage: data.profit_margin_percentage ?? 30.0,
          updated_at: data.updated_at,
        });
      } catch (err) {
        setMessage({ type: "error", text: "No se pudo cargar la configuración actual." });
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  // Guardar cambios
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iva_percentage: Number(config.iva_percentage),
          profit_margin_percentage: Number(config.profit_margin_percentage),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al guardar");
      }

      setMessage({ type: "success", text: data.message || "Configuración guardada." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error desconocido al guardar." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-2xl font-bold font-mono text-gray-900 dark:text-gray-100">
          Configuración de Precios (RIMPE)
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
          Define el IVA y el margen de ganancia. Estos valores se usarán para calcular el precio final automáticamente en la próxima importación de Excel.
        </p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-md border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input IVA */}
          <div className="space-y-2">
            <label htmlFor="iva" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-mono">
              IVA (%)
            </label>
            <div className="relative">
              <input
                id="iva"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={config.iva_percentage}
                onChange={(e) => setConfig({ ...config, iva_percentage: parseFloat(e.target.value) || 0 })}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-black dark:focus:border-white focus:ring-black dark:focus:ring-white sm:text-sm p-2.5 font-mono"
                required
              />
              <span className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              RIMPE Negocio Popular no cobra IVA al cliente final, pero el costo del proveedor incluye IVA.
            </p>
          </div>

          {/* Input Margen */}
          <div className="space-y-2">
            <label htmlFor="margin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 font-mono">
              Margen de Ganancia (%)
            </label>
            <div className="relative">
              <input
                id="margin"
                type="number"
                step="0.01"
                min="0"
                max="500"
                value={config.profit_margin_percentage}
                onChange={(e) => setConfig({ ...config, profit_margin_percentage: parseFloat(e.target.value) || 0 })}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-black dark:focus:border-white focus:ring-black dark:focus:ring-white sm:text-sm p-2.5 font-mono"
                required
              />
              <span className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Porcentaje de ganancia sobre el costo base.
            </p>
          </div>
        </div>

        {/* Fórmula visual */}
        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-mono mb-1">Fórmula aplicada:</p>
          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
            Precio Venta = Costo Proveedor × {1 + (config.iva_percentage / 100)} × {1 + (config.profit_margin_percentage / 100)}
          </p>
        </div>

        {config.updated_at && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Última actualización: {new Date(config.updated_at).toLocaleString()}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar Configuración
            </>
          )}
        </button>
      </form>
    </div>
  );
}
