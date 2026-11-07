"use client";

import { StorefrontImage } from "@/components/site/storefront-image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { useCart } from "@/components/site/cart-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/orders";

export function CartPage({ locale, b2b = false }: { locale: "de" | "en"; b2b?: boolean }) {
  const { items, remove, setQuantity } = useCart();
  const de = locale === "de";
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, item) => sum + item.unitPriceRappen * item.quantity,
    0,
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between border-b border-border/60 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-secondary-text">
            ZAMBIEL
          </span>
          <h1 className="mt-1 font-display text-4xl font-extrabold text-primary">
            {de ? "Ihr Warenkorb" : "Your Cart"}
          </h1>
        </div>
        {items.length > 0 && (
          <span className="shrink-0 rounded-pill bg-secondary/15 px-4 py-1 text-xs font-bold text-secondary-text">
            {itemCount}{" "}
            {de ? "Artikel" : itemCount === 1 ? "item" : "items"}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <Card className="mx-auto max-w-7xl space-y-5 p-10 text-center">
          <h2 className="font-display text-2xl font-bold text-primary">
            {de ? "Ihr Warenkorb ist noch leer" : "Your cart is empty"}
          </h2>
          <p className="text-sm text-muted">
            {de
              ? "Entdecken Sie Produkte aus unserem Sortiment."
              : "Discover products from our catalog."}
          </p>
          <Link
            href={b2b ? `/${locale}/b2b-shop` : `/${locale}/products`}
            className="inline-flex min-h-11 items-center rounded-control bg-primary px-8 font-bold text-primary-foreground"
          >
            {de ? "Produkte entdecken" : "Browse Products"}
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_21rem]">
          <ul className="min-w-0 space-y-3">
            {items.map((item) => (
              <li key={item.key}>
                <Card className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 p-4 sm:flex sm:items-center sm:gap-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-control bg-background sm:size-20">
                    <StorefrontImage
                      src={item.imageUrl ?? null}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 font-display text-lg font-bold leading-snug">
                      {item.productName}
                    </h2>
                    <p className="text-xs text-muted">{item.variantName}</p>
                    {item.choiceNames && item.choiceNames.length > 0 && (
                      <p className="mt-1 text-xs text-muted">
                        {item.choiceNames.join(", ")}
                      </p>
                    )}
                    <div className="mt-2 inline-flex items-center rounded-control border border-border">
                      <button
                        type="button"
                        className="grid size-11 place-items-center"
                        onClick={() => setQuantity(item.key, item.quantity - 1)}
                        aria-label={
                          de ? "Menge verringern" : "Decrease quantity"
                        }
                      >
                        <Minus className="size-4" />
                      </button>
                      <strong
                        className="min-w-7 text-center"
                        aria-live="polite"
                      >
                        {item.quantity}
                      </strong>
                      <button
                        type="button"
                        className="grid size-11 place-items-center"
                        onClick={() => setQuantity(item.key, item.quantity + 1)}
                        aria-label={de ? "Menge erhöhen" : "Increase quantity"}
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-between border-t border-border pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
                    <strong className="block text-primary">
                      {formatMoney(
                        item.unitPriceRappen * item.quantity,
                        locale,
                      )}
                    </strong>
                    <Button
                      type="button"
                      variant="ghost"
                      size="compact"
                      onClick={() => remove(item.key)}
                      aria-label={
                        de
                          ? `${item.productName} entfernen`
                          : `Remove ${item.productName}`
                      }
                      className="min-h-11 min-w-11 text-muted hover:text-destructive sm:mt-2"
                    >
                      <Trash2 className="size-5" />
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Card className="h-fit space-y-5 p-5 lg:sticky lg:top-24">
            <h2 className="font-display text-xl font-bold text-primary">
              {de ? "Zusammenfassung" : "Summary"}
            </h2>
            <dl className="flex justify-between border-y border-border py-4">
              <dt>{de ? "Zwischensumme" : "Subtotal"}</dt>
              <dd className="font-bold">{formatMoney(total, locale)}</dd>
            </dl>
            <Link
              href={b2b ? `/${locale}/b2b-shop/checkout` : `/${locale}/checkout`}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary font-bold text-primary-foreground"
            >
              {de ? "Zur Kasse" : "Proceed to Checkout"}
            </Link>
            <p className="text-center text-xs text-muted">
              {de
                ? "Lieferkosten und Rabatte werden an der Kasse berechnet."
                : "Delivery fees and discounts are calculated at checkout."}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
