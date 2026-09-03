import { AdminPage, Notice } from "@/components/admin/admin-ui";
import { OrderHistory, OrderStatusFilters, parseOrderStatus } from "@/components/admin/order-history";
import { getOrderHistory } from "@/server/services/admin";

export default async function OrdersPage({ searchParams }: {
  searchParams: Promise<{ status?: string; saved?: string; error?: string }>;
}) {
  const query = await searchParams;
  const activeStatus = parseOrderStatus(query.status);
  const orders = await getOrderHistory(activeStatus === "ALL" ? undefined : activeStatus);
  return (
    <AdminPage title="Order History" description="The latest 200 orders, including completed and cancelled.">
      <Notice {...query} />
      <OrderStatusFilters activeStatus={activeStatus} />
      <OrderHistory orders={orders} />
    </AdminPage>
  );
}
