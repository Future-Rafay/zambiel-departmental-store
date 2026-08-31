import Image from "next/image";
import {
  addRetailMedia,
  generateVariantMatrix,
  saveRetailProduct,
  saveRetailVariant,
  updateRetailMedia,
} from "@/app/admin/(protected)/retail-actions";
import { ArchiveProductDialog, ArchiveVariantDialog } from "@/components/admin/danger-actions";
import {
  AdminPage,
  Check,
  Field,
  Notice,
  SaveBar,
  SelectField,
  TextareaField,
} from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { RetailMediaDelete } from "@/components/admin/retail-media-delete";
import { formatMoneyInput } from "@/lib/orders";

type Category = {
  id: string;
  nameEn: string;
  parent?: { nameEn: string } | null;
};
type Variant = {
  id: string;
  nameEn: string;
  nameDe: string;
  sku: string | null;
  barcode: string | null;
  weightGrams: number | null;
  priceRappen: number;
  compareAtPriceRappen: number | null;
  stockOnHand: number;
  stockReserved: number;
  lowStockThreshold: number | null;
  active: boolean;
  trackInventory: boolean;
  optionValues: Array<{
    optionValue: { value: string; option: { name: string } };
  }>;
};
type Product = {
  id: string;
  categoryId: string;
  slug: string;
  nameEn: string;
  nameDe: string;
  descriptionEn: string | null;
  descriptionDe: string | null;
  imageKey: string | null;
  imageUrl?: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  featured: boolean;
  seoTitleEn: string | null;
  seoTitleDe: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionDe: string | null;
  variants: Variant[];
  tags: Array<{ name: string }>;
  media: Array<{
    id: string;
    imageUrl: string | null;
    altEn: string | null;
    altDe: string | null;
    sortOrder: number;
    variantId: string | null;
  }>;
};

export function RetailProductForm({
  categories,
  product,
  feedback,
}: {
  categories: Category[];
  product?: Product;
  feedback?: { saved?: string; error?: string };
}) {
  const returnTo = product
    ? `/admin/products/${product.id}`
    : "/admin/products/new";
  return (
    <AdminPage
      title={product?.nameEn ?? "New product"}
      description="Bilingual catalog, publication, pricing, stock, and SEO."
    >
      <Notice {...feedback} />
      <form action={saveRetailProduct} className="space-y-5">
        <input type="hidden" name="id" value={product?.id ?? ""} />
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <SelectField
            label="Category"
            name="categoryId"
            defaultValue={product?.categoryId}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.parent ? `${category.parent.nameEn} / ` : ""}
                {category.nameEn}
              </option>
            ))}
          </SelectField>
          <Field
            label="SEO slug"
            name="slug"
            defaultValue={product?.slug}
            required
          />
          <Field
            label="English name"
            name="nameEn"
            defaultValue={product?.nameEn}
            required
          />
          <Field
            label="German name"
            name="nameDe"
            defaultValue={product?.nameDe}
          />
          <div className="sm:col-span-2">
            <TextareaField
              label="English description"
              name="descriptionEn"
              rows={8}
              defaultValue={product?.descriptionEn}
            />
          </div>
          <div className="sm:col-span-2">
            <ImageUploadField
              initialKey={product?.imageKey ?? ""}
              initialUrl={product?.imageUrl}
            />
          </div>
          <div className="sm:col-span-2">
            <TextareaField
              label="German description"
              name="descriptionDe"
              rows={8}
              defaultValue={product?.descriptionDe}
            />
          </div>
          <SelectField
            label="Publication state"
            name="status"
            defaultValue={product?.status ?? "DRAFT"}
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </SelectField>
          <Check
            label="Featured product"
            name="featured"
            defaultChecked={product?.featured}
          />
          <Field label="Tags (comma separated)" name="tags" defaultValue={product?.tags.map(({ name }) => name).join(", ") ?? ""} />
        </Card>
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-display text-lg font-bold sm:col-span-2">
            Search metadata
          </h2>
          <Field
            label="English SEO title"
            name="seoTitleEn"
            defaultValue={product?.seoTitleEn ?? ""}
          />
          <Field
            label="German SEO title"
            name="seoTitleDe"
            defaultValue={product?.seoTitleDe ?? ""}
          />
          <Field
            label="English SEO description"
            name="seoDescriptionEn"
            defaultValue={product?.seoDescriptionEn ?? ""}
          />
          <Field
            label="German SEO description"
            name="seoDescriptionDe"
            defaultValue={product?.seoDescriptionDe ?? ""}
          />
        </Card>
        <SaveBar
          returnTo={returnTo}
          label={product ? "Save product" : "Create product"}
        />
      </form>
      {product && (
        <section className="mt-8 space-y-4" aria-labelledby="media">
          <h2 id="media" className="font-display text-xl font-bold">
            Product gallery
          </h2>
          <Card className="p-5">
            <form action={addRetailMedia} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="productId" value={product.id} />
              <div className="sm:col-span-2">
                <ImageUploadField name="mediaKey" label="New gallery image" />
              </div>
              <Field label="English alt text" name="altEn" />
              <Field label="German alt text" name="altDe" />
              <Field
                label="Position"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue={product.media.length}
                required
              />
              <SelectField label="Variant (optional)" name="variantId">
                <option value="">All variants</option>
                {product.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.nameEn}
                  </option>
                ))}
              </SelectField>
              <div className="sm:col-span-2 flex justify-end">
                <button className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white">
                  Add image
                </button>
              </div>
            </form>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {product.media.map((media) => (
              <Card key={media.id} className="space-y-3 p-3">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-background">
                  <Image
                    src={media.imageUrl ?? "/images/product-placeholder.svg"}
                    alt={media.altEn ?? ""}
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <form action={updateRetailMedia} className="grid gap-3"><input type="hidden" name="id" value={media.id} /><input type="hidden" name="productId" value={product.id} /><Field label="English alt text" name="altEn" defaultValue={media.altEn ?? ""} /><Field label="German alt text" name="altDe" defaultValue={media.altDe ?? ""} /><Field label="Position" name="sortOrder" type="number" min="0" defaultValue={media.sortOrder} required /><SelectField label="Variant" name="variantId" defaultValue={media.variantId ?? ""}><option value="">All variants</option>{product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.nameEn}</option>)}</SelectField><Check label="Primary product image" name="primary" /><button className="min-h-11 rounded-lg border border-primary px-4 text-sm font-bold text-primary">Save image details</button></form>
                <div className="flex justify-end border-t pt-3">
                  <RetailMediaDelete id={media.id} productId={product.id} />
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
      {product && (
        <section className="mt-8 space-y-4" aria-labelledby="variants">
          <h2 id="variants" className="font-display text-xl font-bold">
            Variants and inventory
          </h2>
          <Card className="p-5">
            <h3 className="mb-1 font-bold">Generate missing variants</h3>
            <p className="mb-4 text-sm text-muted">
              Define arbitrary options, one per line, for example Color: Black, White and Storage: 128 GB, 256 GB. Existing variants are preserved.
            </p>
            <form
              action={generateVariantMatrix}
              className="grid gap-4 sm:grid-cols-3"
            >
              <input type="hidden" name="productId" value={product.id} />
              <Field
                label="Price (rappen)"
                name="priceRappen"
                type="number"
                min="0"
                required
              />
              <div className="sm:col-span-2">
                <TextareaField
                  label="Options (Name: value, value)"
                  name="options"
                  rows={3}
                  required
                />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <button className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white">
                  Generate missing combinations
                </button>
              </div>
            </form>
          </Card>
          {product.variants.map((variant) => (
            <Card key={variant.id} className="p-5">
              <div className="mb-4">
                <h3 className="font-bold">{variant.nameEn}</h3>
                <p className="text-xs text-muted">
                  {variant.optionValues
                    .map(
                      ({ optionValue }) =>
                        `${optionValue.option.name}: ${optionValue.value}`,
                    )
                    .join(" · ") || "Default variant"}{" "}
                  · {variant.stockOnHand - variant.stockReserved} available
                </p>
              </div>
              <form
                action={saveRetailVariant}
                className="grid gap-4 sm:grid-cols-3"
              >
                <input type="hidden" name="id" value={variant.id} />
                <input type="hidden" name="productId" value={product.id} />
                <Field label="English variant name" name="nameEn" defaultValue={variant.nameEn} required />
                <Field label="German variant name" name="nameDe" defaultValue={variant.nameDe} />
                <Field
                  label="SKU"
                  name="sku"
                  defaultValue={variant.sku ?? ""}
                />
                <Field
                  label="Barcode"
                  name="barcode"
                  defaultValue={variant.barcode ?? ""}
                />
                <Field
                  label="Price (rappen)"
                  name="priceRappen"
                  type="number"
                  min="0"
                  defaultValue={variant.priceRappen}
                  required
                />
                <Field
                  label="Compare-at (rappen)"
                  name="compareAtPriceRappen"
                  type="number"
                  min="0"
                  defaultValue={variant.compareAtPriceRappen ?? ""}
                />
                <Field
                  label="Low-stock threshold"
                  name="lowStockThreshold"
                  type="number"
                  min="0"
                  defaultValue={variant.lowStockThreshold ?? 5}
                  required
                />
                <Field label="Weight (grams)" name="weightGrams" type="number" min="0" defaultValue={variant.weightGrams ?? ""} />
                <div className="flex items-end">
                  <Check
                    label="Purchasable"
                    name="active"
                    defaultChecked={variant.active}
                  />
                </div>
                <div className="flex items-end"><Check label="Track inventory" name="trackInventory" defaultChecked={variant.trackInventory} /></div>
                <div className="sm:col-span-3 flex justify-end">
                  <button className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white">
                    Save variant · {formatMoneyInput(variant.priceRappen)}
                  </button>
                </div>
              </form>
              <div className="mt-5 flex justify-end border-t border-destructive/20 pt-4"><ArchiveVariantDialog id={variant.id} productId={product.id} /></div>
            </Card>
          ))}
        </section>
      )}
      {product && product.status !== "ARCHIVED" && (
        <section className="mt-10 border-t border-destructive/20 pt-6">
          <h2 className="font-display text-lg font-bold text-destructive">
            Archive product
          </h2>
          <p className="mb-4 text-sm text-muted">
            Archived products remain in order history and leave the storefront.
          </p>
          <div className="flex justify-end">
            <ArchiveProductDialog id={product.id} />
          </div>
        </section>
      )}
    </AdminPage>
  );
}
