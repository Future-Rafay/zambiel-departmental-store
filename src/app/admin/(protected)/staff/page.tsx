import { adminAction } from "@/app/admin/(protected)/actions";
import { AdminFormDialog } from "@/components/admin/admin-form-dialog";
import { AdminPage, Empty, Field, Notice, SaveBar } from "@/components/admin/admin-ui";
import { StaffToggle } from "@/components/admin/staff-toggle";
import { Card } from "@/components/ui/card";
import { getStaffAdminData } from "@/server/services/admin";

export const metadata = { title: "Staff" };

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; warning?: string }> }) {
  const [{ staff, invitations }, feedback] = await Promise.all([getStaffAdminData(), searchParams]);
  const returnTo = "/admin/staff";
  return <AdminPage title="Staff" description="Manage staff access and expiring invitations." actions={<AdminFormDialog trigger="Invite staff" title="Invite staff member" description="The account is saved even if email delivery is unavailable." variant="primary"><form action={adminAction} className="space-y-4"><input type="hidden" name="intent" value="invite_staff" /><Field label="Email" name="email" type="email" autoComplete="email" required /><SaveBar returnTo={returnTo} label="Send invitation" /></form></AdminFormDialog>}><Notice {...feedback} /><section aria-labelledby="staff-list"><h2 id="staff-list" className="mb-3 font-display text-xl font-semibold">Staff accounts</h2>{staff.length === 0 ? <Empty>No staff accounts yet.</Empty> : <Card className="overflow-hidden p-0"><ul className="divide-y divide-border">{staff.map((member) => <li key={member.id} className="flex min-h-16 items-center gap-4 px-4 py-3"><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{member.name || member.email}</h3><p className="truncate text-sm text-muted">{member.email}</p></div><span className={`text-sm font-semibold ${member.active ? "text-success" : "text-destructive"}`}>{member.active ? "Active" : "Deactivated"}</span><StaffToggle id={member.id} active={member.active} returnTo={returnTo} /></li>)}</ul></Card>}</section><section className="mt-7" aria-labelledby="pending-invitations"><h2 id="pending-invitations" className="mb-3 font-display text-xl font-semibold">Pending invitations</h2>{invitations.length === 0 ? <Empty>No pending invitations.</Empty> : <Card className="overflow-hidden p-0"><ul className="divide-y divide-border">{invitations.map((invite) => <li key={invite.id} className="flex min-h-14 items-center justify-between gap-4 px-4 py-3"><strong className="truncate text-sm">{invite.email}</strong><span className="text-sm text-muted">Expires {invite.expiresAt.toLocaleString("en-CH", { timeZone: "Europe/Zurich" })}</span></li>)}</ul></Card>}</section></AdminPage>;
}
