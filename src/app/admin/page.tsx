import Link from "next/link";
import { FileSpreadsheet, CreditCard, Image as ImageIcon, Settings, Sparkles, Search } from "lucide-react";

const modules = [
  {
    href: "/admin/configuracion-precios",
    title: "Configuración de Precios",
    desc: "Edita IVA (15%) y margen (11%) RIMPE. Los precios se recalculan en todo el catálogo.",
    Icon: Settings,
  },
  {
    href: "/admin/importar-stock",
    title: "Importación de Stock",
    desc: "Carga semanal del Excel del proveedor (lotes de 200 y hash anti-duplicados).",
    Icon: FileSpreadsheet,
  },
  {
    href: "/admin/financiamiento",
    title: "Solicitudes de Financiamiento",
    desc: "Revisa y gestiona solicitudes de crédito con datos cifrados (LOPDP).",
    Icon: CreditCard,
  },
  {
    href: "/admin/imagenes",
    title: "Imágenes de Productos",
    desc: "Adjunta fotos referenciales buscando por SKU o nombre.",
    Icon: ImageIcon,
  },
  {
    href: "/admin/imagenes-auto",
    title: "Imágenes Automáticas",
    desc: "Busca y descarga fotos de Google por producto, en lotes de 25/100.",
    Icon: Sparkles,
  },
  {
  href: "/admin/buscar-imagenes-google",
  title: "Búsqueda de Imágenes (Google CSE)",
  desc: "Busca imágenes específicas de productos en Amazon, eBay, Mercado Libre y AliExpress.",
  Icon: Search, // importar Search de lucide-react
},
];

export default function AdminHome() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-sm text-gray-600">Selecciona un módulo para trabajar.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {modules.map(({ href, title, desc, Icon }) => (
          <Link
            key={href}
            href={href}
            className="border border-gray-200 rounded-xl p-6 bg-white hover:shadow-lg hover:border-blue-300 transition"
          >
            <Icon className="h-8 w-8 text-blue-600 mb-3" />
            <h2 className="font-semibold text-gray-900 mb-1">{title}</h2>
            <p className="text-sm text-gray-600">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
