"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Settings, Loader2 } from "lucide-react";

interface PricingConfig {
  id: string;
  iva_percentage: number;
  standard_profit_margin: number;
  notes?: string;
  updated_at: string;
}

export default function ConfiguracionPreciosPage() {
  const supabase = createClient();
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [simCost, setSimCost] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pricing_config")
        .select("*")
        .eq("active", true)
        .single();
      if (error) throw error;
      setConfig(data);
    } catch (error: any) {
      setMessage(`❌ Error cargando configuración: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    if (config.iva_percentage <= 0 || config.iva_percentage >= 100) {
      setMessage("❌ IVA debe estar entre 0 y 100");
      return;
    }
    if (config.standard_profit_margin <= 0 || config.standard_profit_margin >= 100) {
      setMessage("❌ Margen debe estar entre 0 y 100");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("pricing_config")
        .update({
          iva_percentage: config.iva_percentage,
          standard_profit_margin: config.standard_profit_margin,
          notes: config.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);
      if (error) throw error;

      // Aplicar el nuevo margen a TODO el catálogo (recalcula price al instante)
      const applyAll = confirm(
        "¿Aplicar el nuevo margen a TODO el catálogo ahora?\nLos precios públicos se recalcularán al instante."
      );
      if (applyAll) {
        const { error: errProd } = await supabase
          .from("products")
          .update({ profit_margin_percentage: config.standard_profit_margin })
          .not("id", "is", null);
        if (errProd) throw errProd;
      }

      setMessage(
        "✅ Configuración guardada." +
          (applyAll
            ? "\n💰 Los precios de todo el catálogo se recalcularon automáticamente."
            : "\n💡 El nuevo margen se aplicará a las próximas importaciones.")
      );
      setTimeout(() => setMessage(""), 6000);
    } catch (error: any) {
      setMessage(`❌ Error al guardar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const simValue = parseFloat(simCost);
  const simulated =
    config && !isNaN(simValue) && simValue > 0
      ? simValue * (1 + config.iva_percentage / 100) * (1 + config.standard_profit_margin / 100)
      : null;

  if (loading) return <div className="p-6 text-center text-gray-600">Cargando configuración...</div>;
  if (!config) return <div className="p-6 text-center text-red-600">Error: no se encontró configuración activa.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración de Precios RIMPE</h1>
          <p className="text-sm text-gray-600">
            Ajusta IVA y margen de ganancia. Los precios se recalcularán automáticamente en todos los productos.
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
        <p className="text-sm text-blue-900 font-medium">
          📌 <strong>Fórmula RIMPE:</strong> Precio Venta = (Costo × (1 + IVA%)) × (1 + Margen%)
        </p>
        <p className="text-xs text-blue-800 mt-2">
          Como Negocio Popular, absorbes el IVA pagado a tu proveedor. El margen es tu ganancia neta.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Porcentaje de IVA a Absorber (%)</label>
          <input
            type="number" step="0.01" min="0" max="100"
            value={config.iva_percentage}
            onChange={(e) => setConfig({ ...config, iva_percentage: parseFloat(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-600 mt-1">Valor típico: 15% (régimen RIMPE Ecuador)</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Margen de Ganancia Estándar (%)</label>
          <input
            type="number" step="0.01" min="0" max="100"
            value={config.standard_profit_margin}
            onChange={(e) => setConfig({ ...config, standard_profit_margin: parseFloat(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-600 mt-1">Valor típico: 11% (margen neto después de costos operativos)</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Notas (Opcional)</label>
          <textarea
            value={config.notes || ""}
            onChange={(e) => setConfig({ ...config, notes: e.target.value })}
            rows={3}
            placeholder="Ej: 'Cambio por estrategia Q4 2026'"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg whitespace-pre-line ${
              message.startsWith("✅")
                ? "bg-green-50 border border-green-300 text-green-800"
                : "bg-red-50 border border-red-300 text-red-800"
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
        >
          {saving ? "Guardando configuración..." : "💾 Guardar Configuración"}
        </button>
      </form>

      <div className="mt-8 pt-8 border-t">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">🧮 Simulador de Precio en Tiempo Real</h2>
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Precio de Proveedor (sin IVA)</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number" step="0.01" placeholder="100.00"
                value={simCost}
                onChange={(e) => setSimCost(e.target.value)}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {simulated !== null && (
            <div className="bg-white p-4 rounded-lg border-2 border-blue-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Costo absorbiendo IVA:</span>
                <span className="font-mono text-sm">${(simValue * (1 + config.iva_percentage / 100)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-gray-700 font-semibold">Precio de Venta Público:</span>
                <span className="text-2xl font-bold text-blue-600">${simulated.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Ganancia neta:</span>
                <span>${(simulated - simValue * (1 + config.iva_percentage / 100)).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
        <p className="font-semibold mb-2">ℹ️ Última actualización:</p>
        <p>{new Date(config.updated_at).toLocaleString("es-EC")}</p>
      </div>
    </div>
  );
}
