const CATEGORY_WORDS = new Set([
  "COMPUTADOR","CELULAR","IMPRESORA","MONITOR","TELEVISOR","TABLET","PARLANTE","LAVADORA","SECADORA",
  "REFRIGERADORA","MICROONDAS","TONER","TINTA","BOTELLA","CABEZAL","MOUSE","TECLADO","COMBO","CASE",
  "FUENTE","MAINBOARD","PROCESADOR","SSD","DISCO","RAM","MEMORIA","UPS","REGULADOR","INVERSOR",
  "GENERADOR","ESCANER","PROYECTOR","CAMARA","ROUTER","SWITCH","AUDIFONOS","HEADSETS","SPEAKERS",
  "MICROFONO","CONSOLA","VIDEOJUEGO","CONTROL","SOPORTE","MOCHILA","CABLE","ADAPTADOR","HUB","DOCKING",
  "LICENCIA","GARANTIA","BONO","ETIQUETAS","CINTA","RIBBON","TANQUE","KIT","PROMO","ACCESS","POINT",
  "SERVIDOR","TERMINAL","LECTOR","VISOR","CAJON","PANTALLA","SMARTWATCH","POWERSTATION","ESTACION",
  "TRANSCEPTOR","TARJETA","VENTILADOR","COOLER","DISIPADOR","PASTA","COVER","GAFAS","PALANCA","GAME",
  "OPTICO","FLASHMEMORY","RESMA","PAPEL","ROLLO","DETERGENTE","GORRA","CAMISETA","BALON","SOBRE",
  "PLAYER","STREAMING","ENCHUFE","TIRA","LED","SENSOR","VIDEO","PORTERO","GRABADORA","WEB","CAM",
  "PDU","TRANSFORMADOR","MODULO","CUNA","BATERIA","CARGADOR","CANDADO","REPUESTO","TAMBOR","CONSUMIBLE",
  "ACCESORIO","ACCESORIOS","SCANNER","TELEVISORES","LAVADORAS","REFRIGERADORAS","SECADORAS","IMPRESORAS",
]);

const BRAND_BY_PREFIX: Record<string, string> = {
  DEL: "Dell", HPI: "HP", EPS: "Epson", CAN: "Canon", LG0: "LG", SAM: "Samsung", APP: "Apple",
  XIA: "Xiaomi", HON: "Honor", LEN: "Lenovo", ASU: "Asus", GIG: "Gigabyte", TPL: "TP-Link",
  JBL: "JBL", LOG: "Logitech", ZEB: "Zebra", BRO: "Brother", KIN: "Kingston", ADA: "ADATA",
  CRU: "Crucial", WES: "Western Digital", SEA: "Seagate", AMD: "AMD", INT: "Intel", ABL: "Ablerex",
  TRI: "Tripp Lite", ECO: "EcoFlow", BLU: "Bluetti", SON: "Sony", NIN: "Nintendo", MIB: "Mibro",
  TER: "Teros", GEN: "Genius", SPE: "Speedmind", ACE: "Acer", DLI: "D-Link", MER: "Mercusys",
  AOC: "AOC", COO: "Cooler Master", ANT: "Antec", VER: "Verbatim", UNI: "Unipower", WHI: "Whirlpool",
  ACR: "Acros", ENV: "Env", MIB: "Mibro", ENE: "Energia", CDP: "CDP", SAT: "SAT", AMA: "Amazon",
};

export function buildImageQuery(name: string, sku: string): string {
  let clean = name
    .replace(/HPINC/g, "HP")
    .replace(/TPLINK/g, "TP-Link")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const lastSlash = clean.split("/").pop() || clean;
  let tokens = lastSlash.split(" ").filter(Boolean);

  while (tokens.length && CATEGORY_WORDS.has(tokens[0].toUpperCase().replace(/[^A-ZÁÉÍÓÚ]/g, ""))) {
    tokens.shift();
  }

  let q = tokens.slice(0, 5).join(" ");
  const brand = BRAND_BY_PREFIX[sku.slice(0, 3).toUpperCase()];
  if (brand && !q.toLowerCase().includes(brand.toLowerCase().split("-")[0])) {
    q = `${brand} ${q}`;
  }
  return (q || clean).slice(0, 120);
}

export async function googleImageSearch(
  query: string,
  key: string,
  cx: string
): Promise<{ link: string; mime: string }[]> {
  const url =
    `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}` +
    `&cx=${encodeURIComponent(cx)}&searchType=image&num=3&safe=active&q=${encodeURIComponent(query)}`;

  const res = await fetch(url);
  if (res.status === 403 || res.status === 429) {
    const err: any = new Error("QUOTA_EXCEEDED");
    err.quota = true;
    throw err;
  }
  if (!res.ok) throw new Error(`Google API respondió ${res.status}`);
  const json = await res.json();
  return (json.items || []).map((i: any) => ({ link: i.link as string, mime: (i.mime || "") as string }));
}
