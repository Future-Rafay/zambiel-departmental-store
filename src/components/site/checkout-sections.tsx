import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/orders";

export type CheckoutUser = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: {
    street: string;
    streetExtra?: string | null;
    postalCode: string;
    city: string;
  } | null;
};
export type Quote = {
  subtotalRappen: number;
  discountRappen: number;
  deliveryFeeRappen: number;
  totalRappen: number;
};
export type FieldErrors = Partial<Record<string, string>>;
export type FulfillmentType = "DELIVERY" | "PICKUP";
export type PaymentMethod = "STRIPE" | "CASH_ON_DELIVERY" | "PAY_AT_PICKUP";

const radioCard =
  "flex min-h-14 cursor-pointer items-center gap-3  border border-border bg-surface px-4 py-3 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/15";

export function FulfillmentChoices({
  de,
  value,
  onChange,
}: {
  de: boolean;
  value: FulfillmentType;
  onChange: (value: FulfillmentType) => void;
}) {
  return (
    <Card className="space-y-4 p-5">
      <fieldset>
        <legend className="mb-3 font-display text-xl font-bold">
          {de ? "Lieferart" : "Fulfillment"}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["PICKUP", "DELIVERY"] as const).map((option) => (
            <label key={option} className={radioCard}>
              <input
                type="radio"
                name="fulfillmentType"
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
              />
              <span className="font-semibold">
                {option === "PICKUP"
                  ? de
                    ? "Abholung"
                    : "Pickup"
                  : de
                    ? "Lieferung"
                    : "Delivery"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}

export function CustomerFields({
  de,
  user,
  errors,
}: {
  de: boolean;
  user?: CheckoutUser;
  errors: FieldErrors;
}) {
  return (
    <Card className="grid gap-4 rounded-none p-5 sm:grid-cols-2">
      <h2 className="font-display text-xl font-bold sm:col-span-2">
        {de ? "Kontaktdaten" : "Contact details"}
      </h2>
      <Field id="customerName" label="Name" error={errors.customerName}>
        <Input
          id="customerName"
          name="customerName"
          autoComplete="name"
          defaultValue={user?.name ?? ""}
          required
          aria-invalid={!!errors.customerName}
          aria-describedby={
            errors.customerName ? "customerName-error" : undefined
          }
        />
      </Field>
      <Field
        id="customerEmail"
        label={de ? "E-Mail" : "Email"}
        error={errors.customerEmail}
      >
        <Input
          id="customerEmail"
          name="customerEmail"
          type="email"
          autoComplete="email"
          defaultValue={user?.email ?? ""}
          required
          aria-invalid={!!errors.customerEmail}
          aria-describedby={
            errors.customerEmail ? "customerEmail-error" : undefined
          }
        />
      </Field>
      <Field
        id="customerPhone"
        label={de ? "Telefon" : "Phone"}
        error={errors.customerPhone}
      >
        <Input
          id="customerPhone"
          name="customerPhone"
          type="tel"
          autoComplete="tel"
          defaultValue={user?.phone ?? ""}
          required
          aria-invalid={!!errors.customerPhone}
          aria-describedby={
            errors.customerPhone ? "customerPhone-error" : undefined
          }
        />
      </Field>
    </Card>
  );
}

export function AddressFields({
  de,
  user,
  errors,
  refreshQuote,
}: {
  de: boolean;
  user?: CheckoutUser;
  errors: FieldErrors;
  refreshQuote: () => void;
}) {
  return (
    <Card className="grid gap-4 rounded-none p-5 sm:grid-cols-2">
      <h2 className="font-display text-xl font-bold sm:col-span-2">
        {de ? "Lieferadresse" : "Delivery address"}
      </h2>
      <Field
        id="street"
        label={de ? "Strasse und Hausnummer" : "Street and number"}
        error={errors.street}
        className="sm:col-span-2"
      >
        <Input
          id="street"
          name="street"
          autoComplete="street-address"
          defaultValue={user?.address?.street}
          required
          aria-invalid={!!errors.street}
          aria-describedby={errors.street ? "street-error" : undefined}
        />
      </Field>
      <Field
        id="streetExtra"
        label={de ? "Adresszusatz (optional)" : "Address extra (optional)"}
        error={errors.streetExtra}
        className="sm:col-span-2"
      >
        <Input
          id="streetExtra"
          name="streetExtra"
          defaultValue={user?.address?.streetExtra ?? ""}
          aria-invalid={!!errors.streetExtra}
          aria-describedby={
            errors.streetExtra ? "streetExtra-error" : undefined
          }
        />
      </Field>
      <Field
        id="postalCode"
        label={de ? "Postleitzahl" : "Postal code"}
        error={errors.postalCode}
      >
        <Input
          id="postalCode"
          name="postalCode"
          inputMode="numeric"
          autoComplete="postal-code"
          defaultValue={user?.address?.postalCode}
          onBlur={refreshQuote}
          required
          aria-invalid={!!errors.postalCode}
          aria-describedby={errors.postalCode ? "postalCode-error" : undefined}
        />
      </Field>
      <Field id="city" label={de ? "Ort" : "City"} error={errors.city}>
        <Input
          id="city"
          name="city"
          autoComplete="address-level2"
          defaultValue={user?.address?.city}
          required
          aria-invalid={!!errors.city}
          aria-describedby={errors.city ? "city-error" : undefined}
        />
      </Field>
    </Card>
  );
}

export function PaymentChoices({
  de,
  fulfillmentType,
  paymentMethod,
  errors,
  onChange,
}: {
  de: boolean;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  errors: FieldErrors;
  onChange: (value: PaymentMethod) => void;
}) {
  const cashMethod =
    fulfillmentType === "DELIVERY" ? "CASH_ON_DELIVERY" : "PAY_AT_PICKUP";
  return (
    <Card className="space-y-4 rounded-none p-5">
      <fieldset>
        <legend className="mb-3 font-display text-xl font-bold">
          {de ? "Zahlung" : "Payment"}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={radioCard}>
            <input
              type="radio"
              name="paymentMethod"
              value="STRIPE"
              checked={paymentMethod === "STRIPE"}
              onChange={() => onChange("STRIPE")}
            />
            <span className="font-semibold">
              {de ? "Karte (Stripe)" : "Card (Stripe)"}
            </span>
          </label>
          <label className={radioCard}>
            <input
              type="radio"
              name="paymentMethod"
              value={cashMethod}
              checked={paymentMethod !== "STRIPE"}
              onChange={() => onChange(cashMethod)}
            />
            <span className="font-semibold">
              {fulfillmentType === "DELIVERY"
                ? de
                  ? "Bar bei Lieferung"
                  : "Cash on delivery"
                : de
                  ? "Bar bei Abholung"
                  : "Cash at pickup"}
            </span>
          </label>
        </div>
        {errors.paymentMethod ? (
          <p className="mt-2 text-sm text-destructive">
            {errors.paymentMethod}
          </p>
        ) : null}
      </fieldset>
      <Field
        id="note"
        label={de ? "Bestellnotiz (optional)" : "Order note (optional)"}
      >
        <textarea
          id="note"
          name="note"
          maxLength={1000}
          className="min-h-24 w-full border border-border bg-surface p-3 focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </Field>
    </Card>
  );
}

export function CheckoutSummary({
  de,
  locale,
  items,
  quote,
  error,
  errors,
  busy,
  refreshQuote,
}: {
  de: boolean;
  locale: "de" | "en";
  items: Array<{
    key: string;
    quantity: number;
    productName: string;
    unitPriceRappen: number;
  }>;
  quote: Quote | null;
  error: string;
  errors: FieldErrors;
  busy: boolean;
  refreshQuote: () => void;
}) {
  return (
    <Card className="h-fit space-y-4 rounded-none p-5 lg:sticky lg:top-24">
      <h2 className="font-display text-xl font-bold">
        {de ? "Zusammenfassung" : "Summary"}
      </h2>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.key} className="flex justify-between gap-3">
            <span>
              {item.quantity} × {item.productName}
            </span>
            <span>
              {formatMoney(item.unitPriceRappen * item.quantity, locale)}
            </span>
          </li>
        ))}
      </ul>
      <Field
        id="promoCode"
        label={de ? "Rabattcode" : "Discount code"}
        error={errors.promoCode}
      >
        <Input
          id="promoCode"
          name="promoCode"
          onBlur={refreshQuote}
          aria-invalid={!!errors.promoCode}
          aria-describedby={errors.promoCode ? "promoCode-error" : undefined}
        />
      </Field>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={refreshQuote}
      >
        {de ? "Summe aktualisieren" : "Update total"}
      </Button>
      {quote ? (
        <dl className="space-y-2 border-y border-border py-4 text-sm">
          <div className="flex justify-between">
            <dt>{de ? "Zwischensumme" : "Subtotal"}</dt>
            <dd>{formatMoney(quote.subtotalRappen, locale)}</dd>
          </div>
          {quote.discountRappen > 0 ? (
            <div className="flex justify-between">
              <dt>{de ? "Rabatt" : "Discount"}</dt>
              <dd>−{formatMoney(quote.discountRappen, locale)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>{de ? "Lieferung" : "Delivery"}</dt>
            <dd>{formatMoney(quote.deliveryFeeRappen, locale)}</dd>
          </div>
          <div className="flex justify-between pt-2 text-base font-bold">
            <dt>{de ? "Gesamt" : "Total"}</dt>
            <dd>{formatMoney(quote.totalRappen, locale)}</dd>
          </div>
        </dl>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={busy || !quote}>
        {busy
          ? de
            ? "Wird verarbeitet…"
            : "Processing…"
          : de
            ? "Bestellung aufgeben"
            : "Place order"}
      </Button>
      <div className="flex flex-wrap gap-x-4 text-xs text-muted">
        <Link href={`/${locale}/terms`} className="inline-flex min-h-11 items-center underline underline-offset-4">{de ? "AGB" : "Terms of service"}</Link>
        <Link href={`/${locale}/privacy`} className="inline-flex min-h-11 items-center underline underline-offset-4">{de ? "Datenschutzerklärung" : "Privacy policy"}</Link>
      </div>
      <p className="text-xs text-muted">
        {de
          ? "Preise, Bestand und Liefergebiet werden serverseitig erneut geprüft."
          : "Prices, stock, and delivery eligibility are revalidated by the server."}
      </p>
    </Card>
  );
}

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
