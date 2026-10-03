import { slugify } from "@/server/import/shopify-csv";

export const optionalText = (value: FormDataEntryValue | null) => String(value ?? "").trim() || null;

export function productTagNames(value: string) {
  const names = new Map<string, string>();
  for (const name of value.split(",").map((tag) => tag.trim()).filter(Boolean)) {
    const slug = slugify(name);
    if (slug) names.set(slug, name);
  }
  return [...names].map(([slug, name]) => ({ slug, name }));
}

export function categoryModeBlock(children: number, products: number) {
  if (children && products) return "CATEGORY_HAS_MIXED_DEPENDENTS";
  if (children) return "CATEGORY_HAS_OTHER_MODE_CHILDREN";
  if (products) return "CATEGORY_HAS_OTHER_MODE_PRODUCTS";
  return null;
}
