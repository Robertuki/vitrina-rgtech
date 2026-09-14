import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50 mt-auto">
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-lg font-bold text-blue-600 mb-4">RG Tech Solutions</h3>
          <p className="text-sm text-gray-600 mb-4">
            Tu proveedor de confianza en tecnología, cómputo y electrónica en Ecuador.
            Precios de distribuidor al alcance de tu negocio.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Enlaces</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link href="/productos" className="hover:text-blue-600">Catálogo</Link></li>
            <li><Link href="/financiamiento" className="hover:text-blue-600">Financiamiento</Link></li>
            <li><Link href="/politicas" className="hover:text-blue-600">Políticas de Privacidad (LOPDP)</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Contacto</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center space-x-2"><Phone className="h-4 w-4" /> <span>+593 99 999 9999</span></li>
            <li className="flex items-center space-x-2"><Mail className="h-4 w-4" /> <span>ventas@rgtechsolutions.ec</span></li>
            <li className="flex items-center space-x-2"><MapPin className="h-4 w-4" /> <span>Quito, Ecuador</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} RG Tech Solutions. Todos los derechos reservados.
      </div>
    </footer>
  );
}
