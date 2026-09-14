"use client";
import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useCartStore } from "@/store/cart-store";

interface Props {
  product: { product_id: string; sku: string; name: string; price: number };
  variant?: "card" | "detail";
}

export default function AddToCartButton({ product, variant = "card" }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const handle = () => {
    addItem({ product_id: product.product_id, sku: product.sku, name: product.name, price: product.price });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const base = added ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white";

  if (variant === "detail") {
    return (
      <button onClick={handle} className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition ${base}`}>
        {added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
        <span>{added ? "¡Agregado a la cotización!" : "Agregar a cotización"}</span>
      </button>
    );
  }

  return (
    <button onClick={handle} className={`w-full py-2 rounded-lg text-sm font-medium transition ${base}`}>
      {added ? "✓ Agregado" : "Agregar"}
    </button>
  );
}
