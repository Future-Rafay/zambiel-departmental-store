import { AdminQueue } from "@/components/admin/admin-queue";
import { getAdminOrders } from "@/server/services/ordering";

export const metadata = { title: "Order queue" };

export default async function LiveQueuePage() {
  return <AdminQueue orders={await getAdminOrders()} />;
}
