"use client";

import { useState } from "react";

import { StorefrontImage } from "@/components/site/storefront-image";
import type { StoreLocale } from "@/config/store";

type GalleryImage = { id: string; url: string | null; alt: string };

export function ProductGallery({ images, locale, productName }: { images: GalleryImage[]; locale: StoreLocale; productName: string }) {
  const [selectedId, setSelectedId] = useState(images[0]?.id);
  const selected = images.find((image) => image.id === selectedId) ?? images[0];
  const de = locale === "de";

  if (!selected) {
    return <div className="relative aspect-square overflow-hidden rounded-card border border-border bg-surface-warm"><StorefrontImage src={null} alt={productName} fill className="object-contain p-8" /></div>;
  }

  return (
    <div>
      <div id="product-main-image" className="relative aspect-square overflow-hidden rounded-card border border-border bg-surface">
        <StorefrontImage key={selected.id} src={selected.url} alt={selected.alt || productName} fill className="object-contain p-5 sm:p-8" sizes="(max-width: 1024px) 100vw, 50vw" priority />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2" aria-label={de ? "Produktbilder" : "Product images"}>
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              aria-controls="product-main-image"
              aria-pressed={image.id === selected.id}
              aria-label={de ? `Bild ${index + 1} von ${images.length} anzeigen` : `View image ${index + 1} of ${images.length}`}
              onClick={() => setSelectedId(image.id)}
              className={`relative size-20 shrink-0 overflow-hidden rounded-control border-2 bg-surface transition-colors sm:size-24 ${image.id === selected.id ? "border-primary" : "border-border hover:border-primary/50"}`}
            >
              <StorefrontImage src={image.url} alt="" fill className="object-contain p-2" sizes="96px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
