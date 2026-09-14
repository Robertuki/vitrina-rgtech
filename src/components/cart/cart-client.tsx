"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Trash2, Plus, Minus, MessageCircle, FileDown, Loader2, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/lib/format";

export default function CartClient({ phone }: { phone: string }) {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="container mx-auto px-4 py-16 text-center text-gray-400">Cargando tu cotización...</div>;
  }

  const total = totalPrice();

  const whatsappUrl = () => {
    const lines = items.map(
      (i) => `• ${i.sku} | ${i.name} x${i.quantity} = ${formatPrice(i.price * i.quantity)}`
    );
    const msg = `Hola RG Tech Solutions 👋, quiero cotizar estos productos:\n${lines.join("\n")}\n\nTotal estimado: ${formatPrice(total)}\n¿Me confirman disponibilidad?`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const downloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const mod = await import("jspdf-autotable");
      const autoTable = (mod as any).default || (mod as any).autoTable;

      const doc = new jsPDF();
      const now = new Date();
      const folio = `PF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

      doc.setFontSize(18);
      doc.setTextColor(37, 99, 235);
      doc.text("RG TECH SOLUTIONS", 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.text("Proforma de Cotización", 14, 27);
      doc.text(`N°: ${folio}`, 14, 33);
      doc.text(`Fecha: ${now.toLocaleDateString("es-EC")}`, 14, 39);

      autoTable(doc, {
        startY: 46,
        head: [["#", "SKU", "Descripción", "Cant.", "P. Unit.", "Subtotal"]],
        body: items.map((i, idx) => [
          String(idx + 1),
          i.sku,
          i.name,
          String(i.quantity),
          formatPrice(i.price),
          formatPrice(i.price * i.quantity),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 8;
      const base = total / 1.15;
      const iva = total - base;

      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.text(`Subtotal (sin IVA): ${formatPrice(base)}`, 140, finalY);
      doc.text(`IVA (15%): ${formatPrice(iva)}`, 140, finalY + 6);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL: ${formatPrice(total)}`, 140, finalY + 14);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text("Precios incluyen IVA. Cotización válida por 7 días. Sujeta a disponibilidad de stock.", 14, finalY + 26);
      doc.text(`Consultas: wa.me/${phone} | ventas@rgtechsolutions.ec`, 14, finalY + 32);

      doc.save(`Proforma-RGTech-${folio}.pdf`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tu cotización está vacía</h1>
        <p className="text-gray-600 mb-6">Explora el catálogo y agrega los productos que necesitas.</p>
        <Link href="/productos" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition">
          Ir al Catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Tu Cotización</h1>
        <button onClick={clearCart} className="text-sm text-red-600 hover:underline flex items-center space-x-1">
          <Trash2 className="h-4 w-4" /><span>Vaciar todo</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Lista de ítems */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((i) => (
            <div key={i.sku} className="flex items-center gap-4 border border-gray-200 rounded-xl p-4 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{i.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-1">SKU: {i.sku}</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">{formatPrice(i.price)} c/u</p>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => updateQuantity(i.sku, i.quantity - 1)} className="p-1 border border-gray-300 rounded hover:bg-gray-100" aria-label="Disminuir">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-medium">{i.quantity}</span>
                <button onClick={() => updateQuantity(i.sku, i.quantity + 1)} className="p-1 border border-gray-300 rounded hover:bg-gray-100" aria-label="Aumentar">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="w-24 text-right font-bold text-gray-900">{formatPrice(i.price * i.quantity)}</p>
              <button onClick={() => removeItem(i.sku)} className="p-2 text-red-500 hover:bg-red-50 rounded" aria-label="Eliminar">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Link href="/productos" className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:underline">
            <ArrowLeft className="h-4 w-4" /><span>Seguir comprando</span>
          </Link>
        </div>

        {/* Resumen */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 h-fit space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Resumen</h2>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Productos ({items.reduce((s, i) => s + i.quantity, 0)})</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-900 border-t pt-4">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <p className="text-xs text-gray-400">Impuestos incluidos. El total es referencial hasta confirmar stock.</p>

          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium bg-green-500 hover:bg-green-600 text-white transition"
          >
            <MessageCircle className="h-5 w-5" />
            <span>Cotizar todo por WhatsApp</span>
          </a>

          <button
            onClick={downloadPdf}
            disabled={generatingPdf}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium border border-blue-600 text-blue-600 hover:bg-blue-50 transition disabled:opacity-60"
          >
            {generatingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
            <span>{generatingPdf ? "Generando..." : "Descargar Proforma PDF"}</span>
          </button>

          <button disabled className="w-full py-3 rounded-lg font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
            Pagar Online <span className="ml-2 text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Próximamente</span>
          </button>
        </div>
      </div>
    </div>
  );
}
