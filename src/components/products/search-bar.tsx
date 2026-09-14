"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

export default function SearchBar({ initialQ, currentCat }: { initialQ: string; currentCat: string }) {
  const [term, setTerm] = useState(initialQ);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (term) params.set("q", term);
      if (currentCat) params.set("cat", currentCat);
      startTransition(() => router.replace(`/productos?${params.toString()}`));
    }, 350);
    return () => clearTimeout(t);
  }, [term, currentCat, router]);

  return (
    <div className="relative max-w-xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <input
        type="text"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Buscar laptops, monitores, toners..."
        className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {isPending && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500 animate-spin" />}
    </div>
  );
}
