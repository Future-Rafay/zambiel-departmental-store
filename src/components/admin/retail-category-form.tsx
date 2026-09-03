import { saveRetailCategory } from "@/app/admin/(protected)/retail-actions";
import {
  AdminPage,
  Check,
  Field,
  Notice,
  SaveBar,
  SelectField,
  TextareaField,
} from "@/components/admin/admin-ui";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { SlugField } from "@/components/admin/slug-field";
import { Card } from "@/components/ui/card";
import { DeleteCategoryDialog } from "@/components/admin/danger-actions";

type Category = {
  id: string;
  nameEn: string;
  nameDe: string;
  slug: string;
  parentId: string | null;
  descriptionEn: string | null;
  descriptionDe: string | null;
  imageKey: string | null;
  imageUrl?: string | null;
  seoTitleEn: string | null;
  seoTitleDe: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionDe: string | null;
  active: boolean;
};

export function RetailCategoryForm({
  categories,
  category,
  feedback,
}: {
  categories: Array<{ id: string; nameEn: string }>;
  category?: Category;
  feedback?: { saved?: string; error?: string; deleted?: string };
}) {
  return (
    <AdminPage
      title={category?.nameEn ?? "New category"}
      description="Hierarchy, localized content, media, and SEO."
    >
      <Notice {...feedback} />
      <form action={saveRetailCategory} className="space-y-5">
        <input type="hidden" name="id" value={category?.id ?? ""} />
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <Field
            label="English name"
            name="nameEn"
            defaultValue={category?.nameEn}
            required
          />
          <Field
            label="German name"
            name="nameDe"
            defaultValue={category?.nameDe}
          />
          <SlugField defaultValue={category?.slug} />
          <SelectField
            label="Parent category"
            name="parentId"
            defaultValue={category?.parentId ?? ""}
          >
            <option value="">Top level</option>
            {categories
              .filter((item) => item.id !== category?.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nameEn}
                </option>
              ))}
          </SelectField>
          <div className="sm:col-span-2">
            <TextareaField
              label="English description"
              name="descriptionEn"
              defaultValue={category?.descriptionEn}
            />
          </div>
          <div className="sm:col-span-2">
            <TextareaField
              label="German description"
              name="descriptionDe"
              defaultValue={category?.descriptionDe}
            />
          </div>
          <div className="sm:col-span-2">
            <ImageUploadField
              label="Category image"
              initialKey={category?.imageKey ?? ""}
              initialUrl={category?.imageUrl}
            />
          </div>
          <Field
            label="English SEO title"
            name="seoTitleEn"
            defaultValue={category?.seoTitleEn ?? ""}
          />
          <Field
            label="German SEO title"
            name="seoTitleDe"
            defaultValue={category?.seoTitleDe ?? ""}
          />
          <Field
            label="English SEO description"
            name="seoDescriptionEn"
            defaultValue={category?.seoDescriptionEn ?? ""}
          />
          <Field
            label="German SEO description"
            name="seoDescriptionDe"
            defaultValue={category?.seoDescriptionDe ?? ""}
          />
          <Check
            label="Visible in storefront"
            name="active"
            defaultChecked={category?.active}
          />
        </Card>
        <SaveBar
          returnTo={
            category
              ? `/admin/categories/${category.id}`
              : "/admin/categories/new"
          }
          label={category ? "Save category" : "Create category"}
        />
      </form>
      {category ? <section className="mt-10 border-t border-destructive/20 pt-6"><h2 className="font-display text-lg font-bold text-destructive">Delete category</h2><p className="mb-4 text-sm text-muted">Active products and child categories must be moved or deleted first.</p><div className="flex justify-end"><DeleteCategoryDialog id={category.id} /></div></section> : null}
    </AdminPage>
  );
}
