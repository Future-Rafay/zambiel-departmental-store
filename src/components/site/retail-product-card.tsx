import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { formatStoreMoney, type StoreLocale } from "@/config/store";
import {
  RetailProductCardAction,
  type ProductCardVariant,
} from "@/components/site/retail-product-card-action";
import { StorefrontImage } from "@/components/site/storefront-image";

export type RetailProductCardData = {
  slug: string;
  name: string;
  imageUrl: string | null;
  category: { name: string };
  minimumPriceRappen: number;
  maximumPriceRappen: number;
  available: boolean;
  options: Array<{ id: string }>;
  variants: ProductCardVariant[];
};

export function RetailProductCard({ product, locale, hrefBase }: { product: RetailProductCardData; locale: StoreLocale; hrefBase?: string }) {
  const de = locale === "de";
  const href = `${hrefBase ?? `/${locale}/products`}/${product.slug}`;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
      <div className="relative aspect-square overflow-hidden bg-surface-warm">
        <Link href={href} className="absolute inset-0" aria-label={`${product.name} ${de ? "ansehen" : "view"}`}>
          {product.imageUrl ? (
            <StorefrontImage src={product.imageUrl} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03]" />
          ) : <StorefrontImage src={null} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-5" />}
        </Link>
        {!product.available ? <span className="absolute left-3 top-3 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-white">{de ? "Nicht verfügbar" : "Unavailable"}</span> : null}
        <div className="product-card-action absolute inset-x-3 bottom-3 z-10">
          <RetailProductCardAction available={product.available} href={href} locale={locale} options={product.options} productImage={product.imageUrl} productName={product.name} variants={product.variants} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{product.category.name}</p>
        <h3 className="mt-2 line-clamp-2 text-base font-bold leading-6 text-primary sm:text-lg">{product.name}</h3>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <p className="font-bold tabular-nums text-foreground">
            {product.minimumPriceRappen === product.maximumPriceRappen ? formatStoreMoney(product.minimumPriceRappen, locale) : `${de ? "ab" : "from"} ${formatStoreMoney(product.minimumPriceRappen, locale)}`}
          </p>
          <ArrowRight className="h-5 w-5 text-secondary transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}
