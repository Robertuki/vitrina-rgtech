/**
 * ETL de productos: normaliza nombres sucios del Excel en consultas limpias.
 * Fuente única de verdad para limpieza de tokens, marcas y modelos.
 */

const STOP_WORDS = new Set([
  "ACCESORIO","ACCESORIOS","CONSUMIBLE","REPUESTO","PRODUCTO","ARTICULO","ARTÍCULO",
  "GENÉRICO","GENERICO","PROMO","BONO","GARANTIA","GARANTÍA","SERVICIO","INSTALACION",
  "INSTALACIÓN","CUSTOMER","INSTALL","PIEZAS","PIEZA","UNIDAD","CAJA","N/A","ND",
  "3Y","2Y","1Y","NEW","SEALED","OEM",
  "AUDIO","AUDIFONOS","AUDÍFONOS","ANUL","RUIDO","ANC","BLUETOOTH","BT","IPX4","IPX5",
  "IPX6","IPX7","IP54","IP55","IP67","HZ","MHZ","GHZ","HRS","HORAS","HOR","HR","H",
  "BATERIA","BATERÍA","WIRELESS","ALAMBRICO","ALAMBRICOS","ALÁMBRICOS","CONEXIÓN",
  "CONEXION","USB-C","USB","TIPO-C","LIGHTNING",
  "NEGRO","BLANCO","AZUL","ROJO","VERDE","AMARILLO","GRIS","PLATA","GOLD","ROSE",
  "COLOR","TIPO","MODELO","SERIE","VERSION","VERSIÓN","EDICION","EDICIÓN",
]);

const BRANDS = new Set([
  "CANON","DELL","HP","EPSON","LEXMARK","XEROX","BROTHER","SAMSUNG","LG","LENOVO",
  "ASUS","ACER","TP-LINK","TPLINK","LOGITECH","JBL","SONY","KINGSTON","CRUCIAL",
  "ADATA","SEAGATE","WESTERN","WD","INTEL","AMD","GIGABYTE","MSI","AOC","VIEWSONIC",
  "EATON","TRIPPLITE","TRIPP","HONEYWELL","ZEBRA","DATALOGIC","APC","CYBERPOWER",
  "3NSTAR","XIAOMI","REDMI","MI","HONOR","MIBRO","JABRA","POLY","GENIUS","TEROS",
  "APPLE","IPHONE","IPAD","MACBOOK","AIRPODS","BOSE","SENNHEISER","BEATS","MARSHALL",
  "ANKER","SOUNDPEATS","QCY","BASEUS","HAYLOU","SKULLCANDY","AUDIO-TECHNICA",
]);

export function cleanTokens(raw: string): string[] {
  return raw
    .replace(/\//g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/[,.;:]+$/g, ""))
    .filter(Boolean)
    .filter((t, i) => !(i === 0 && /^[A-Z0-9\-]{8,}$/.test(t) && /\d/.test(t)))
    .filter((t) => !STOP_WORDS.has(t.toUpperCase()))
    .filter((t) => !/^\d+[.,]?\d*$/.test(t) || t.length === 1)
    .filter((t) => !/^\d+(HZ|MHZ|GHZ|W|V|MAH|WH|GB|TB|MB|DPI|FPS|PAG|MM|CM|KG)$/i.test(t))
    .filter((t) => t.length >= 2 || /^\d$/.test(t));
}

/** Consulta principal: marca + modelo */
export function buildImageQuery(name: string, sku: string): string {
  const queries = buildImageQueries(name, sku);
  return queries[0] || cleanTokens(name).slice(0, 5).join(" ") || name;
}

/** Consultas de la más precisa a la más amplia */
export function buildImageQueries(name: string, sku: string): string[] {
  const tokens = cleanTokens(name);
  if (tokens.length === 0) return [name];

  const brandIdx = tokens.findIndex((t, i) => i < 4 && BRANDS.has(t.toUpperCase()));
  const brand = brandIdx >= 0 ? tokens[brandIdx] : "";
  const pool = brand ? tokens.filter((_, i) => i !== brandIdx) : tokens;

  const modelTokens = pool
    .filter(
      (t) =>
        (/\d/.test(t) && /[A-Za-z]/.test(t) && t.length >= 3) ||
        (/^[A-Za-z]+$/.test(t) && t.length >= 4)
    )
    .slice(0, 4);

  const queries: string[] = [];
  if (brand && modelTokens.length > 0) queries.push(`${brand} ${modelTokens.join(" ")}`);
  // ✅ NUEVA: sin la marca madre (atrapa sub-marcas: "REDMI BUDS 6 PLAY")
  if (pool.length > 0) queries.push(pool.slice(0, 5).join(" "));
  if (brand) queries.push(`${brand} ${pool.slice(0, 3).join(" ")}`);
  queries.push(tokens.slice(0, 6).join(" "));
  queries.push(`${tokens.slice(0, 5).join(" ")} amazon OR ebay`);

  return Array.from(new Set(queries.map((q) => q.trim()))).filter(Boolean);
}
