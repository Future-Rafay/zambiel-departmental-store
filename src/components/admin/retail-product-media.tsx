
import { addRetailMedia, updateRetailMedia } from "@/app/admin/(protected)/retail-actions";
import { Check, Field, SelectField } from "@/components/admin/admin-ui";
import { DeferredSubmitButton, DeferredUploadForm } from "@/components/admin/deferred-upload-form";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { RetailMediaDelete } from "@/components/admin/retail-media-delete";
import { StorefrontImage } from "@/components/site/storefront-image";
import type { RetailProductEdit } from "@/components/admin/retail-product-types";
import { Card } from "@/components/ui/card";

export function RetailProductMedia({ product }: { product: RetailProductEdit }) {
  return (
    <section className="mt-8 space-y-4" aria-labelledby="media">
      <h2 id="media" className="font-display text-xl font-bold">Product gallery</h2>
      <Card className="p-5">
        <DeferredUploadForm action={addRetailMedia} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="productId" value={product.id} />
          <div className="sm:col-span-2"><ImageUploadField name="mediaKey" label="New gallery image" required /></div>
          <Field label="English alt text" name="altEn" />
          <Field label="German alt text" name="altDe" />
          <Field label="Position" name="sortOrder" type="number" min="0" defaultValue={product.media.length} required />
          <SelectField label="Variant (optional)" name="variantId"><option value="">All variants</option>{product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.nameEn}</option>)}</SelectField>
          <div className="sm:col-span-2 flex justify-end"><DeferredSubmitButton className="min-h-11 rounded-control bg-primary px-5 text-sm font-bold text-white">Add image</DeferredSubmitButton></div>
        </DeferredUploadForm>
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {product.media.map((media) => (
          <Card key={media.id} className="min-w-0 space-y-2 p-3 has-[details[open]]:col-span-2 lg:has-[details[open]]:col-span-1">
            <div className="relative aspect-square overflow-hidden rounded-control bg-background"><StorefrontImage src={media.imageUrl ?? null} alt={media.altEn ?? ""} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" /></div>
            <details><summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-primary">Edit image</summary><form action={updateRetailMedia} className="mt-2 grid gap-3">
              <input type="hidden" name="id" value={media.id} /><input type="hidden" name="productId" value={product.id} />
              <Field label="English alt text" name="altEn" defaultValue={media.altEn ?? ""} /><Field label="German alt text" name="altDe" defaultValue={media.altDe ?? ""} />
              <Field label="Position" name="sortOrder" type="number" min="0" defaultValue={media.sortOrder} required />
              <SelectField label="Variant" name="variantId" defaultValue={media.variantId ?? ""}><option value="">All variants</option>{product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.nameEn}</option>)}</SelectField>
              <Check label="Primary product image" name="primary" /><button className="min-h-11 rounded-control border border-primary px-4 text-sm font-bold text-primary">Save image details</button>
            </form>
            <div className="mt-3 flex justify-end border-t pt-3"><RetailMediaDelete id={media.id} productId={product.id} /></div></details>
          </Card>
        ))}
      </div>
    </section>
  );
}
