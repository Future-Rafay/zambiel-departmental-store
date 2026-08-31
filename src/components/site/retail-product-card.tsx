import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { formatStoreMoney, type StoreLocale } from "@/config/store";
import { StorefrontImage } from "@/components/site/storefront-image";

export type RetailProductCardData = {
  slug: string;
  name: string;
  imageUrl: string | null;
  category: { name: string };
  minimumPriceRappen: number;
  maximumPriceRappen: number;
  available: boolean;
};

export function RetailProductCard({ product, locale }: { product: RetailProductCardData; locale: StoreLocale }) {
  const de = locale === "de";
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
      <Link href={`/${locale}/products/${product.slug}`} className="relative aspect-square overflow-hidden bg-surface-warm" aria-label={`${product.name} ${de ? "ansehen" : "view"}`}>
        {product.imageUrl ? (
          <StorefrontImage src={product.imageUrl} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : <StorefrontImage src={null} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-5" />}
        {!product.available ? <span className="absolute left-3 top-3 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-white">{de ? "Nicht verfügbar" : "Unavailable"}</span> : null}
      </Link>
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
