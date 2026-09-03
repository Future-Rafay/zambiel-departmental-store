export type RetailCategoryOption = { id: string; nameEn: string; parent?: { nameEn: string } | null };

export type RetailVariant = {
  id: string; nameEn: string; nameDe: string; sku: string | null; barcode: string | null; weightGrams: number | null;
  priceRappen: number; compareAtPriceRappen: number | null; stockOnHand: number; stockReserved: number;
  lowStockThreshold: number | null; active: boolean; trackInventory: boolean;
  optionValues: Array<{ optionValue: { value: string; option: { name: string } } }>;
};

export type RetailProductEdit = {
  id: string; categoryId: string; slug: string; nameEn: string; nameDe: string;
  descriptionEn: string | null; descriptionDe: string | null; imageKey: string | null; imageUrl?: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"; featured: boolean;
  seoTitleEn: string | null; seoTitleDe: string | null; seoDescriptionEn: string | null; seoDescriptionDe: string | null;
  variants: RetailVariant[]; tags: Array<{ name: string }>;
  media: Array<{ id: string; imageUrl: string | null; altEn: string | null; altDe: string | null; sortOrder: number; variantId: string | null }>;
};
