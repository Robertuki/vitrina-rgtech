import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";
import { formatPrice } from "@/lib/format";
import AddToCartButton from "./add-to-cart-button";

export interface CardProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  price: number;
  stock_status: string;
  category_name?: string | null;
  image_url?: string | null;
}

export default function ProductCard({ product }: { product: CardProduct }) {
  const out = product.stock_status === "out_of_stock";
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-lg transition flex flex-col">
      <Link href={`/producto/${product.slug}`} className="block bg-gray-100 aspect-square relative overflow-hidden">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-contain p-2"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <Package className="h-16 w-16" />
          </div>
        )}
        {out && (
          <span className="absolute top-2 left-2 bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded">Agotado</span>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1">
        {product.category_name && (
          <span className="text-xs text-blue-600 font-medium mb-1">{product.category_name}</span>
        )}
        <Link href={`/producto/${product.slug}`} className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-blue-600 transition mb-2">
          {product.name}
        </Link>
        <p className="text-xs text-gray-400 font-mono mb-3">SKU: {product.sku}</p>
        <div className="mt-auto space-y-2">
          <p className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</p>
          <AddToCartButton product={{ product_id: product.id, sku: product.sku, name: product.name, price: product.price }} />
        </div>
      </div>
    </div>
  );
}
