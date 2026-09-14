"use client";
import { useState } from "react";
import { CheckCircle2, Loader2, CreditCard, Shield } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/store/cart-store";

export default function FinanciamientoPage() {
  const items = useCartStore((s) => s.items);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const [form, setForm] = useState({
    product_id: items[0]?.product_id || "",
    product_name: items[0]?.name || "",
    full_name: "",
    email: "",
    phone: "",
    national_id: "",
    employment_status: "empleado",
    monthly_income: 0,
    workplace: "",
    personal_name: "",
    personal_phone: "",
    commercial_name: "",
    commercial_phone: "",
    requested_terms_months: "12",
    estimated_down_payment: 0,
    consent: false,
  });

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          references: {
            personal_name: form.personal_name,
            personal_phone: form.personal_phone,
            commercial_name: form.commercial_name,
            commercial_phone: form.commercial_phone,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-lg">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Solicitud enviada!</h1>
        <p className="text-gray-600">
          Tu solicitud de financiamiento fue registrada con cifrado de extremo a extremo. 
          Un asesor te contactará en las próximas 24 horas hábiles.
        </p>
        <Link href="/productos" className="mt-6 inline-block text-blue-600 hover:underline">
          Seguir explorando productos
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Primero agrega un producto</h1>
        <p className="text-gray-600 mb-6">Para solicitar financiamiento necesitas tener al menos un producto en tu cotización.</p>
        <Link href="/productos" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  const input = "w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Solicitar Financiamiento</h1>
      <p className="text-gray-600 mb-6">Completa los 3 pasos. Tus datos sensibles viajan cifrados.</p>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= n ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>
              {n}
            </div>
            {n < 3 && <div className={`flex-1 h-1 mx-2 ${step > n ? "bg-blue-600" : "bg-gray-200"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg">1. Datos de contacto</h2>
            <input required placeholder="Nombre completo" className={input} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <input required type="email" placeholder="Correo electrónico" className={input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input required placeholder="Teléfono / WhatsApp" className={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <button onClick={() => setStep(2)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium">
              Siguiente →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg">2. Información laboral</h2>
            <input required placeholder="Cédula (10 dígitos)" maxLength={13} className={input} value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
            <select className={input} value={form.employment_status} onChange={(e) => setForm({ ...form, employment_status: e.target.value })}>
              <option value="empleado">Empleado en relación de dependencia</option>
              <option value="independiente">Trabajador independiente</option>
              <option value="jubilado">Jubilado</option>
              <option value="estudiante">Estudiante</option>
              <option value="desempleado">Desempleado</option>
            </select>
            <input required type="number" placeholder="Ingreso mensual (USD)" className={input} value={form.monthly_income || ""} onChange={(e) => setForm({ ...form, monthly_income: Number(e.target.value) })} />
            <input placeholder="Lugar de trabajo (opcional)" className={input} value={form.workplace} onChange={(e) => setForm({ ...form, workplace: e.target.value })} />
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="flex-1 border border-gray-300 py-3 rounded-lg">← Atrás</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium">Siguiente →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg">3. Condiciones del crédito</h2>
            <div>
              <label className="text-sm text-gray-600">Producto a financiar</label>
              <select className={input} value={form.product_id} onChange={(e) => {
                const p = items.find(i => i.product_id === e.target.value);
                setForm({ ...form, product_id: e.target.value, product_name: p?.name || "" });
              }}>
                {items.map(i => <option key={i.product_id} value={i.product_id}>{i.name} — ${i.price.toFixed(2)}</option>)}
              </select>
            </div>
            <select className={input} value={form.requested_terms_months} onChange={(e) => setForm({ ...form, requested_terms_months: e.target.value })}>
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
              <option value="18">18 meses</option>
              <option value="24">24 meses</option>
            </select>
            <input type="number" placeholder="Entrada estimada (USD)" className={input} value={form.estimated_down_payment || ""} onChange={(e) => setForm({ ...form, estimated_down_payment: Number(e.target.value) })} />
            <h3 className="font-semibold text-sm text-gray-700 mt-2">Referencias</h3>
            <input required placeholder="Referencia personal - nombre" className={input} value={form.personal_name} onChange={(e) => setForm({ ...form, personal_name: e.target.value })} />
            <input required placeholder="Referencia personal - teléfono" className={input} value={form.personal_phone} onChange={(e) => setForm({ ...form, personal_phone: e.target.value })} />

            <label className="flex items-start space-x-2 text-sm text-gray-600">
              <input required type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-1" />
              <span>
                Acepto que mis datos sensibles (cédula, ingresos, referencias) sean cifrados en reposo conforme a la <Link href="/politicas" className="text-blue-600 underline">LOPDP</Link> para evaluar mi solicitud.
              </span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="flex-1 border border-gray-300 py-3 rounded-lg">← Atrás</button>
              <button onClick={submit} disabled={loading || !form.consent} className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-medium">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                <span>Enviar solicitud cifrada</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
