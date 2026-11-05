import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { StorefrontImage } from "@/components/site/storefront-image";
import type { StoreLocale } from "@/config/store";
import { productCountLabel } from "@/lib/catalog-display";

export type CategoryCardData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  productCount: number;
};

export function CategoryCard({ category, locale, hrefBase }: { category: CategoryCardData; locale: StoreLocale; hrefBase?: string }) {
  const de = locale === "de";
  return (
    <Link href={`${hrefBase ?? `/${locale}/categories`}/${category.slug}`} className="group overflow-hidden rounded-card border border-border bg-surface transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-warm">
        <StorefrontImage
          src={category.imageUrl}
          alt=""
          fill
          sizes="(max-width: 1024px) 50vw, 25vw"
          className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03] sm:p-5"
        />
      </div>
      <div className="p-3 sm:p-6">
        <p className="text-sm text-muted">{productCountLabel(category.productCount, de)}</p>
        <h2 className="mt-1 flex items-start justify-between gap-2 text-base font-bold text-primary hyphens-auto sm:mt-2 sm:items-center sm:gap-3 sm:text-xl">
          <span className="min-w-0 break-words">{category.name}</span><ArrowRight className="hidden h-5 w-5 shrink-0 text-secondary transition-transform group-hover:translate-x-1 sm:block" aria-hidden="true" />
        </h2>
        {category.description ? <p className="mt-3 hidden text-sm leading-6 text-muted sm:line-clamp-2">{category.description}</p> : null}
      </div>
    </Link>
  );
}
