import { AdminPage, Empty } from "@/components/admin/admin-ui";
import { getAuditLogs } from "@/server/services/admin";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  const logs = await getAuditLogs();
  return <AdminPage title="Audit log" description="The latest 250 operational and owner changes.">{logs.length === 0 ? <Empty>No audit events yet.</Empty> : <div className="relative overflow-x-auto rounded-[var(--radius-card)] border bg-surface"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b bg-background"><tr><th className="p-4">Time</th><th className="p-4">Actor</th><th className="p-4">Action</th><th className="p-4">Entity</th><th className="p-4">Details</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-b last:border-0"><td className="p-4">{log.createdAt.toLocaleString("en-CH", { timeZone: "Europe/Zurich" })}</td><td className="p-4">{log.actor?.name || log.actor?.email || "System"}</td><td className="p-4 font-semibold">{log.action.replaceAll("_", " ")}</td><td className="p-4">{log.entityType} · {log.entityId}</td><td className="max-w-sm p-4 text-xs text-muted">{log.metadata ? JSON.stringify(log.metadata) : "—"}</td></tr>)}</tbody></table></div>}</AdminPage>;
}
