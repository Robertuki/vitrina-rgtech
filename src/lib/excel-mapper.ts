import * as XLSX from "xlsx";

export interface MappedProduct {
  sku: string;
  name: string;
  supplier_cost: number;
  category_slug: string;
  source_sheet: string;
  role: "base" | "linea" | "promo";
  priority: number;
  promo_channel?: string;
  promo_comment?: string;
  brand_line?: string;
}

export interface SheetReport {
  sheet: string;
  role: string;
  rowsRead: number;
  skippedHeaderRows: number;
  skippedInvalidRows: number;
  mapped: number;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

const CODE_ALIASES = ["codigo", "cod", "sku", "code"];
const PRICE_ALIASES = ["precio", "costo", "valor", "price"];
const CHANNEL_ALIASES = ["promociones", "canal"];
const COMMENT_ALIASES = ["comentario", "observacion", "nota"];
const BRAND_ALIASES = ["marca", "linea", "brand"];
const NAME_ALIASES = ["nombre", "descripcion", "desc", "producto"];
const CODE_HEADER_SET = new Set(["codigodelproducto", "codigoproducto", "codigopromo", "codigo", "cod", "sku"]);

const TAXONOMY: { slug: string; keywords: string[] }[] = [
  { slug: "fotografia", keywords: ["lente", "mirrorless", "camaracanon", "eosr", "reflex"] },
  { slug: "webcams", keywords: ["camaralogitech", "webcam", "brio"] },
  { slug: "seguridad-cctv", keywords: ["camaraip", "camaratplink", "camaravigi", "camaratapo", "camaramercusys", "camaradlink", "grabadora", "nvr", "dvr", "videoportero", "insight"] },
  { slug: "celulares", keywords: ["celular", "iphone", "smartphone"] },
  { slug: "accesorios-computo", keywords: ["mochila", "soporte", "stand", "funda", "mica", "cover", "carcasa", "cable", "hub", "docking", "dock"] },
  { slug: "tablets", keywords: ["tablet"] },
  { slug: "laptops", keywords: ["portatil", "laptop", "notebook", "macbook", "zenbook", "vivobook", "expertbook", "elitebook", "probook", "chromebook"] },
  { slug: "servidores", keywords: ["servidor", "poweredge", "proliant"] },
  { slug: "desktops", keywords: ["desktop", "torre", "aio", "allinone", "minipc", "nuc", "computador"] },
  { slug: "monitores", keywords: ["monitor"] },
  { slug: "televisores", keywords: ["televisor", "videowall"] },
  { slug: "pos-retail", keywords: ["lector", "quickscan", "cajondedinero", "visordeprecio", "terminalmovil", "handheld", "termica"] },
  { slug: "impresoras", keywords: ["impresora", "ploter", "plotter", "multifuncion"] },
  { slug: "tintas-y-toners", keywords: ["toner", "tinta", "botella", "cartucho", "ribbon", "cabezal", "mantenimiento"] },
  { slug: "escaneres", keywords: ["escaner", "scanner"] },
  { slug: "proyeccion", keywords: ["proyector", "presentador"] },
  { slug: "componentes-pc", keywords: ["mainboard", "motherboard", "procesador", "ryzen", "corei", "ram", "ssd", "disco", "fuente", "case", "gabinete", "cooler", "tarjetadevideo", "geforce", "rtx", "radeon", "ventilador", "disipador", "pastatermica", "tarjetadered"] },
  { slug: "networking", keywords: ["router", "switch", "accesspoint", "puntodeacceso", "transceptor", "inyector", "extensorderango", "repetidor", "modem", "mifi", "omada", "nuclias", "adaptadordered"] },
  { slug: "audio", keywords: ["parlante", "speaker", "audifono", "auricular", "headset", "microfono", "soundbar", "earbuds", "audio"] },
  { slug: "electrodomesticos", keywords: ["lavadora", "lavaseca", "secadora", "refrigeradora", "microondas", "acondicionado"] },
  { slug: "energia", keywords: ["ups", "regulador", "inversor", "generador", "powerstation", "powerbank", "estaciondecarga", "bluetti", "ecoflow", "pdu", "transformador"] },
  { slug: "smart-home", keywords: ["enchufe", "tiraled", "smartplug", "sensor"] },
  { slug: "gaming", keywords: ["consola", "videojuego", "ps5", "ps4", "xbox", "switch", "sillagamer", "gamepad", "dualsense"] },
  { slug: "perifericos", keywords: ["teclado", "mouse", "combo", "mousepad"] },
  { slug: "licencias-software", keywords: ["licencia", "kaspersky", "antivirus", "software"] },
  { slug: "oficina", keywords: ["resma", "papel"] },
  { slug: "muebles", keywords: ["silla"] },
];

export function inferCategorySlug(name: string): string {
  const n = norm(name);
  for (const cat of TAXONOMY) {
    if (cat.keywords.some((k) => n.includes(norm(k)))) return cat.slug;
  }
  return "general";
}

export function parsePrice(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return isFinite(raw) ? raw : null;
  const cleaned = String(raw).replace(/[$\s]/g, "").replace(/,(?=\d{3}(?:\D|$))/g, "");
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : null;
}

function sheetRole(name: string): { role: MappedProduct["role"]; priority: number } {
  const n = norm(name);
  if (n.includes("promo")) return { role: "promo", priority: 2 };
  if (n.includes("celular") || n.includes("computo") || n.includes("consumo") || n.includes("lista")) return { role: "linea", priority: 1 };
  return { role: "base", priority: 0 };
}

function detectColumns(headerRow: any[]): Record<string, number> {
  const cols: Record<string, number> = {};
  const taken = new Set<number>();
  const assign = (key: string, aliases: string[], exact = false) => {
    for (let i = 0; i < headerRow.length; i++) {
      if (taken.has(i)) continue;
      const h = norm(String(headerRow[i] ?? ""));
      if (!h) continue;
      const hit = exact ? aliases.some((a) => h === a || h.includes(a)) : aliases.some((a) => h.includes(a));
      if (hit) { cols[key] = i; taken.add(i); return; }
    }
  };
  assign("code", CODE_ALIASES);
  assign("price", PRICE_ALIASES);
  assign("channel", CHANNEL_ALIASES, true);
  assign("comment", COMMENT_ALIASES);
  assign("brand", BRAND_ALIASES);
  assign("name", NAME_ALIASES);
  return cols;
}

export function mapWorkbook(workbook: XLSX.WorkBook): { products: MappedProduct[]; reports: SheetReport[] } {
  const bySku = new Map<string, MappedProduct>();
  const reports: SheetReport[] = [];

  const sheets = workbook.SheetNames
    .map((n) => ({ n, meta: sheetRole(n) }))
    .sort((a, b) => a.meta.priority - b.meta.priority);

  for (const { n, meta } of sheets) {
    const rows = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[n], { header: 1, defval: null });
    const report: SheetReport = { sheet: n, role: meta.role, rowsRead: 0, skippedHeaderRows: 0, skippedInvalidRows: 0, mapped: 0 };
    let cols: Record<string, number> | null = null;

    for (const row of rows) {
      if (!row || row.every((c) => c == null || String(c).trim() === "")) continue;
      report.rowsRead++;
      if (!cols) { cols = detectColumns(row); continue; }

      const rawCode = row[cols.code];
      const codeNorm = norm(String(rawCode ?? ""));
      if (!rawCode || CODE_HEADER_SET.has(codeNorm)) { report.skippedHeaderRows++; continue; }
      if (codeNorm.includes("error") || codeNorm.includes("value")) { report.skippedInvalidRows++; continue; }

      const name = String(row[cols.name] ?? "").trim();
      const price = parsePrice(row[cols.price]);
      if (!name || price == null) { report.skippedInvalidRows++; continue; }

      const brand = cols.brand != null ? String(row[cols.brand] ?? "").trim() : "";
      const sku = String(rawCode).trim();
      const product: MappedProduct = {
        sku,
        name,
        supplier_cost: price,
        category_slug: inferCategorySlug(name),
        source_sheet: n,
        role: meta.role,
        priority: meta.priority,
        promo_channel: cols.channel != null ? String(row[cols.channel] ?? "").trim() : undefined,
        promo_comment: cols.comment != null ? String(row[cols.comment] ?? "").trim() || undefined : undefined,
        brand_line: brand && !norm(brand).includes("error") ? brand : undefined,
      };

      const existing = bySku.get(sku);
      if (!existing || product.priority > existing.priority) bySku.set(sku, product);
      report.mapped++;
    }
    if (report.mapped > 0) reports.push(report);
  }
  return { products: Array.from(bySku.values()), reports };
}