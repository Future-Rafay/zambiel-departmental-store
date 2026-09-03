import { generateVariantMatrix, saveRetailVariant } from "@/app/admin/(protected)/retail-actions";
import { DeleteVariantDialog } from "@/components/admin/danger-actions";
import { Check, Field, TextareaField } from "@/components/admin/admin-ui";
import type { RetailProductEdit } from "@/components/admin/retail-product-types";
import { Card } from "@/components/ui/card";
import { formatMoneyInput } from "@/lib/orders";

export function RetailProductVariants({ product }: { product: RetailProductEdit }) {
  return (
    <section className="mt-8 space-y-4" aria-labelledby="variants">
      <h2 id="variants" className="font-display text-xl font-bold">Variants and inventory</h2>
      <Card className="p-5">
        <h3 className="mb-1 font-bold">Generate missing variants</h3>
        <p className="mb-4 text-sm text-muted">Define arbitrary options, one per line, for example Color: Black, White and Storage: 128 GB, 256 GB. Existing variants are preserved.</p>
        <form action={generateVariantMatrix} className="grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="productId" value={product.id} />
          <Field label="Price (CHF)" name="priceRappen" type="number" min="0" step="0.01" required />
          <div className="sm:col-span-2"><TextareaField label="Options (Name: value, value)" name="options" rows={3} required /></div>
          <div className="sm:col-span-3 flex justify-end"><button className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white">Generate missing combinations</button></div>
        </form>
      </Card>
      {product.variants.map((variant) => (
        <Card key={variant.id} className="p-5">
          <div className="mb-4"><h3 className="font-bold">{variant.nameEn}</h3><p className="text-xs text-muted">{variant.optionValues.map(({ optionValue }) => `${optionValue.option.name}: ${optionValue.value}`).join(" · ") || "Default variant"} · {variant.stockOnHand - variant.stockReserved} available</p></div>
          <form action={saveRetailVariant} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="id" value={variant.id} /><input type="hidden" name="productId" value={product.id} />
            <Field label="English variant name" name="nameEn" defaultValue={variant.nameEn} required />
            <Field label="German variant name" name="nameDe" defaultValue={variant.nameDe} />
            <Field label="SKU" name="sku" defaultValue={variant.sku ?? ""} />
            <Field label="Barcode" name="barcode" defaultValue={variant.barcode ?? ""} />
            <Field label="Price (CHF)" name="priceRappen" type="number" min="0" step="0.01" defaultValue={formatMoneyInput(variant.priceRappen)} required />
            <Field label="Compare-at (CHF)" name="compareAtPriceRappen" type="number" min="0" step="0.01" defaultValue={variant.compareAtPriceRappen == null ? "" : formatMoneyInput(variant.compareAtPriceRappen)} />
            <Field label="Low-stock threshold" name="lowStockThreshold" type="number" min="0" defaultValue={variant.lowStockThreshold ?? 5} required />
            <Field label="Weight (grams)" name="weightGrams" type="number" min="0" defaultValue={variant.weightGrams ?? ""} />
            <div className="flex items-end"><Check label="Purchasable" name="active" defaultChecked={variant.active} /></div>
            <div className="flex items-end"><Check label="Track inventory" name="trackInventory" defaultChecked={variant.trackInventory} /></div>
            <div className="sm:col-span-3 flex justify-end"><button className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white">Save variant · {formatMoneyInput(variant.priceRappen)}</button></div>
          </form>
          <div className="mt-5 flex justify-end border-t border-destructive/20 pt-4"><DeleteVariantDialog id={variant.id} productId={product.id} /></div>
        </Card>
      ))}
    </section>
  );
}
