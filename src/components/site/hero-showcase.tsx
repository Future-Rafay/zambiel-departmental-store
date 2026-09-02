"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { StoreLocale } from "@/config/store";
import { StorefrontImage } from "@/components/site/storefront-image";

type Product = { slug: string; name: string; imageUrl: string | null };

export function HeroShowcase({
  products,
  locale,
}: {
  products: Product[];
  locale: StoreLocale;
}) {
  const de = locale === "de";
  const [slide, setSlide] = useState(0);
  const banners = [
    {
      src: "/herobanner/banner-one.png",
      alt: de
        ? "Zambiel Beauty- und Wellness-Sortiment"
        : "Zambiel beauty and wellness range",
    },
    {
      src: "/herobanner/banner-two.png",
      alt: de
        ? "Zambiel Küchen- und Haushaltsgeräte"
        : "Zambiel kitchen and household appliances",
    },
  ];
  const rows = [products.slice(0, 6), products.slice(6, 12)];
  return (
    <section
      className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10"
      aria-label={de ? "Zambiel Entdeckungen" : "Zambiel discoveries"}
    >
      <ProductStrip products={rows[0]} locale={locale} />
      <div className="relative mt-4 overflow-hidden rounded-card border border-border bg-surface shadow-sm">
        <div className="relative aspect-[16/6.8] min-h-48 sm:min-h-0">
          <Image
            src={banners[slide].src}
            alt={banners[slide].alt}
            fill
            priority={slide === 0}
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            setSlide((slide + banners.length - 1) % banners.length)
          }
          aria-label={de ? "Vorheriges Banner" : "Previous banner"}
          className="absolute left-3 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg hover:bg-white"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setSlide((slide + 1) % banners.length)}
          aria-label={de ? "Nächstes Banner" : "Next banner"}
          className="absolute right-3 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg hover:bg-white"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-primary/75 p-2"
          aria-label={de ? "Banner auswählen" : "Choose banner"}
        >
          {banners.map((banner, index) => (
            <button
              key={banner.src}
              type="button"
              onClick={() => setSlide(index)}
              aria-label={`${de ? "Banner" : "Banner"} ${index + 1}`}
              aria-current={slide === index ? "true" : undefined}
              className={`h-3 w-3 rounded-full ${slide === index ? "bg-secondary" : "bg-white/70"}`}
            />
          ))}
        </div>
      </div>
      <div className="mt-4">
        <ProductStrip products={rows[1]} locale={locale} />
      </div>
    </section>
  );
}

function ProductStrip({
  products,
  locale,
}: {
  products: Product[];
  locale: StoreLocale;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
      {products.map((product) => (
        <Link
          key={product.slug}
          href={`/${locale}/products/${product.slug}`}
          className="group relative aspect-square overflow-hidden rounded-card border border-border bg-surface"
          aria-label={product.name}
        >
          <StorefrontImage
            src={product.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 33vw, 16vw"
            className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </Link>
      ))}
    </div>
  );
}
