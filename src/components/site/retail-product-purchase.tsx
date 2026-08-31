"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";

import { useCart } from "@/components/site/cart-context";
import { formatStoreMoney, type StoreLocale } from "@/config/store";

type Variant = {
  id: string;
  sku: string | null;
  name: string;
  priceRappen: number;
  compareAtPriceRappen: number | null;
  stockAvailable: number | null;
  imageUrl: string | null;
  optionValues: Array<{ optionId: string; optionName: string; valueId: string; value: string }>;
};

export function RetailProductPurchase({
  locale,
  productName,
  productImage,
  options,
  variants,
}: {
  locale: StoreLocale;
  productName: string;
  productImage: string | null;
  options: Array<{ id: string; name: string; values: Array<{ id: string; value: string }> }>;
  variants: Variant[];
}) {
  const de = locale === "de";
  const [selected, setSelected] = useState<Record<string, string>>(() => Object.fromEntries((variants[0]?.optionValues ?? []).map((value) => [value.optionId, value.valueId])));
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const { addMany } = useCart();
  const variant = useMemo(() => variants.find((candidate) => options.every((option) => candidate.optionValues.some((value) => value.optionId === option.id && value.valueId === selected[option.id]))) ?? (options.length ? null : variants[0] ?? null), [options, selected, variants]);
  const stock = variant ? variant.stockAvailable : null;
  const available = Boolean(variant && (stock === null || stock > 0));

  function chooseValue(optionId: string, valueId: string) {
    const next = { ...selected, [optionId]: valueId };
    const nextVariant = variants.find((candidate) => options.every((option) => candidate.optionValues.some((value) => value.optionId === option.id && value.valueId === next[option.id])));
    setSelected(next);
    setQuantity((current) => Math.max(1, Math.min(current, nextVariant?.stockAvailable ?? 99)));
    setMessage("");
  }

  function addToCart() {
    if (!variant || !available) return;
    addMany([{ variantId: variant.id, choiceNames: variant.optionValues.map(({ optionName, value }) => `${optionName}: ${value}`), quantity, productName, variantName: variant.name, unitPriceRappen: variant.priceRappen, imageUrl: variant.imageUrl ?? productImage }]);
    setMessage(de ? "Zum Warenkorb hinzugefügt." : "Added to cart.");
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <p className="text-3xl font-bold tabular-nums text-primary">{variant ? formatStoreMoney(variant.priceRappen, locale) : "—"}</p>
        {variant?.compareAtPriceRappen ? <p className="text-lg tabular-nums text-muted line-through">{formatStoreMoney(variant.compareAtPriceRappen, locale)}</p> : null}
      </div>
      {variant?.sku ? <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">SKU {variant.sku}</p> : null}

      <div className="mt-7 space-y-6">
        {options.map((option) => (
          <fieldset key={option.id}>
            <legend className="mb-3 text-sm font-bold text-foreground">{option.name}</legend>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const id = `option-${option.id}-${value.id}`;
                const possible = variants.some((candidate) => options.every((other) => candidate.optionValues.some((candidateValue) => candidateValue.optionId === other.id && candidateValue.valueId === (other.id === option.id ? value.id : selected[other.id]))));
                return (
                  <label key={value.id} htmlFor={id} className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-bold transition-colors ${possible ? "cursor-pointer" : "cursor-not-allowed opacity-40"} ${selected[option.id] === value.id ? "border-primary bg-primary text-white" : "border-border bg-surface hover:border-primary/40"}`}>
                    <input id={id} className="sr-only" type="radio" name={option.id} value={value.id} disabled={!possible} checked={selected[option.id] === value.id} onChange={() => chooseValue(option.id, value.id)} />
                    {value.value}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <p className={`mt-6 text-sm font-bold ${available ? "text-success" : "text-destructive"}`} role="status">
        {available ? (stock === null ? (de ? "Verfügbar" : "Available") : de ? `${stock} auf Lager` : `${stock} in stock`) : de ? "Diese Variante ist nicht verfügbar." : "This variant is unavailable."}
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="inline-flex min-h-12 items-center justify-between rounded-xl border border-border bg-surface sm:w-36">
          <button type="button" className="min-h-11 min-w-11" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label={de ? "Menge verringern" : "Decrease quantity"}><Minus className="mx-auto h-4 w-4" aria-hidden="true" /></button>
          <output aria-live="polite" className="font-bold tabular-nums">{quantity}</output>
          <button type="button" className="min-h-11 min-w-11" onClick={() => setQuantity((value) => Math.min(stock ?? 99, value + 1))} aria-label={de ? "Menge erhöhen" : "Increase quantity"}><Plus className="mx-auto h-4 w-4" aria-hidden="true" /></button>
        </div>
        <button type="button" onClick={addToCart} disabled={!available} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50">
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />{de ? "In den Warenkorb" : "Add to cart"}
        </button>
      </div>
      <p className="mt-3 min-h-6 text-sm font-medium text-success" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
