import { saveRetailProduct } from "@/app/admin/(protected)/retail-actions";
import { Check, Field, SaveBar, SelectField } from "@/components/admin/admin-ui";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { SlugField } from "@/components/admin/slug-field";
import type { RetailCategoryOption, RetailProductEdit } from "@/components/admin/retail-product-types";
import { Card } from "@/components/ui/card";

export function RetailProductBasics({ categories, product }: { categories: RetailCategoryOption[]; product?: RetailProductEdit }) {
  return (
    <form action={saveRetailProduct} className="space-y-5">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <SelectField label="Category" name="categoryId" defaultValue={product?.categoryId}>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.parent ? `${category.parent.nameEn} / ` : ""}{category.nameEn}</option>)}
        </SelectField>
        <SlugField defaultValue={product?.slug} />
        <Field label="English name" name="nameEn" defaultValue={product?.nameEn} required />
        <Field label="German name" name="nameDe" defaultValue={product?.nameDe} />
        <RichTextEditor label="English description" name="descriptionEn" defaultValue={product?.descriptionEn} />
        <div className="sm:col-span-2"><ImageUploadField initialKey={product?.imageKey ?? ""} initialUrl={product?.imageUrl} /></div>
        <RichTextEditor label="German description" name="descriptionDe" defaultValue={product?.descriptionDe} />
        <SelectField label="Publication state" name="status" defaultValue={product?.status ?? "DRAFT"}>
          <option value="DRAFT">Draft</option><option value="ACTIVE">Active</option>
        </SelectField>
        <Check label="Featured product" name="featured" defaultChecked={product?.featured} />
        <Field label="Tags (comma separated)" name="tags" defaultValue={product?.tags.map(({ name }) => name).join(", ") ?? ""} />
      </Card>
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-display text-lg font-bold sm:col-span-2">Search metadata</h2>
        <Field label="English SEO title" name="seoTitleEn" defaultValue={product?.seoTitleEn ?? ""} />
        <Field label="German SEO title" name="seoTitleDe" defaultValue={product?.seoTitleDe ?? ""} />
        <Field label="English SEO description" name="seoDescriptionEn" defaultValue={product?.seoDescriptionEn ?? ""} />
        <Field label="German SEO description" name="seoDescriptionDe" defaultValue={product?.seoDescriptionDe ?? ""} />
      </Card>
      <SaveBar returnTo={product ? `/admin/products/${product.id}` : "/admin/products/new"} label={product ? "Save product" : "Create product"} />
    </form>
  );
}
