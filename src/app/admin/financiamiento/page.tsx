"use client";
import { useEffect, useState } from "react";
import { Eye, EyeOff, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

interface App {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  product_name: string;
  national_id: string;
  employment_status: string;
  monthly_income: string;
  workplace: string;
  references_json: string;
  requested_terms_months: number;
  estimated_down_payment: number;
  application_status: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  under_review: "En revisión",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  under_review: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function AdminFinanciamientoPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/financiamiento");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setApps(json.applications || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: App["application_status"]) => {
    const res = await fetch("/api/admin/financiamiento/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) load();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Financiamiento</h1>
          <p className="text-sm text-gray-600">Los datos sensibles se descifran solo en esta vista administrativa.</p>
        </div>
        <button onClick={load} className="flex items-center space-x-2 text-sm text-blue-600 hover:underline">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /><span>Actualizar</span>
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {apps.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-500">Aún no hay solicitudes de financiamiento.</div>
      )}

      <div className="space-y-4">
        {apps.map((a) => (
          <div key={a.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{a.full_name}</p>
                <p className="text-sm text-gray-500">{a.product_name || "Producto N/D"} · {a.requested_terms_months} meses · Entrada ${Number(a.estimated_down_payment).toFixed(2)}</p>
                <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleString("es-EC")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[a.application_status]}`}>
                  {STATUS_LABEL[a.application_status] || a.application_status}
                </span>
                <button
                  onClick={() => setOpenId(openId === a.id ? null : a.id)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  title="Ver datos sensibles"
                >
                  {openId === a.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {openId === a.id && (
              <div className="px-4 pb-4 grid md:grid-cols-2 gap-4 text-sm border-t bg-gray-50">
                <div className="space-y-1 pt-4">
                  <p><span className="text-gray-500">Cédula:</span> <span className="font-mono font-medium">{a.national_id}</span></p>
                  <p><span className="text-gray-500">Correo:</span> {a.email}</p>
                  <p><span className="text-gray-500">Teléfono:</span> {a.phone}</p>
                  <p><span className="text-gray-500">Empleo:</span> {a.employment_status} · {a.workplace}</p>
                  <p><span className="text-gray-500">Ingreso mensual:</span> <span className="font-medium">${Number(a.monthly_income).toFixed(2)}</span></p>
                </div>
                <div className="space-y-3 pt-4">
                  <p className="text-gray-500 font-medium">Referencias:</p>
                  <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-auto max-h-32">
                    {(() => { try { return JSON.stringify(JSON.parse(a.references_json), null, 2); } catch { return a.references_json; } })()}
                  </pre>
                  <div className="flex gap-2">
                    <button onClick={() => setStatus(a.id, "under_review")} className="flex-1 py-2 text-xs border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">En revisión</button>
                    <button onClick={() => setStatus(a.id, "approved")} className="flex-1 py-2 text-xs flex items-center justify-center space-x-1 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <CheckCircle2 className="h-3 w-3" /><span>Aprobar</span>
                    </button>
                    <button onClick={() => setStatus(a.id, "rejected")} className="flex-1 py-2 text-xs flex items-center justify-center space-x-1 bg-red-600 text-white rounded-lg hover:bg-red-700">
                      <XCircle className="h-3 w-3" /><span>Rechazar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
