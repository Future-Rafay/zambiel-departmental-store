import Link from "next/link";

import { AdminPage, Empty } from "@/components/admin/admin-ui";
import { formatMoney, formatOrderNumber } from "@/lib/orders";
import { prisma } from "@/server/db";

const pageSize = 50;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number((await searchParams).page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;
  const [total, payments] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.findMany({
      include: {
        order: {
          select: { id: true, customerName: true, paymentMethod: true },
        },
        refunds: { select: { amountRappen: true, status: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminPage
      title="Payments"
      description="Stripe, COD, cash-at-pickup, and refund state."
    >
      {payments.length === 0 ? (
        <Empty>No payments found on this page.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-[#F6F6F7] text-xs uppercase text-muted">
              <tr>
                <th className="p-4">Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Method</th>
                <th className="p-4">Status</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Refunded</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((payment) => {
                const orderNumber = formatOrderNumber(payment.order.id);
                const refunded = payment.refunds
                  .filter((refund) => refund.status === "SUCCEEDED")
                  .reduce((sum, refund) => sum + refund.amountRappen, 0);
                return (
                  <tr key={payment.id}>
                    <td className="p-4">
                      <Link
                        href={`/admin/orders/${orderNumber}`}
                        className="font-bold text-primary"
                      >
                        {orderNumber}
                      </Link>
                    </td>
                    <td className="p-4">{payment.order.customerName}</td>
                    <td className="p-4">
                      {payment.order.paymentMethod.replaceAll("_", " ")}
                    </td>
                    <td className="p-4">{payment.status}</td>
                    <td className="p-4">
                      {formatMoney(payment.amountRappen, "en")}
                    </td>
                    <td className="p-4">{formatMoney(refunded, "en")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pageCount > 1 ? (
        <nav
          aria-label="Payment pages"
          className="mt-5 flex items-center justify-end gap-3"
        >
          <Link
            href={`/admin/payments?page=${Math.max(1, page - 1)}`}
            aria-disabled={page === 1}
            className={`inline-flex min-h-11 items-center rounded-lg border px-4 font-bold ${page === 1 ? "pointer-events-none opacity-40" : "bg-white hover:border-primary"}`}
          >
            Previous
          </Link>
          <span className="text-sm font-bold">
            {page} / {pageCount}
          </span>
          <Link
            href={`/admin/payments?page=${Math.min(pageCount, page + 1)}`}
            aria-disabled={page >= pageCount}
            className={`inline-flex min-h-11 items-center rounded-lg border px-4 font-bold ${page >= pageCount ? "pointer-events-none opacity-40" : "bg-white hover:border-primary"}`}
          >
            Next
          </Link>
        </nav>
      ) : null}
    </AdminPage>
  );
}
