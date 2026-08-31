import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { StorefrontImage } from "@/components/site/storefront-image";
import type { StoreLocale } from "@/config/store";

export type CategoryCardData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  productCount: number;
};

export function CategoryCard({ category, locale }: { category: CategoryCardData; locale: StoreLocale }) {
  const de = locale === "de";
  return (
    <Link href={`/${locale}/categories/${category.slug}`} className="group overflow-hidden rounded-card border border-border bg-surface transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-warm">
        <StorefrontImage
          src={category.imageUrl}
          alt={category.imageUrl ? category.name : ""}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-sm text-muted">{category.productCount} {de ? "Produkte" : "products"}</p>
        <h2 className="mt-2 flex items-center justify-between gap-3 text-xl font-bold text-primary">
          {category.name}<ArrowRight className="h-5 w-5 shrink-0 text-secondary transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </h2>
        {category.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{category.description}</p> : null}
      </div>
    </Link>
  );
}
