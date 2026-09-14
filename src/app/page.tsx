import Link from "next/link";
import { ArrowRight, ShieldCheck, Truck, CreditCard } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 py-24 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Tecnología de vanguardia <br /> para tu negocio y hogar
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Laptops, servidores, networking y electrónica con stock real. 
            Precios competitivos, garantía oficial y envío a todo Ecuador.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/productos" 
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition shadow-lg"
            >
              Ver Catálogo <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/financiamiento" 
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium border-2 border-white text-white rounded-lg hover:bg-white/10 transition"
            >
              Solicitar Financiamiento
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm text-center border border-gray-100">
            <Truck className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Envío Nacional</h3>
            <p className="text-gray-600">Despacho rápido a Quito, Guayaquil, Cuenca y todo el país.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm text-center border border-gray-100">
            <ShieldCheck className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Garantía Oficial</h3>
            <p className="text-gray-600">Productos 100% originales con garantía de fabricante y soporte local.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm text-center border border-gray-100">
            <CreditCard className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Facilidades de Pago</h3>
            <p className="text-gray-600">Cotizaciones institucionales y opciones de financiamiento para empresas.</p>
          </div>
        </div>
      </section>
    </div>
  );
}