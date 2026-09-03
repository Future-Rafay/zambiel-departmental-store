import { AdminPage, Notice } from "@/components/admin/admin-ui";
import { ArchiveProductDialog } from "@/components/admin/danger-actions";
import { RetailProductBasics } from "@/components/admin/retail-product-basics";
import { RetailProductMedia } from "@/components/admin/retail-product-media";
import type { RetailCategoryOption, RetailProductEdit } from "@/components/admin/retail-product-types";
import { RetailProductVariants } from "@/components/admin/retail-product-variants";

export function RetailProductForm({ categories, product, feedback }: {
  categories: RetailCategoryOption[];
  product?: RetailProductEdit;
  feedback?: { saved?: string; error?: string };
}) {
  return (
    <AdminPage title={product?.nameEn ?? "New product"} description="Bilingual catalog, publication, pricing, stock, and SEO.">
      <Notice {...feedback} />
      <RetailProductBasics categories={categories} product={product} />
      {product ? <RetailProductMedia product={product} /> : null}
      {product ? <RetailProductVariants product={product} /> : null}
      {product && product.status !== "ARCHIVED" ? (
        <section className="mt-10 border-t border-destructive/20 pt-6">
          <h2 className="font-display text-lg font-bold text-destructive">Archive product</h2>
          <p className="mb-4 text-sm text-muted">Archived products remain in order history and leave the storefront.</p>
          <div className="flex justify-end"><ArchiveProductDialog id={product.id} /></div>
        </section>
      ) : null}
    </AdminPage>
  );
}
