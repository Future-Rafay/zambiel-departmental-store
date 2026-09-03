import sanitizeHtml from "sanitize-html";

export type CsvRow = Record<string, string>;

export function parseCsv(source: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const [headers = [], ...records] = rows;
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, ""), record[index] ?? ""])),
  );
}

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);

export function parseMoney(value: string) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export function normalizeOptions(row: CsvRow) {
  const options: Array<{ name: string; value: string }> = [];
  for (let index = 1; index <= 3; index += 1) {
    const name = row[`Option${index} Name`]?.trim();
    const value = row[`Option${index} Value`]?.trim();
    if (!name || !value || /^(default title|title)$/i.test(name)) continue;
    const names = name.split("|").map((part) => part.trim()).filter(Boolean);
    const values = value.split("|").map((part) => part.trim()).filter(Boolean);
    if (names.length > 1 && names.length === values.length) {
      names.forEach((part, optionIndex) => options.push({ name: part, value: values[optionIndex] }));
    } else options.push({ name, value });
  }
  return options;
}

export function extractImageUrls(html: string) {
  return [...html.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
}

export function sanitizeProductDescription(html: string, importedUrls: ReadonlyMap<string, string> = new Map(), allowedImagePrefixes: readonly string[] = []) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "a", "img"],
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "width", "height", "loading"] },
    allowedSchemes: ["http", "https"],
    transformTags: {
      a: (_tagName, attributes) => ({ tagName: "a", attribs: { ...attributes, rel: "noreferrer", target: "_blank" } }),
      img: (_tagName, attributes) => {
        const source = attributes.src;
        const trusted = source && (importedUrls.get(source) ?? (allowedImagePrefixes.some((prefix) => source.startsWith(prefix)) ? source : null));
        return trusted
          ? { tagName: "img", attribs: { src: trusted, alt: attributes.alt ?? "", loading: "lazy" } }
          : { tagName: "span", attribs: {} as Record<string, string> };
      },
    },
  }).trim();
}

export function metafieldMetadata(row: CsvRow) {
  return Object.fromEntries(
    Object.entries(row).filter(([key, value]) => value.trim() && /metafield|google shopping|custom product/i.test(key)),
  );
}
