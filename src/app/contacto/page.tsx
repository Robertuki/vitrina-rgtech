"use client";
import { useState } from "react";
import { CheckCircle2, Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function ContactoPage() {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", message: "", consent: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo enviar");
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Mensaje recibido!</h1>
        <p className="text-gray-600">Nuestro equipo te contactará muy pronto al número o correo que registraste.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Contáctanos</h1>
      <p className="text-gray-600 mb-8">¿Dudas de stock, precios o financiamiento? Escríbenos y te respondemos rápido.</p>

      <form onSubmit={submit} className="space-y-4 bg-white border border-gray-200 rounded-xl p-6">
        <input required minLength={3} placeholder="Nombre completo" value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input required type="email" placeholder="Correo electrónico" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input required minLength={7} placeholder="Teléfono / WhatsApp" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <textarea placeholder="Cuéntanos qué necesitas (opcional)" rows={4} value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />

        <label className="flex items-start space-x-2 text-sm text-gray-600">
          <input required type="checkbox" checked={form.consent}
            onChange={(e) => setForm({ ...form, consent: e.target.checked })}
            className="mt-1" />
          <span>
            Acepto la <Link href="/politicas" className="text-blue-600 underline">política de privacidad</Link> y el
            tratamiento de mis datos para ser contactado (LOPDP).
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
          <span>Enviar mensaje</span>
        </button>
      </form>
    </div>
  );
}
