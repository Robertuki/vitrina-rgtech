import type { Metadata } from "next";
import CartClient from "@/components/cart/cart-client";

export const metadata: Metadata = {
  title: "Tu cotización | RG Tech Solutions",
  robots: { index: false, follow: false },
};

export default function CarritoPage() {
  const phone = process.env.WHATSAPP_PHONE || "593999999999";
  return <CartClient phone={phone} />;
}
