import { adjustInventory } from "@/app/admin/(protected)/retail-actions";
import { AdminPage, Empty, Field, Notice } from "@/components/admin/admin-ui";
import { prisma } from "@/server/db";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; q?: string; low?: string }>;
}) {
  const filters = await searchParams;
  const variants = await prisma.productVariant.findMany({
    where: {
      trackInventory: true,
      product: { status: { not: "ARCHIVED" } },
      ...(filters.q
        ? {
            OR: [
              { sku: { contains: filters.q } },
              { product: { nameEn: { contains: filters.q } } },
            ],
          }
        : {}),
    },
    include: {
      product: { select: { nameEn: true } },
      inventoryMovements: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: [{ product: { nameEn: "asc" } }, { sortOrder: "asc" }],
    take: 500,
  });
  const visible = filters.low
    ? variants.filter(
        (variant) =>
          variant.stockOnHand - variant.stockReserved <=
          (variant.lowStockThreshold ?? 5),
      )
    : variants;
  return (
    <AdminPage
      title="Inventory"
      description="Variant stock, low-stock visibility, and audited manual adjustments."
    >
      <Notice saved={filters.saved} />
      <form className="mb-5 flex gap-3">
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Product or SKU"
          className="min-h-11 flex-1 rounded-lg border bg-white px-3"
        />
        <label className="flex min-h-11 items-center gap-2 rounded-lg border bg-white px-3">
          <input
            type="checkbox"
            name="low"
            value="1"
            defaultChecked={!!filters.low}
          />{" "}
          Low stock
        </label>
        <button className="rounded-lg border bg-white px-5 font-bold">
          Filter
        </button>
      </form>
      {visible.length === 0 ? (
        <Empty>No inventory rows match this view.</Empty>
      ) : (
        <div className="space-y-3">
          {visible.map((variant) => {
            const available = variant.stockOnHand - variant.stockReserved;
            return (
              <details
                key={variant.id}
                className="rounded-xl border bg-white p-4"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span>
                    <strong>{variant.product.nameEn}</strong>
                    <span className="ml-2 text-xs text-muted">
                      {variant.sku ?? "No SKU"}
                    </span>
                  </span>
                  <span
                    className={`font-bold ${available <= (variant.lowStockThreshold ?? 5) ? "text-destructive" : "text-primary"}`}
                  >
                    {available} available{" "}
                    <span className="font-normal text-muted">
                      ({variant.stockReserved} reserved)
                    </span>
                  </span>
                </summary>
                <div className="mt-5 grid gap-5 border-t pt-5 lg:grid-cols-2">
                  <form action={adjustInventory} className="space-y-3">
                    <input type="hidden" name="variantId" value={variant.id} />
                    <Field
                      label="Quantity change (use negative to remove)"
                      name="quantityChange"
                      type="number"
                      required
                    />
                    <Field
                      label="Reason"
                      name="reason"
                      minLength={3}
                      maxLength={500}
                      required
                    />
                    <button className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-white">
                      Record adjustment
                    </button>
                  </form>
                  <div>
                    <h3 className="mb-2 text-sm font-bold">Recent movements</h3>
                    {variant.inventoryMovements.length ? (
                      <ul className="space-y-2 text-xs">
                        {variant.inventoryMovements.map((movement) => (
                          <li key={movement.id}>
                            {movement.quantityChange > 0 ? "+" : ""}
                            {movement.quantityChange} ·{" "}
                            {movement.type.replaceAll("_", " ")} ·{" "}
                            {movement.reason}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted">No movements yet.</p>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
