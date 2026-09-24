export type Locale = "de" | "en";
export type User = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
};
export type Session = { token: string; expiresAt: string; user: User };
export type Variant = {
  id: string;
  name: string;
  sku: string;
  priceRappen: number;
  stockAvailable: number | null;
  imageUrl: string | null;
  optionValues: {
    optionId: string;
    valueId: string;
    value: string;
    optionName: string;
  }[];
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  minimumPriceRappen: number;
  available: boolean;
  category: { id: string; name: string; slug: string };
  media: { id: string; url: string | null; alt: string }[];
  options: {
    id: string;
    name: string;
    values: { id: string; value: string }[];
  }[];
  variants: Variant[];
};
export type ProductPreview = Pick<
  Product,
  "id" | "slug" | "name" | "imageUrl" | "minimumPriceRappen"
>;
export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  productCount: number;
};
export type Promotion = {
  id: string;
  code: string;
  type: string;
  value: number | string;
  minimumSubtotalRappen: number | null;
  endsAt: string | null;
};
export type HomeCatalog = {
  categories: Category[];
  showcase: Product[];
  featured: Product[];
  newest: Product[];
  bestSellers: Product[];
  promotions: Promotion[];
};
export type CatalogSort =
  | "featured"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name";
export type CatalogFilters = {
  query?: string;
  category?: string;
  availableOnly?: boolean;
  minPriceRappen?: number;
  maxPriceRappen?: number;
  sort?: CatalogSort;
};
export type CatalogPage = {
  items: Product[];
  page: number;
  pageCount: number;
  total: number;
};
export type ProductResponse = { product: Product; related: Product[] };
export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variant: string;
  imageUrl: string | null;
  priceRappen: number;
  quantity: number;
};
export type Address = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  streetExtra: string | null;
  city: string;
  countryCode: string;
  isDefault: boolean;
};
export type Country = {
  countryCode: string;
  nameDe: string;
  nameEn: string;
  deliveryFeeRappen: number;
  minimumSubtotalRappen: number;
};
export type Order = {
  orderNumber: string;
  status: string;
  paymentStatus?: string | null;
  paymentMethod: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  createdAt: string;
  customerName: string;
  totalRappen: number;
  subtotalRappen: number;
  discountRappen: number;
  deliveryFeeRappen: number;
  items: {
    id: string;
    name: string;
    variant: string | null;
    quantity: number;
    lineSubtotalRappen: number;
    imageUrl: string | null;
  }[];
  timeline: { status: string; at: string }[];
  activities?: {
    id: string;
    kind: string;
    status?: string;
    at: string;
    reason?: string | null;
  }[];
};
export type OrderReceipt = {
  orderNumber: string;
  trackingToken: string;
  checkoutUrl?: string | null;
};
export type CheckoutInput = {
  checkoutKey: string;
  channel: "mobile";
  locale: Locale;
  fulfillmentType: "DELIVERY" | "PICKUP";
  countryCode?: string;
  items: { variantId: string; quantity: number }[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: "STRIPE" | "CASH_ON_DELIVERY" | "PAY_AT_PICKUP";
  promoCode?: string;
  note?: string;
  address?: Omit<Address, "id" | "label" | "isDefault">;
};
export type Quote = {
  subtotalRappen: number;
  discountRappen: number;
  deliveryFeeRappen: number;
  totalRappen: number;
};
export type MobileConfig = {
  store: {
    identity?: { name: string; tagline?: { de: string; en: string } };
    contact?: { email: string | null; phone: string | null };
    brand?: Record<string, unknown>;
    [key: string]: unknown;
  };
  countries: Country[];
  fulfillment: {
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
    [key: string]: unknown;
  };
};
