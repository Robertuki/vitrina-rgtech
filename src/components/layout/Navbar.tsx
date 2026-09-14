"use client";
import Link from "next/link";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import { useEffect, useState } from "react";

export default function Navbar() {
  const totalItems = useCartStore((s) => s.totalItems());
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-blue-600">RG Tech</span>
          <span className="hidden text-sm text-gray-500 sm:inline-block">Solutions</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link href="/productos" className="text-gray-700 hover:text-blue-600 transition">Catálogo</Link>
          <Link href="/financiamiento" className="text-gray-700 hover:text-blue-600 transition">Financiamiento</Link>
          <Link href="/contacto" className="text-gray-700 hover:text-blue-600 transition">Contacto</Link>
        </nav>

        <div className="flex items-center space-x-4">
          <Link href="/carrito" className="relative p-2 text-gray-700 hover:text-blue-600 transition">
            <ShoppingCart className="h-6 w-6" />
            {mounted && totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>
          <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden border-t p-4 space-y-2 bg-white">
          <Link href="/productos" className="block py-2 text-gray-700" onClick={() => setIsOpen(false)}>Catálogo</Link>
          <Link href="/financiamiento" className="block py-2 text-gray-700" onClick={() => setIsOpen(false)}>Financiamiento</Link>
          <Link href="/contacto" className="block py-2 text-gray-700" onClick={() => setIsOpen(false)}>Contacto</Link>
        </div>
      )}
    </header>
  );
}
