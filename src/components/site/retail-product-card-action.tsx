"use client";

import { Check, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/components/site/cart-context";
import type { StoreLocale } from "@/config/store";

export type ProductCardVariant = {
  id: string;
  name: string;
  priceRappen: number;
  stockAvailable: number | null;
  imageUrl: string | null;
  optionValues: Array<{ optionName: string; value: string }>;
};

export function RetailProductCardAction({
  available,
  href,
  locale,
  options,
  productImage,
  productName,
  variants,
}: {
  available: boolean;
  href: string;
  locale: StoreLocale;
  options: Array<{ id: string }>;
  productImage: string | null;
  productName: string;
  variants: ProductCardVariant[];
}) {
  const de = locale === "de";
  const [added, setAdded] = useState(false);
  const { addMany } = useCart();
  const variant = variants.find(({ stockAvailable }) => stockAvailable === null || stockAvailable > 0);
  const unavailable = !available || !variant;

  if (unavailable) {
    return (
      <button type="button" disabled className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-foreground/85 px-2 text-xs font-bold text-primary-foreground opacity-80 sm:px-4 sm:text-sm">
        {de ? "Nicht verfügbar" : "Unavailable"}
      </button>
    );
  }

  if (options.length) {
    return (
      <Link href={href} className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-2 text-xs font-bold text-primary-foreground hover:bg-primary-light sm:px-4 sm:text-sm sm:shadow-lg">
        {de ? "Optionen auswählen" : "Select options"}
      </Link>
    );
  }

  function addToCart() {
    if (!variant) return;
    addMany([{
      variantId: variant.id,
      choiceNames: variant.optionValues.map(({ optionName, value }) => `${optionName}: ${value}`),
      quantity: 1,
      productName,
      variantName: variant.name,
      unitPriceRappen: variant.priceRappen,
      imageUrl: variant.imageUrl ?? productImage,
    }]);
    setAdded(true);
  }

  return (
    <>
      <button type="button" onClick={addToCart} className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-control bg-primary px-2 text-xs font-bold text-primary-foreground hover:bg-primary-light sm:gap-2 sm:px-4 sm:text-sm sm:shadow-lg">
        {added ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingBag className="h-4 w-4" aria-hidden="true" />}
        {added ? (de ? "Hinzugefügt" : "Added") : (de ? "In den Warenkorb" : "Add to cart")}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {added ? (de ? "Zum Warenkorb hinzugefügt." : "Added to cart.") : ""}
      </span>
    </>
  );
}
