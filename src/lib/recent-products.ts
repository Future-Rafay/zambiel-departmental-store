export const RECENT_PRODUCTS_COOKIE = "zambiel-recent-products";
export const RECENT_PRODUCTS_MAX = 6;

export function parseRecentProducts(value?: string) {
  if (!value) return [];
  let decoded = value;
  try { decoded = decodeURIComponent(value); } catch { return []; }
  return [...new Set(decoded.split(",").filter((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 160))].slice(0, RECENT_PRODUCTS_MAX);
}

export function addRecentProduct(value: string | undefined, slug: string) {
  return [slug, ...parseRecentProducts(value).filter((item) => item !== slug)].slice(0, RECENT_PRODUCTS_MAX);
}
